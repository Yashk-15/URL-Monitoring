import { useState, useCallback, useEffect, useRef } from 'react'
import { apiClient, extractArray, normaliseURL } from '@/lib/api-client'
import { toast } from 'sonner'

/**
 * Shared hook for fetching, refreshing, and optimistically updating URL monitor data.
 *
 * Key fix: when a URL is newly added, we track its local ping result in a ref
 * so the smart-merge re-fetch never overwrites a good "Up" result with a stale
 * "Down" or "Unknown" that DynamoDB hasn't caught up with yet.
 */
export function useURLData({ autoRefresh = false } = {}) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const bgTimerRef = useRef(null)

    // Map of id → local ping result. Survives the 8s re-fetch window so the
    // smart merge can preserve real health data even when the server still
    // says "Unknown" or "Down".
    const localPingResultsRef = useRef({})

    const fetchURLs = useCallback(async (isManual = false) => {
        if (isManual) setIsRefreshing(true)
        else setLoading(true)
        try {
            setError(null)
            const response = await apiClient.get('/urls')

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`)
            }

            const result = await response.json()
            const rawData = extractArray(result)
            const transformedData = rawData.map(normaliseURL)

            // On every fetch, if we have a locally-pinged result for a URL and
            // the server still reports Unknown/Down, keep our local data so the
            // row never flickers back to a bad state.
            setData((prev) => {
                const localPings = localPingResultsRef.current
                return transformedData.map((serverItem) => {
                    const localPing = localPings[serverItem.id]
                    if (
                        localPing &&
                        (serverItem.status === 'Unknown' || serverItem.status === 'Down')
                    ) {
                        return { ...serverItem, ...localPing }
                    }
                    // Server has a real status now — we can drop the local override
                    if (localPing && serverItem.status !== 'Unknown') {
                        delete localPings[serverItem.id]
                    }
                    return serverItem
                })
            })

            setLastUpdated(new Date())

            if (isManual) {
                const activeCount = transformedData.filter(u => u.enabled !== false).length
                const pausedCount = transformedData.length - activeCount
                const msg = pausedCount > 0
                    ? `Refreshed ${activeCount} active monitor${activeCount !== 1 ? 's' : ''} (${pausedCount} paused)`
                    : `Refreshed ${activeCount} monitor${activeCount !== 1 ? 's' : ''}`
                toast.success(msg, { id: 'refresh-toast' })
            }
        } catch (err) {
            console.error('Error fetching URLs:', err)
            setError(err.message)
            setData([])
            if (isManual) {
                toast.error('Failed to refresh data')
            }
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    /**
     * Optimistic insert + immediate ping:
     *
     * Fix summary vs original:
     *  1. Row starts as "Checking" (not "Unknown") so the UI shows a spinner
     *     instead of a misleading blank/Down badge.
     *  2. Ping result is stored in localPingResultsRef so every subsequent
     *     fetchURLs call (manual refresh, auto-refresh, the 8s smart-merge)
     *     preserves the real health data instead of overwriting with stale DDB.
     *  3. Error path removes the orphan row from state so a failed POST doesn't
     *     leave a ghost entry that never clears.
     *  4. Smart-merge now checks localPingResultsRef for ALL ids, not just
     *     the one just added, so rapid back-to-back adds all survive the merge.
     */
    const handleURLAdded = useCallback((newPayload) => {
        if (!newPayload) return

        // Step 1 — optimistic insert with "Checking" status (shows spinner badge)
        const optimisticRow = normaliseURL({ ...newPayload, status: 'Checking' })
        setData((prev) => [...prev, optimisticRow])

        if (bgTimerRef.current) clearTimeout(bgTimerRef.current)

        // Step 2 — immediate server-side ping
        fetch('/api/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: newPayload.url,
                timeoutSeconds: newPayload.timeoutSeconds || 10,
            }),
        })
            .then((r) => r.json())
            .then((ping) => {
                const status = ping.isUp
                    ? (ping.latencyMs > (newPayload.maxLatencyMs || 3000) ? 'Warning' : 'Up')
                    : 'Down'

                // Build the full local health patch
                const healthPatch = {
                    status,
                    responseTime: String(ping.latencyMs ?? 0),
                    statusCode: ping.statusCode,
                    errorMsg: ping.errorMsg,
                    isUp: ping.isUp,
                    isSlow: status === 'Warning',
                    lastCheck: new Date().toLocaleString(),
                    uptime: ping.isUp ? '100' : '0',
                }

                // Store in ref so subsequent fetches can preserve it
                localPingResultsRef.current[optimisticRow.id] = healthPatch

                // Step 3 — patch the row immediately in state
                setData((prev) =>
                    prev.map((row) =>
                        row.id === optimisticRow.id
                            ? { ...row, ...healthPatch }
                            : row
                    )
                )
            })
            .catch(() => {
                // Ping failed — mark as Unknown so at least the badge is honest
                setData((prev) =>
                    prev.map((row) =>
                        row.id === optimisticRow.id
                            ? { ...row, status: 'Unknown' }
                            : row
                    )
                )
            })

        // Step 4 — background POST to persist in DynamoDB
        apiClient.post('/urls', newPayload).then(async (response) => {
            if (!response.ok) {
                const body = await response.text().catch(() => '')
                console.error(`[handleURLAdded] POST failed ${response.status}: ${body}`)

                // Remove the orphan row — save failed, don't leave ghost entries
                setData((prev) => prev.filter((row) => row.id !== optimisticRow.id))
                delete localPingResultsRef.current[optimisticRow.id]

                toast.error(
                    `Failed to save "${newPayload.name}" — it was not persisted. ${body}`,
                    { duration: 8000 }
                )
            }
        }).catch((err) => {
            console.error('[handleURLAdded] POST error:', err)
            setData((prev) => prev.filter((row) => row.id !== optimisticRow.id))
            delete localPingResultsRef.current[optimisticRow.id]
            toast.error(
                `Failed to save "${newPayload.name}" — ${err.message || 'network error'}`,
                { duration: 8000 }
            )
        })

        // Step 5 — smart-merge re-fetch after 8s
        // Now uses localPingResultsRef for ALL locally-pinged URLs, not just
        // the one we just added.
        bgTimerRef.current = setTimeout(async () => {
            try {
                const res = await apiClient.get('/urls')
                if (!res.ok) return
                const serverList = extractArray(await res.json()).map(normaliseURL)
                const serverIds = new Set(serverList.map((u) => u.id))
                const localPings = localPingResultsRef.current

                setData((prev) => {
                    const localOnly = prev.filter((p) => !serverIds.has(p.id))

                    const merged = serverList.map((serverItem) => {
                        const localPing = localPings[serverItem.id]

                        if (localPing && (serverItem.status === 'Unknown' || serverItem.status === 'Down')) {
                            // Server hasn't caught up — keep our real ping data
                            return { ...serverItem, ...localPing }
                        }

                        // Server has a definitive status — drop the local override
                        if (localPing && serverItem.status !== 'Unknown') {
                            delete localPings[serverItem.id]
                        }

                        return serverItem
                    })

                    return [...merged, ...localOnly]
                })

                setLastUpdated(new Date())
            } catch { /* ignore */ }
            bgTimerRef.current = null
        }, 8000)
    }, [])

    useEffect(() => {
        fetchURLs()
    }, [fetchURLs])

    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => fetchURLs(false), 30000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchURLs])

    useEffect(() => {
        return () => {
            if (bgTimerRef.current) clearTimeout(bgTimerRef.current)
        }
    }, [])

    const handleManualRefresh = useCallback(() => fetchURLs(true), [fetchURLs])

    return {
        data,
        loading,
        error,
        lastUpdated,
        isRefreshing,
        fetchURLs,
        handleURLAdded,
        handleManualRefresh,
    }
}