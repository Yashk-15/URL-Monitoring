import { useState, useCallback, useEffect, useRef } from 'react'
import { apiClient, extractArray, normaliseURL } from '@/lib/api-client'
import { toast } from 'sonner'

/**
 * Shared hook for fetching, refreshing, and optimistically updating URL monitor data.
 *
 * Fix for "Unknown after refresh" bug:
 *
 * Root cause: the 8s smart-merge re-fetch fires before the POST /urls Lambda
 * has finished writing to DynamoDB (cold start = 3-7s). GET /urls returns the
 * list WITHOUT the new item. The merge keeps the optimistic row as "localOnly".
 * Then a manual refresh calls GET /urls which now has the server item but with
 * status "Unknown" (monitor Lambda hasn't run yet), replacing the good
 * ping-patched optimistic row.
 *
 * Solution: two-stage re-fetch strategy
 *   Stage 1 (10s): merge — gives POST Lambda time to finish writing
 *   Stage 2 (75s): merge again — gives monitor Lambda (EventBridge ~1min) time
 *                  to run its first health check and write real status/responseTime
 *
 * localPingResultsRef ensures that if the server still shows "Unknown" at
 * either stage, we keep the real health data from the immediate /api/ping call.
 */
export function useURLData({ autoRefresh = false } = {}) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const bgTimer1Ref = useRef(null)
    const bgTimer2Ref = useRef(null)

    // Map of id → local ping result. Survives both re-fetch windows so neither
    // merge stage overwrites a good "Up/346ms" result with a stale "Unknown".
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

            // On every fetch, preserve local ping results for any URL where
            // the server still says Unknown — the monitor Lambda may not have
            // run yet but we already have real health data from /api/ping.
            setData(() => {
                const localPings = localPingResultsRef.current
                return transformedData.map((serverItem) => {
                    const localPing = localPings[serverItem.id]
                    if (localPing && (serverItem.status === 'Unknown' || serverItem.status === 'Down')) {
                        return { ...serverItem, ...localPing }
                    }
                    // Server has a definitive status now — drop the local override
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
            if (isManual) toast.error('Failed to refresh data')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    const handleURLAdded = useCallback((newPayload) => {
        if (!newPayload) return

        // Step 1 — optimistic insert with "Checking" status (spinner badge)
        const optimisticRow = normaliseURL({ ...newPayload, status: 'Checking' })
        setData((prev) => [...prev, optimisticRow])

        // Cancel any previous pending background timers
        if (bgTimer1Ref.current) clearTimeout(bgTimer1Ref.current)
        if (bgTimer2Ref.current) clearTimeout(bgTimer2Ref.current)

        // Step 2 — immediate server-side ping via Next.js route
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

                // Store so both re-fetch stages can preserve this result
                localPingResultsRef.current[optimisticRow.id] = healthPatch

                // Patch the optimistic row immediately
                setData((prev) =>
                    prev.map((row) =>
                        row.id === optimisticRow.id
                            ? { ...row, ...healthPatch }
                            : row
                    )
                )
            })
            .catch(() => {
                setData((prev) =>
                    prev.map((row) =>
                        row.id === optimisticRow.id
                            ? { ...row, status: 'Unknown' }
                            : row
                    )
                )
            })

        // Step 3 — background POST to persist in DynamoDB
        apiClient.post('/urls', newPayload)
            .then(async (response) => {
                if (!response.ok) {
                    const body = await response.text().catch(() => '')
                    throw new Error(`Server returned ${response.status}: ${body}`)
                }
            })
            .catch((err) => {
                console.error('[handleURLAdded] POST error:', err)
                // Remove orphan row — save failed, don't leave ghost entries
                setData((prev) => prev.filter((row) => row.id !== optimisticRow.id))
                delete localPingResultsRef.current[optimisticRow.id]
                toast.error(
                    `Failed to save "${newPayload.name}" — ${err.message || 'network error'}`,
                    { duration: 8000 }
                )
            })

        // ── Stage 1 re-fetch: 10s ──────────────────────────────────────────
        // Gives the POST Lambda enough time to finish writing even with a cold
        // start (typical cold start: 3-7s). At this point the server item exists
        // in DynamoDB but the monitor Lambda probably hasn't run yet, so status
        // will still be "Unknown". localPingResultsRef preserves our ping result.
        bgTimer1Ref.current = setTimeout(async () => {
            try {
                const res = await apiClient.get('/urls')
                if (!res.ok) return
                const serverList = extractArray(await res.json()).map(normaliseURL)
                const serverIds = new Set(serverList.map((u) => u.id))
                const localPings = localPingResultsRef.current

                setData((prev) => {
                    // Items saved locally but not on server yet (POST still in-flight)
                    const localOnly = prev.filter((p) => !serverIds.has(p.id))

                    const merged = serverList.map((serverItem) => {
                        const localPing = localPings[serverItem.id]
                        if (localPing && (serverItem.status === 'Unknown' || serverItem.status === 'Down')) {
                            // Server hasn't run health check yet — keep our ping data
                            return { ...serverItem, ...localPing }
                        }
                        if (localPing && serverItem.status !== 'Unknown') {
                            delete localPings[serverItem.id]
                        }
                        return serverItem
                    })

                    return [...merged, ...localOnly]
                })

                setLastUpdated(new Date())
            } catch { /* ignore */ }
            bgTimer1Ref.current = null
        }, 10000) // 10s — POST Lambda cold start window

        // ── Stage 2 re-fetch: 75s ─────────────────────────────────────────
        // Gives the EventBridge-triggered monitor Lambda time to run its first
        // health check (~1 min schedule). After this re-fetch, the server record
        // should have real status/responseTime written by the monitor Lambda, so
        // we can drop the local ping override and show the server's authoritative data.
        bgTimer2Ref.current = setTimeout(async () => {
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
                            // Monitor Lambda still hasn't run — keep ping data
                            return { ...serverItem, ...localPing }
                        }

                        // Monitor Lambda has run — server data is authoritative now,
                        // clean up the local override
                        if (localPing) {
                            delete localPings[serverItem.id]
                        }

                        return serverItem
                    })

                    return [...merged, ...localOnly]
                })

                setLastUpdated(new Date())
            } catch { /* ignore */ }
            bgTimer2Ref.current = null
        }, 75000) // 75s — EventBridge monitor Lambda window

    }, [])

    useEffect(() => { fetchURLs() }, [fetchURLs])

    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => fetchURLs(false), 30000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchURLs])

    // Cleanup all timers on unmount
    useEffect(() => {
        return () => {
            if (bgTimer1Ref.current) clearTimeout(bgTimer1Ref.current)
            if (bgTimer2Ref.current) clearTimeout(bgTimer2Ref.current)
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