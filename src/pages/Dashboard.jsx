import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import Countdown from "../components/Countdown.jsx"
import RateStatus from "../components/RateStatus.jsx"
import SRChart from "../components/SRChart.jsx"
import SymbolPicker from "../components/SymbolPicker.jsx"
import { analyzeInterval } from "../analysis.js"
import { fetchAllIntervals } from "../api.js"
import { COLORS, INTERVALS, SIGNAL_TIMEFRAMES, TITLES } from "../constants.js"
import { formatClock, formatPrice } from "../format.js"
import { usePageVisible, useCooldown } from "../hooks.js"

const LIMITS = [100, 200, 500, 1000]
const REFRESH_MS = 30000
const MANUAL_COOLDOWN_S = 5

export default function Dashboard({ symbol, onSymbolChange, selected, onSelect }) {
    const [limit, setLimit] = useState(200)

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [updatedAt, setUpdatedAt] = useState(null)

    const [autoRefresh, setAutoRefresh] = useState(true)
    const [visible, setVisible] = useState({ main: true, above: true, below: true })

    const requestId = useRef(0)
    const abortRef = useRef(null)

    const tabVisible = usePageVisible()
    const [cooldown, startCooldown] = useCooldown(MANUAL_COOLDOWN_S)

    const load = useCallback(async (force = false) => {
        const id = ++requestId.current

        // Drop whatever is still in flight — it would only spend weight.
        abortRef.current?.abort()

        const controller = new AbortController()
        abortRef.current = controller

        setLoading(true)
        setError(null)

        try {
            const result = await fetchAllIntervals(symbol, limit, {
                signal: controller.signal,
                force
            })

            if (id !== requestId.current) return

            setData(result)
            setUpdatedAt(Date.now())

            const failed = INTERVALS.filter(interval => result[interval].error)

            if (failed.length === INTERVALS.length) {
                setError(result[INTERVALS[0]].error)
            }
        } catch (err) {
            if (id !== requestId.current || err.name === "AbortError") return
            setError(err.message)
        } finally {
            if (id === requestId.current) setLoading(false)
        }
    }, [symbol, limit])

    useEffect(() => {
        load()

        return () => abortRef.current?.abort()
    }, [load])

    // The timer restarts from the last completed load, so the countdown
    // on screen always matches when the next request actually fires.
    // Polling stops entirely while the tab is hidden.
    useEffect(() => {
        if (!autoRefresh || !updatedAt || !tabVisible) return

        const delay = Math.max(0, REFRESH_MS - (Date.now() - updatedAt))
        const timer = setTimeout(load, delay)

        return () => clearTimeout(timer)
    }, [autoRefresh, updatedAt, tabVisible, load])

    function manualRefresh() {
        startCooldown()
        load(true)
    }

    // Zones and signal for every timeframe, computed once per data change.
    const analyses = useMemo(() => {
        if (!data) return {}

        const result = {}

        for (const interval of INTERVALS) {
            result[interval] = analyzeInterval(data[interval]?.rows)
        }

        return result
    }, [data])

    const selectedRows = data?.[selected]?.rows
    const selectedAnalysis = analyses[selected]
    const activeSignals = SIGNAL_TIMEFRAMES.filter(tf => analyses[tf]?.signal === 1)

    function toggleZone(key) {
        setVisible(state => ({ ...state, [key]: !state[key] }))
    }

    return (
        <>
            <div className="controls">
                <SymbolPicker value={symbol} onSelect={onSymbolChange} />

                <select
                    className="select"
                    value={limit}
                    onChange={event => setLimit(Number(event.target.value))}
                >
                    {LIMITS.map(value => (
                        <option key={value} value={value}>{value} candles</option>
                    ))}
                </select>

                <button
                    className="button"
                    type="button"
                    onClick={manualRefresh}
                    disabled={loading || cooldown > 0}
                >
                    {loading ? "Loading…" : cooldown > 0 ? `Wait ${cooldown}s` : "Refresh"}
                </button>

                <label className="toggle">
                    <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={event => setAutoRefresh(event.target.checked)}
                    />
                    Auto 30s
                </label>

                <RateStatus />

                <Countdown
                    startedAt={updatedAt}
                    intervalMs={REFRESH_MS}
                    running={autoRefresh && tabVisible}
                    loading={loading}
                />
            </div>

            {error && <div className="error">Could not load data: {error}</div>}

            <section className="signals">
                <span className="signals-label">SIGNAL</span>

                {SIGNAL_TIMEFRAMES.map(interval => {
                    const signal = analyses[interval]?.signal === 1

                    return (
                        <button
                            key={interval}
                            className={`signal ${signal ? "signal-on" : ""} ${selected === interval ? "signal-selected" : ""}`}
                            onClick={() => onSelect(interval)}
                            type="button"
                        >
                            {interval}
                        </button>
                    )
                })}

                <span className="signals-summary">
                    {activeSignals.length > 0
                        ? `${activeSignals.length} timeframe${activeSignals.length > 1 ? "s" : ""} in zone: ${activeSignals.join(", ")}`
                        : "No active signal"}
                </span>

                {updatedAt && (
                    <span className="updated">updated {formatClock(new Date(updatedAt))}</span>
                )}
            </section>

            <section className="panel">
                <div className="panel-head">
                    <h2>
                        {symbol} · {TITLES[selected]}
                        {selectedAnalysis?.signal === 1 && <span className="badge">SIGNAL</span>}
                    </h2>

                    <div className="legend">
                        {[
                            { key: "main", label: "Strongest Zone", color: COLORS.main },
                            { key: "above", label: "Upper Zone", color: COLORS.above },
                            { key: "below", label: "Lower Zone", color: COLORS.below }
                        ].map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={`legend-item ${visible[item.key] ? "" : "legend-off"}`}
                                onClick={() => toggleZone(item.key)}
                            >
                                <span className="swatch" style={{ background: item.color }} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="panel-body">
                    <div className="chart-wrap">
                        <SRChart
                            rows={selectedRows}
                            interval={selected}
                            analysis={selectedAnalysis}
                            visible={visible}
                            height={420}
                        />
                    </div>

                    <aside className="stats">
                        <div className="stat-title">STRONGEST ZONE</div>

                        <Row label="High" value={formatPrice(selectedAnalysis?.main?.high)} />
                        <Row label="Center" value={formatPrice(selectedAnalysis?.main?.center)} />
                        <Row label="Low" value={formatPrice(selectedAnalysis?.main?.low)} />
                        <Row label="Closes" value={selectedAnalysis?.main?.count ?? "-"} />
                        <Row
                            label="Density"
                            value={selectedAnalysis?.main
                                ? `${selectedAnalysis.main.strength.toFixed(2)}%`
                                : "-"}
                        />

                        <div className="stat-title">CURRENT</div>

                        <Row
                            label="Price"
                            value={formatPrice(selectedAnalysis?.current)}
                            accent={COLORS.current}
                        />
                        <Row
                            label="Upper Zone"
                            value={selectedAnalysis?.above
                                ? `${formatPrice(selectedAnalysis.above.low)} – ${formatPrice(selectedAnalysis.above.high)}`
                                : "-"}
                            accent={COLORS.above}
                        />
                        <Row
                            label="Lower Zone"
                            value={selectedAnalysis?.below
                                ? `${formatPrice(selectedAnalysis.below.low)} – ${formatPrice(selectedAnalysis.below.high)}`
                                : "-"}
                            accent={COLORS.below}
                        />
                    </aside>
                </div>
            </section>

            <section className="grid">
                {INTERVALS.map(interval => {
                    const rows = data?.[interval]?.rows
                    const analysis = analyses[interval]
                    const signal = analysis?.signal === 1 && SIGNAL_TIMEFRAMES.includes(interval)

                    return (
                        <button
                            key={interval}
                            type="button"
                            className={`card ${selected === interval ? "card-selected" : ""}`}
                            onClick={() => onSelect(interval)}
                        >
                            <div className="card-head">
                                <span>{TITLES[interval]}</span>
                                {signal && <span className="dot" />}
                                <span className="card-price">{formatPrice(analysis?.current)}</span>
                            </div>

                            {data?.[interval]?.error
                                ? <div className="chart-empty">DATA ERROR</div>
                                : <SRChart
                                    rows={rows}
                                    interval={interval}
                                    analysis={analysis}
                                    compact
                                    height={132}
                                />}
                        </button>
                    )
                })}
            </section>
        </>
    )
}

function Row({ label, value, accent }) {
    return (
        <div className="stat-row">
            <span className="stat-label">{label}</span>
            <span className="stat-value" style={accent ? { color: accent } : undefined}>{value}</span>
        </div>
    )
}
