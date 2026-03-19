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
                toast.success(`Refreshed ${transformedData.length} monitors`)
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
     * Optimistic insert: immediately add the new URL to state and silently
     * re-fetch in 2 seconds to pull the real server record (with health data).
     */
    const handleURLAdded = useCallback((newPayload) => {
        if (newPayload) {
            setData((prev) => [...prev, normaliseURL({ ...newPayload, status: 'Unknown' })])
        }

        // Cancel any previous pending background refresh
        if (bgTimerRef.current) clearTimeout(bgTimerRef.current)

        bgTimerRef.current = setTimeout(async () => {
            try {
                const res = await apiClient.get('/urls')
                if (!res.ok) return
                const result = await res.json()
                setData(extractArray(result).map(normaliseURL))
                setLastUpdated(new Date())
            } catch { /* ignore — user still sees optimistic row */ }
            bgTimerRef.current = null
        }, 2000)
    }, [])

    // Initial fetch
    useEffect(() => {
        fetchURLs()
    }, [fetchURLs])

    // Optional auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => fetchURLs(true), 30000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchURLs])

    // Cleanup background timer on unmount
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
