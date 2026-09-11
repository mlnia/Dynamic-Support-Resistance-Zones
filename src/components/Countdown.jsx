import { useEffect, useState } from "react"

const RADIUS = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Ticking countdown to the next auto refresh.
 * Re-arms whenever startedAt changes, i.e. after every completed load.
 */
export default function Countdown({ startedAt, intervalMs, running, loading }) {
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        if (!running) return

        setNow(Date.now())

        const timer = setInterval(() => setNow(Date.now()), 1000)

        return () => clearInterval(timer)
    }, [running, startedAt, intervalMs])

    if (!running) {
        return <span className="countdown countdown-off">auto refresh off</span>
    }

    if (loading || !startedAt) {
        return (
            <span className="countdown">
                <Ring progress={1} pulse />
                updating…
            </span>
        )
    }

    const elapsed = now - startedAt
    const remaining = Math.max(0, intervalMs - elapsed)
    const seconds = Math.ceil(remaining / 1000)

    return (
        <span className="countdown" title="Time until the next automatic refresh">
            <Ring progress={remaining / intervalMs} />
            next in <strong>{seconds}s</strong>
        </span>
    )
}

function Ring({ progress, pulse = false }) {
    return (
        <svg className={`ring ${pulse ? "ring-pulse" : ""}`} width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r={RADIUS} className="ring-track" />
            <circle
                cx="11"
                cy="11"
                r={RADIUS}
                className="ring-value"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                transform="rotate(-90 11 11)"
            />
        </svg>
    )
}
