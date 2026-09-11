import { APPROACH_LOOKBACK, BINS, SIGNAL_TIMEFRAMES } from "./constants.js"

/**
 * Equivalent of np.histogram(prices, bins=20):
 * splits the range into equal-width bins and returns the one holding the
 * most closes. The last bin includes the upper bound (numpy behaviour).
 */
export function getStrongestZone(prices, bins = BINS) {
    if (!prices || prices.length === 0) {
        return null
    }

    let priceMin = Infinity
    let priceMax = -Infinity

    for (const price of prices) {
        if (price < priceMin) priceMin = price
        if (price > priceMax) priceMax = price
    }

    if (!(priceMax > priceMin)) {
        return null
    }

    const width = (priceMax - priceMin) / bins
    const counts = new Array(bins).fill(0)

    for (const price of prices) {
        let index = Math.floor((price - priceMin) / width)

        if (index >= bins) index = bins - 1
        if (index < 0) index = 0

        counts[index] += 1
    }

    let best = 0

    for (let i = 1; i < bins; i++) {
        if (counts[i] > counts[best]) best = i
    }

    const low = priceMin + width * best
    const high = priceMin + width * (best + 1)

    return {
        low,
        high,
        center: (low + high) / 2,
        count: counts[best],
        strength: (counts[best] / prices.length) * 100
    }
}

/**
 * Port of calculate_signal.
 * Returns 1 when price sits inside the strongest zone widened by one
 * zone width on each side, 0 otherwise.
 */
export function calculateSignal(prices) {
    if (!prices || prices.length < 50) {
        return 0
    }

    const currentPrice = prices[prices.length - 1]

    let globalMin = Infinity
    let globalMax = -Infinity

    for (const price of prices) {
        if (price < globalMin) globalMin = price
        if (price > globalMax) globalMax = price
    }

    if (globalMax - globalMin <= 0) {
        return 0
    }

    const zone = getStrongestZone(prices, BINS)

    if (zone === null) {
        return 0
    }

    const clusterWidth = zone.high - zone.low

    if (clusterWidth <= 0) {
        return 0
    }

    // The before_cluster length guard from Python is kept as-is.
    const start = Math.max(0, prices.length - APPROACH_LOOKBACK - 1)
    const beforeClusterLength = prices.length - 1 - start

    if (beforeClusterLength < 5) {
        return 0
    }

    const inRange =
        zone.low - clusterWidth <= currentPrice &&
        currentPrice <= zone.high + clusterWidth

    return inRange ? 1 : 0
}

/**
 * The three zones a timeframe chart draws: the strongest zone overall
 * plus the densest bands above and below the current price.
 */
export function analyzeInterval(rows) {
    if (!rows || rows.length === 0) {
        return null
    }

    const prices = rows.map(row => row.close)
    const current = prices[prices.length - 1]

    const above = prices.filter(price => price > current)
    const below = prices.filter(price => price < current)

    return {
        current,
        main: getStrongestZone(prices, BINS),
        above: above.length > 1 ? getStrongestZone(above, BINS) : null,
        below: below.length > 1 ? getStrongestZone(below, BINS) : null,
        signal: calculateSignal(prices)
    }
}

/**
 * Port of calculate_symbol_signals — restricted to SIGNAL_TIMEFRAMES.
 */
export function calculateSymbolSignals(data) {
    const result = {}

    for (const interval of SIGNAL_TIMEFRAMES) {
        const rows = data?.[interval]?.rows

        result[interval] = rows ? calculateSignal(rows.map(row => row.close)) : 0
    }

    return result
}
