import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for auto-refreshing data at specified intervals
 * @param {Function} callback - Function to call on each refresh
 * @param {number} interval - Refresh interval in milliseconds (default: 30000ms = 30s)
 * @param {boolean} enabled - Whether auto-refresh is enabled (default: true)
 */
export function useAutoRefresh(callback, interval = 30000, enabled = true) {
    const savedCallback = useRef()
    const intervalRef = useRef()

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    // Set up the interval
    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            return
        }

        function tick() {
            if (savedCallback.current) {
                savedCallback.current()
            }
        }

        intervalRef.current = setInterval(tick, interval)

        // Cleanup on unmount or when dependencies change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [interval, enabled])

    // Manual refresh function
    const refresh = useCallback(() => {
        if (savedCallback.current) {
            savedCallback.current()
        }
    }, [])

    return { refresh }
}
