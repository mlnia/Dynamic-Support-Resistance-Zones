import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import Countdown from "../components/Countdown.jsx"
import RateStatus from "../components/RateStatus.jsx"
import SRChart from "../components/SRChart.jsx"
import { analyzeInterval } from "../analysis.js"
import { fetchSymbols, scanKlines } from "../api.js"
import { SIGNAL_TIMEFRAMES } from "../constants.js"
import { formatClock, formatPrice } from "../format.js"
import { usePageVisible, useCooldown } from "../hooks.js"

const UNIVERSE_SIZES = [10, 20, 30, 50]
const SCAN_LIMIT = 200
const REFRESH_MS = 60000
const MANUAL_COOLDOWN_S = 30

export default function Signals({ onOpen }) {
    const [size, setSize] = useState(20)
    const [timeframes, setTimeframes] = useState(SIGNAL_TIMEFRAMES)

    const [hits, setHits] = useState([])
    const [scanned, setScanned] = useState(0)
    const [progress, setProgress] = useState({ done: 0, total: 0 })

    const [scanning, setScanning] = useState(false)
    const [error, setError] = useState(null)
    const [updatedAt, setUpdatedAt] = useState(null)
    const [autoScan, setAutoScan] = useState(true)

    const requestId = useRef(0)
    const abortRef = useRef(null)

    const visible = usePageVisible()
    const [cooldown, startCooldown] = useCooldown(MANUAL_COOLDOWN_S)

    const scan = useCallback(async () => {
        const id = ++requestId.current

        abortRef.current?.abort()

        const controller = new AbortController()
        abortRef.current = controller

        setScanning(true)
        setError(null)
        setProgress({ done: 0, total: 0 })

        try {
            const universe = await fetchSymbols()
            const symbols = universe.slice(0, size).map(entry => entry.symbol)

            const results = await scanKlines(symbols, SIGNAL_TIMEFRAMES, SCAN_LIMIT, {
                concurrency: 8,
                signal: controller.signal,
                onProgress: (done, total) => {
                    if (id === requestId.current) setProgress({ done, total })
                }
            })

            if (id !== requestId.current) return

            const found = []

            for (const entry of results) {
                if (!entry.rows) continue

                const analysis = analyzeInterval(entry.rows)

                if (analysis?.signal === 1) {
                    found.push({ ...entry, analysis })
                }
            }

            // Densest zones first — those are the best established levels.
            found.sort((a, b) => b.analysis.main.strength - a.analysis.main.strength)

            setHits(found)
            setScanned(results.length)
            setUpdatedAt(Date.now())
        } catch (err) {
            if (id !== requestId.current || err.name === "AbortError") return
            setError(err.message)
        } finally {
            if (id === requestId.current) setScanning(false)
        }
    }, [size])

    useEffect(() => {
        scan()

        return () => abortRef.current?.abort()
    }, [scan])

    // Scans stop while the tab is hidden — a forgotten tab would otherwise
    // keep issuing a few hundred requests every minute.
    useEffect(() => {
        if (!autoScan || !updatedAt || !visible) return

        const delay = Math.max(0, REFRESH_MS - (Date.now() - updatedAt))
        const timer = setTimeout(scan, delay)

        return () => clearTimeout(timer)
    }, [autoScan, updatedAt, visible, scan])

    function manualScan() {
        startCooldown()
        scan()
    }

    const visibleHits = useMemo(
        () => hits.filter(hit => timeframes.includes(hit.interval)),
        [hits, timeframes]
    )

    const perTimeframe = useMemo(() => {
        const counts = {}

        for (const timeframe of SIGNAL_TIMEFRAMES) {
            counts[timeframe] = hits.filter(hit => hit.interval === timeframe).length
        }

        return counts
    }, [hits])

    function toggleTimeframe(timeframe) {
        setTimeframes(state => {
            const next = state.includes(timeframe)
                ? state.filter(item => item !== timeframe)
                : [...state, timeframe]

            // Keep the canonical order regardless of click order.
            return SIGNAL_TIMEFRAMES.filter(item => next.includes(item))
        })
    }

    const percentDone = progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0

    return (
        <>
            <div className="controls">
                <select
                    className="select"
                    value={size}
                    onChange={event => setSize(Number(event.target.value))}
                >
                    {UNIVERSE_SIZES.map(value => (
                        <option key={value} value={value}>Top {value} by volume</option>
                    ))}
                </select>

                <button
                    className="button"
                    type="button"
                    onClick={manualScan}
                    disabled={scanning || cooldown > 0}
                >
                    {scanning
                        ? `Scanning ${percentDone}%`
                        : cooldown > 0 ? `Wait ${cooldown}s` : "Scan now"}
                </button>

                <label className="toggle">
                    <input
                        type="checkbox"
                        checked={autoScan}
                        onChange={event => setAutoScan(event.target.checked)}
                    />
                    Auto 60s
                </label>

                <RateStatus />

                <Countdown
                    startedAt={updatedAt}
                    intervalMs={REFRESH_MS}
                    running={autoScan && visible}
                    loading={scanning}
                />
            </div>

            {error && <div className="error">Scan failed: {error}</div>}

            {scanning && (
                <div className="progress">
                    <div className="progress-bar" style={{ width: `${percentDone}%` }} />
                </div>
            )}

            <section className="signals">
                <span className="signals-label">FILTER</span>

                {SIGNAL_TIMEFRAMES.map(timeframe => (
                    <button
                        key={timeframe}
                        type="button"
                        className={`signal ${timeframes.includes(timeframe) ? "signal-selected" : ""} ${perTimeframe[timeframe] > 0 ? "signal-on" : ""}`}
                        onClick={() => toggleTimeframe(timeframe)}
                    >
                        {timeframe}
                        <span className="signal-count">{perTimeframe[timeframe] ?? 0}</span>
                    </button>
                ))}

                <span className="signals-summary">
                    {hits.length} signal{hits.length === 1 ? "" : "s"} across {scanned} scanned pairs
                </span>

                {updatedAt && (
                    <span className="updated">scanned {formatClock(new Date(updatedAt))}</span>
                )}
            </section>

            {visibleHits.length === 0 && !scanning && (
                <div className="empty-state">
                    <strong>No active signals</strong>
                    <span>
                        Price is not sitting in the strongest density zone on any scanned pair.
                        Widen the universe or wait for the next scan.
                    </span>
                </div>
            )}

            <section className="signal-grid">
                {visibleHits.map(hit => (
                    <SignalCard
                        key={`${hit.symbol}-${hit.interval}`}
                        hit={hit}
                        onOpen={onOpen}
                    />
                ))}
            </section>
        </>
    )
}

