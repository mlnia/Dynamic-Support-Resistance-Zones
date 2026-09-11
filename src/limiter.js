// Binance futures allows 2400 request weight per minute per IP
// (REQUEST_WEIGHT in /fapi/v1/exchangeInfo). Going over returns 429, and
// ignoring that escalates to a 418 IP ban lasting minutes to days.
//
// Every response carries x-mbx-used-weight-1m, so the exchange's own counter
// is used whenever it is readable. In a production build the header may be
// hidden by CORS, and the local estimate takes over.

export const WEIGHT_LIMIT = 2400

// Requests stop here, leaving headroom for in-flight calls and other tabs.
const SOFT_LIMIT = 1500
const WINDOW_MS = 60000

let used = 0
let windowEnd = 0
let cooldownUntil = 0
let source = "estimate"

const listeners = new Set()

export class RateLimitError extends Error {
    constructor(message, retryAfter) {
        super(message)
        this.name = "RateLimitError"
        this.retryAfter = retryAfter
    }
}

export function getStatus() {
    rollWindow()

    return {
        used,
        limit: WEIGHT_LIMIT,
        soft: SOFT_LIMIT,
        source,
        cooldownUntil,
        paused: cooldownUntil > Date.now()
    }
}

export function subscribe(listener) {
    listeners.add(listener)
    listener(getStatus())

    return () => listeners.delete(listener)
}

function notify() {
    const status = getStatus()

    for (const listener of listeners) listener(status)
}

function rollWindow() {
    const now = Date.now()

    if (now >= windowEnd) {
        windowEnd = Math.ceil(now / WINDOW_MS) * WINDOW_MS
        used = 0
    }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Blocks until the budget allows `weight` more, and until any cooldown
 * handed down by a 429/418 has elapsed.
 */
export async function acquire(weight, signal) {
    for (;;) {
        if (signal?.aborted) {
            throw new DOMException("Aborted", "AbortError")
        }

        rollWindow()

        const now = Date.now()

        if (cooldownUntil > now) {
            await sleep(Math.min(cooldownUntil - now, 1000))
            continue
        }

        if (used + weight > SOFT_LIMIT) {
            await sleep(Math.min(Math.max(windowEnd - now, 0) + 50, 2000))
            continue
        }

        // Counted up front; the response header corrects it right after.
        used += weight
        notify()
        return
    }
}

export function record(response) {
    rollWindow()

    const header = Number(response.headers.get("x-mbx-used-weight-1m"))

    if (Number.isFinite(header) && header > 0) {
        used = header
        source = "header"
    } else {
        source = "estimate"
    }

    notify()
}

/**
 * Applies the exchange's own backoff instruction. Retry-After is respected
 * when present; otherwise a conservative default is used.
 */
export function penalize(response) {
    const retryAfter = Number(response.headers.get("retry-after"))

    const seconds = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter
        : (response.status === 418 ? 120 : 60)

    cooldownUntil = Date.now() + seconds * 1000
    used = SOFT_LIMIT
    notify()

    return seconds
}

/** Weight of one klines call, by the documented limit brackets. */
export function klineWeight(limit) {
    if (limit <= 100) return 1
    if (limit <= 500) return 2
    if (limit <= 1000) return 5

    return 10
}
