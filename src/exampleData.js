// Deterministic sample series for the walkthrough on the About page.
// Illustrative only — it never touches the network, and it always renders
// the same shape: a market that keeps returning to one band, leaves it
// twice, and is sitting back inside it at the end.

const SEED = 20260101
const BASE = 77000
const COUNT = 200
const STEP_MS = 300000 // 5m candles

function lcg(seed) {
    let state = seed

    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296

        return state / 4294967296
    }
}

/** Smooth excursion away from the band and back, as a fraction of its depth. */
function excursion(index, from, to, depth) {
    if (index < from || index > to) return 0

    const phase = (index - from) / (to - from)

    return Math.sin(phase * Math.PI) * depth
}

export function exampleRows() {
    const random = lcg(SEED)
    const start = Date.UTC(2026, 0, 12, 6, 0)

    const rows = []

    let wander = 0

    for (let i = 0; i < COUNT; i++) {
        // Mean-reverting drift, so closes spread realistically instead of
        // piling into a single bin.
        wander = wander * 0.94 + (random() - 0.5) * 0.004

        // The last stretch walks back into the band — that return is the signal.
        if (i > COUNT - 16) wander *= 0.55

        const noise = (random() - 0.5) * 0.002
        const dip = -excursion(i, 52, 88, 0.030)
        const spike = excursion(i, 128, 158, 0.022)

        rows.push({
            timestamp: start + i * STEP_MS,
            close: BASE * (1 + wander + noise + dip + spike)
        })
    }

    return rows
}