function SignalCard({ hit, onOpen }) {
    const { symbol, interval, rows, analysis } = hit
    const { main, current } = analysis

    const offset = ((current - main.center) / main.center) * 100
    const inside = current >= main.low && current <= main.high

    return (
        <button
            type="button"
            className="signal-card"
            onClick={() => onOpen(symbol, interval)}
            title={`Open ${symbol} ${interval} on the dashboard`}
        >
            <div className="signal-card-head">
                <span className="signal-card-symbol">{symbol}</span>
                <span className="signal-card-tf">{interval}</span>
                <span className="signal-card-price">{formatPrice(current)}</span>
            </div>

            <SRChart rows={rows} interval={interval} analysis={analysis} compact height={104} />

            <div className="signal-card-stats">
                <span className={inside ? "tag tag-in" : "tag"}>
                    {inside ? "in zone" : "at edge"}
                </span>

                <span className="signal-card-meta">
                    {formatPrice(main.low)} – {formatPrice(main.high)}
                </span>

                <span className="signal-card-meta">
                    density {main.strength.toFixed(1)}%
                </span>

                <span className={`signal-card-meta ${offset >= 0 ? "up" : "down"}`}>
                    {offset >= 0 ? "+" : ""}{offset.toFixed(2)}%
                </span>
            </div>
        </button>
    )
}
