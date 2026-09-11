import { INTERVALS } from "./constants.js"
import { acquire, klineWeight, penalize, record, RateLimitError } from "./limiter.js"

// In dev requests go through the Vite proxy, in a build they hit Binance directly.
const API_ROOT = import.meta.env.DEV ? "/fapi/v1" : "https://fapi.binance.com/fapi/v1"

const INTERVAL_MS = {
    "1m": 60000,
    "3m": 180000,
    "5m": 300000,
    "15m": 900000,
    "30m": 1800000,
    "1h": 3600000,
    "4h": 14400000,
    "12h": 43200000,
    "1d": 86400000
}

// A 1d candle does not need re-fetching every 30 seconds. Each timeframe is
// cached for a fraction of its own length, clamped to something sane.
function cacheTtl(interval) {
    const length = INTERVAL_MS[interval] ?? 60000

    return Math.min(Math.max(length * 0.2, 10000), 300000)
}

const klineCache = new Map()

/**
 * Single point where every request passes the rate-limit gate,
 * reports the exchange's weight counter back, and turns 429/418
 * into a typed error instead of a blind retry.
 */
async function request(url, weight, signal) {
    await acquire(weight, signal)

    const response = await fetch(url, { signal })

    if (response.status === 429 || response.status === 418) {
        const seconds = penalize(response)

        throw new RateLimitError(
            `Rate limited by Binance — pausing for ${seconds}s`,
            seconds
        )
    }

    record(response)

    const data = await response.json()

    if (!Array.isArray(data)) {
        throw new Error(data?.msg || `Binance error (${response.status})`)
    }

    return data
}

/**
 * Fetches klines for a single timeframe.
 * Like fetch_data on the Python side, only timestamp + close survive.
 */
export async function fetchKlines(symbol, interval, limit = 200, options = {}) {
    const { signal, force = false } = options

    const key = `${symbol.toUpperCase()}|${interval}|${limit}`
    const cached = klineCache.get(key)

    if (!force && cached && Date.now() - cached.at < cacheTtl(interval)) {
        return cached.rows
    }

    const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval,
        limit: String(limit)
    })

    const data = await request(
        `${API_ROOT}/klines?${params}`,
        klineWeight(limit),
        signal
    )

    const rows = data.map(row => ({
        timestamp: row[0],
        close: Number(row[4])
    }))

    klineCache.set(key, { at: Date.now(), rows })

    return rows
}

let symbolsPromise = null

/**
 * Every tradable futures symbol with its last price and 24h stats,
 * ranked by quote volume so the busiest markets surface first.
 * Weight 40, so it is fetched once per page load and reused.
 */
export function fetchSymbols() {
    if (symbolsPromise) {
        return symbolsPromise
    }

    symbolsPromise = request(`${API_ROOT}/ticker/24hr`, 40)
        .then(data => data
            // Dated contracts (BTCUSDT_251226) are not perpetuals — skip them.
            .filter(entry => !entry.symbol.includes("_"))
            .map(entry => ({
                symbol: entry.symbol,
                price: Number(entry.lastPrice),
                change: Number(entry.priceChangePercent),
                volume: Number(entry.quoteVolume)
            }))
            .sort((a, b) => b.volume - a.volume))
        .catch(error => {
            symbolsPromise = null
            throw error
        })

    return symbolsPromise
}

/**
 * Runs async jobs with a fixed number of workers so a wide scan
 * never fires hundreds of simultaneous requests at Binance.
 */
async function runPool(jobs, concurrency, onProgress, signal) {
    const results = new Array(jobs.length)

    let cursor = 0
    let completed = 0

    async function worker() {
        while (cursor < jobs.length) {
            if (signal?.aborted) return

            const index = cursor++

            results[index] = await jobs[index]()
            completed += 1

            onProgress?.(completed, jobs.length)
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, jobs.length) },
        () => worker()
    )

    await Promise.all(workers)

    return results
}

/**
 * Fetches every symbol × timeframe pair for the signal scanner.
 * Each entry resolves to { symbol, interval, rows, error } — one failure
 * never takes down the scan, but a rate-limit error stops it immediately.
 */
export function scanKlines(symbols, intervals, limit = 200, options = {}) {
    const { concurrency = 8, onProgress, signal } = options

    const jobs = []

    for (const symbol of symbols) {
        for (const interval of intervals) {
            jobs.push(async () => {
                try {
                    const rows = await fetchKlines(symbol, interval, limit, { signal })

                    return { symbol, interval, rows, error: null }
                } catch (error) {
                    if (error instanceof RateLimitError) throw error

                    return { symbol, interval, rows: null, error: error.message }
                }
            })
        }
    }

    return runPool(jobs, concurrency, onProgress, signal)
}

/**
 * Fetches every timeframe in parallel.
 * Preserves the Python return_exceptions=True contract: a failed timeframe
 * comes back as { error } instead of taking the whole batch down.
 */
export async function fetchAllIntervals(symbol, limit = 200, options = {}) {
    const { signal, force = false } = options

    const settled = await Promise.allSettled(
        INTERVALS.map(interval => fetchKlines(symbol, interval, limit, { signal, force }))
    )

    const result = {}

    settled.forEach((entry, index) => {
        const interval = INTERVALS[index]

        result[interval] = entry.status === "fulfilled"
            ? { rows: entry.value, error: null }
            : { rows: null, error: entry.reason?.message || "Request failed" }
    })

    return result
}
