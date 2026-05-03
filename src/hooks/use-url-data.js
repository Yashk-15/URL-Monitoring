import { useState, useCallback, useEffect, useRef } from 'react'
import { apiClient, extractArray, normaliseURL } from '@/lib/api-client'
import { toast } from 'sonner'

/**
 * Shared hook for fetching, refreshing, and optimistically updating URL monitor data.
 * Used by both /dashboard and /dashboard/urls to avoid code duplication.
 *
 * @param {Object} options
 * @param {boolean} options.autoRefresh - Whether to automatically refresh every 30s (default: false)
 */
export function useURLData({ autoRefresh = false } = {}) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Ref to track pending background timers so we can cancel on unmount
    const bgTimerRef = useRef(null)
    // Ref to guard against setState calls after the component unmounts
    const isMountedRef = useRef(true)

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

            setData(transformedData)
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
            // Always reset both flags so we never get stuck in loading state
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    /**
     * Optimistic insert + immediate ping:
     *  1. Add row to state instantly with "Unknown" status
     *  2. Fire a server-side ping (/api/ping) — usually responds in ~1s
     *  3. Patch the row with real health metrics when ping returns
     *  4. After 8s, do a smart-merge re-fetch to sync with DynamoDB
     *
     * Why 8s? Lambda cold-start can take 3–7s. We must wait until the
     * background POST has completed before fetching, otherwise GET /urls
     * returns the old list and wipes the optimistic row from state.
     *
     * Smart-merge rules:
     *  - If a URL is in local state but NOT on the server yet → keep it (still saving)
     *  - If a URL is on the server with "Unknown" health but we have real
     *    data locally (from the ping) → preserve local health data
     *  - Otherwise use the server record
     */
    const handleURLAdded = useCallback((newPayload) => {
        if (!newPayload) return

        // Step 1 — optimistic insert
        const optimisticRow = normaliseURL({ ...newPayload, status: 'Unknown' })
        setData((prev) => [...prev, optimisticRow])

        // Cancel any previous pending background timers
        if (bgTimerRef.current) clearTimeout(bgTimerRef.current)

        // Step 2 — immediate ping via Next.js server-side route (bypasses CORS)
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
                // Step 3 — patch the row with real metrics
                const status = ping.isUp
                    ? (ping.latencyMs > (newPayload.maxLatencyMs || 3000) ? 'Warning' : 'Up')
                    : 'Down'

                setData((prev) =>
                    prev.map((row) =>
                        row.id === optimisticRow.id
                            ? {
                                ...row,
                                status,
                                responseTime: String(ping.latencyMs ?? 0),
                                statusCode: ping.statusCode,
                                errorMsg: ping.errorMsg,
                                isUp: ping.isUp,
                                isSlow: status === 'Warning',
                                lastCheck: new Date().toLocaleString(),
                                uptime: ping.isUp ? '100' : '0',
                            }
                            : row
                    )
                )
            })
            .catch(() => {
                // Ping failed — leave as Unknown; re-fetch below will sort it
            })

        // Step 4 — smart-merge re-fetch after 8s (gives time for the background POST +
        // Lambda cold-start to complete before we ask the server for the list)
        bgTimerRef.current = setTimeout(async () => {
            // Guard: don't call setData if the component has already unmounted
            // (e.g. user navigated away immediately after adding a URL).
            if (!isMountedRef.current) return
            try {
                const res = await apiClient.get('/urls')
                if (!res.ok) return
                const serverList = extractArray(await res.json()).map(normaliseURL)
                const serverIds = new Set(serverList.map((u) => u.id))

                if (!isMountedRef.current) return
                setData((prev) => {
                    // Items in local state that aren't on the server yet (POST still in-flight
                    // or just completed but not yet returned) — keep them
                    const localOnly = prev.filter((p) => !serverIds.has(p.id))

                    // For server items: if the server still says "Unknown" but we have
                    // better local data (from the ping), preserve our local health data
                    const merged = serverList.map((serverItem) => {
                        if (serverItem.status === 'Unknown') {
                            const localItem = prev.find((p) => p.id === serverItem.id)
                            if (localItem && localItem.status !== 'Unknown') {
                                return {
                                    ...serverItem,
                                    status: localItem.status,
                                    responseTime: localItem.responseTime,
                                    statusCode: localItem.statusCode,
                                    errorMsg: localItem.errorMsg,
                                    isUp: localItem.isUp,
                                    isSlow: localItem.isSlow,
                                    lastCheck: localItem.lastCheck,
                                    uptime: localItem.uptime,
                                }
                            }
                        }
                        return serverItem
                    })

                    return [...merged, ...localOnly]
                })

                if (isMountedRef.current) setLastUpdated(new Date())
            } catch { /* ignore */ }
            bgTimerRef.current = null
        }, 8000)

        // Return a cleanup function the caller can invoke if the background POST
        // fails — removes the optimistic row so it doesn't orphan in the table.
        return function removeOptimisticRow() {
            setData((prev) => prev.filter((r) => r.id !== optimisticRow.id))
        }
    }, [])


    // Initial fetch
    useEffect(() => {
        fetchURLs()
    }, [fetchURLs])

    // Optional auto-refresh every 30 seconds — silent (no toast)
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => fetchURLs(false), 30000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchURLs])

    // Cleanup: mark unmounted and cancel background timer
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
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
