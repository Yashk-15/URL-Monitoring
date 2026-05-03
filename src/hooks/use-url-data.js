import { useState, useCallback, useEffect, useRef } from 'react'
import { apiClient, extractArray, normaliseURL } from '@/lib/api-client'
import { toast } from 'sonner'

/**
 * Shared hook for fetching, refreshing, and optimistically updating URL monitor data.
 * 
 * Architecture Note:
 * Uses a two-stage re-fetch strategy to prevent the "Unknown after refresh" bug:
 *   - Stage 1 (10s): Merges state. Gives the POST Lambda time to finish writing to DynamoDB (bypassing 3-7s cold starts).
 *   - Stage 2 (75s): Merges state again. Gives the EventBridge-triggered monitor Lambda time to run its first health check (~1 min schedule).
 * localPingResultsRef ensures that we keep the real health data from the immediate /api/ping call during both stages.
 */
export function useURLData({ autoRefresh = false } = {}) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const bgTimer1Ref = useRef(null)
    const bgTimer2Ref = useRef(null)

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

            setData((prev) => {
                const localPings = localPingResultsRef.current
                const serverUrls = new Set(transformedData.map((u) => u.url))
                const localOnly = prev.filter((p) => p.isLocalOnly && !serverUrls.has(p.url))

                const merged = transformedData.map((serverItem) => {
                    const localPing = localPings[serverItem.url]
                    if (localPing && (serverItem.status === 'Unknown' || serverItem.status === 'Checking' || serverItem.status === 'Down')) {
                        return { ...serverItem, ...localPing }
                    }
                    if (localPing && serverItem.status !== 'Unknown' && serverItem.status !== 'Checking') {
                        delete localPings[serverItem.url]
                    }
                    return serverItem
                })

                return [...merged, ...localOnly]
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

        const optimisticRow = normaliseURL({ ...newPayload, status: 'Checking' })
        optimisticRow.isLocalOnly = true
        setData((prev) => [...prev, optimisticRow])

        if (bgTimer1Ref.current) clearTimeout(bgTimer1Ref.current)
        if (bgTimer2Ref.current) clearTimeout(bgTimer2Ref.current)

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

                localPingResultsRef.current[optimisticRow.url] = healthPatch

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

        apiClient.post('/urls', newPayload)
            .then(async (response) => {
                if (!response.ok) {
                    const body = await response.text().catch(() => '')
                    throw new Error(`Server returned ${response.status}: ${body}`)
                }
            })
            .catch((err) => {
                console.error('[handleURLAdded] POST error:', err)
                setData((prev) => prev.filter((row) => row.id !== optimisticRow.id))
                delete localPingResultsRef.current[optimisticRow.url]
                toast.error(
                    `Failed to save "${newPayload.name}" — ${err.message || 'network error'}`,
                    { duration: 8000 }
                )
            })

        bgTimer1Ref.current = setTimeout(async () => {
            try {
                const res = await apiClient.get('/urls')
                if (!res.ok) return
                const serverList = extractArray(await res.json()).map(normaliseURL)
                const serverUrls = new Set(serverList.map((u) => u.url))
                const localPings = localPingResultsRef.current

                setData((prev) => {
                    const localOnly = prev.filter((p) => p.isLocalOnly && !serverUrls.has(p.url))

                    const merged = serverList.map((serverItem) => {
                        const localPing = localPings[serverItem.url]
                        if (localPing && (serverItem.status === 'Unknown' || serverItem.status === 'Checking' || serverItem.status === 'Down')) {
                            return { ...serverItem, ...localPing }
                        }
                        if (localPing && serverItem.status !== 'Unknown' && serverItem.status !== 'Checking') {
                            delete localPings[serverItem.url]
                        }
                        return serverItem
                    })

                    return [...merged, ...localOnly]
                })

                setLastUpdated(new Date())
            } catch {  }
            bgTimer1Ref.current = null
        }, 10000) 

        bgTimer2Ref.current = setTimeout(async () => {
            try {
                const res = await apiClient.get('/urls')
                if (!res.ok) return
                const serverList = extractArray(await res.json()).map(normaliseURL)
                const serverUrls = new Set(serverList.map((u) => u.url))
                const localPings = localPingResultsRef.current

                setData((prev) => {
                    const localOnly = prev.filter((p) => p.isLocalOnly && !serverUrls.has(p.url))

                    const merged = serverList.map((serverItem) => {
                        const localPing = localPings[serverItem.url]

                        if (localPing && (serverItem.status === 'Unknown' || serverItem.status === 'Checking' || serverItem.status === 'Down')) {
                            return { ...serverItem, ...localPing }
                        }

                        if (localPing && serverItem.status !== 'Unknown' && serverItem.status !== 'Checking') {
                            delete localPings[serverItem.url]
                        }

                        return serverItem
                    })

                    return [...merged, ...localOnly]
                })

                setLastUpdated(new Date())
            } catch {  }
            bgTimer2Ref.current = null
        }, 75000) 

    }, [])

    useEffect(() => { fetchURLs() }, [fetchURLs])

    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => fetchURLs(false), 30000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchURLs])

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