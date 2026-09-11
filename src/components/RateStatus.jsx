import { useEffect, useState } from "react"

import { subscribe, WEIGHT_LIMIT } from "../limiter.js"

/**
 * Live view of the API weight budget, so heavy use is visible
 * before Binance is the one to point it out.
 */
export default function RateStatus() {
    const [status, setStatus] = useState(null)
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => subscribe(setStatus), [])

    useEffect(() => {
        if (!status?.paused) return

        const timer = setInterval(() => setNow(Date.now()), 500)

        return () => clearInterval(timer)
    }, [status?.paused])

    if (!status) return null

    if (status.paused) {
        const seconds = Math.max(0, Math.ceil((status.cooldownUntil - now) / 1000))

        return (
            <span className="rate rate-paused" title="Binance asked us to back off">
                rate limited · resuming in {seconds}s
            </span>
        )
    }

    const share = Math.min(1, status.used / WEIGHT_LIMIT)
    const level = share > 0.6 ? "high" : share > 0.3 ? "mid" : "low"

    return (
        <span
            className="rate"
            title={`API weight used this minute (${status.source === "header" ? "reported by Binance" : "local estimate"})`}
        >
            <span className="rate-bar">
                <span className={`rate-fill rate-${level}`} style={{ width: `${share * 100}%` }} />
            </span>
            {status.used}/{WEIGHT_LIMIT}
        </span>
    )
}
