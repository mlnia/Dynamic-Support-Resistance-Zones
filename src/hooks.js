import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Tracks tab visibility so polling can stop while nobody is looking.
 * Forgotten background tabs are the easiest way to burn the API budget.
 */
export function usePageVisible() {
    const [visible, setVisible] = useState(() => !document.hidden)

    useEffect(() => {
        const onChange = () => setVisible(!document.hidden)

        document.addEventListener("visibilitychange", onChange)

        return () => document.removeEventListener("visibilitychange", onChange)
    }, [])

    return visible
}

/**
 * Enforced pause after a manual action, so a button cannot be hammered.
 * Returns the seconds still remaining and a starter to arm it.
 */
export function useCooldown(seconds) {
    const [until, setUntil] = useState(0)
    const [remaining, setRemaining] = useState(0)

    const timer = useRef(null)

    useEffect(() => {
        if (!until) return

        const tick = () => {
            const left = Math.max(0, Math.ceil((until - Date.now()) / 1000))

            setRemaining(left)

            if (left === 0) clearInterval(timer.current)
        }

        tick()
        timer.current = setInterval(tick, 500)

        return () => clearInterval(timer.current)
    }, [until])

    const start = useCallback(() => {
        setUntil(Date.now() + seconds * 1000)
    }, [seconds])

    return [remaining, start]
}
