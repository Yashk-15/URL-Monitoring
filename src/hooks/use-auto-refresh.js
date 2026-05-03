import { useEffect, useRef, useCallback } from 'react'

export function useAutoRefresh(callback, interval = 30000, enabled = true) {
    const savedCallback = useRef()
    const intervalRef = useRef()

    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

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

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [interval, enabled])

    const refresh = useCallback(() => {
        if (savedCallback.current) {
            savedCallback.current()
        }
    }, [])

    return { refresh }
}
