import {
    Brush,
    CartesianGrid,
    Line,
    LineChart,
    ReferenceArea,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts"

import { COLORS } from "../constants.js"
import { formatPrice, formatTime } from "../format.js"

function buildDomain(rows, zones) {
    let min = Infinity
    let max = -Infinity

    for (const row of rows) {
        if (row.close < min) min = row.close
        if (row.close > max) max = row.close
    }

    for (const zone of zones) {
        if (!zone) continue
        if (zone.low < min) min = zone.low
        if (zone.high > max) max = zone.high
    }

    const padding = (max - min) * 0.04 || max * 0.01 || 1

    return [min - padding, max + padding]
}

function ChartTooltip({ active, payload, label, interval }) {
    if (!active || !payload?.length) {
        return null
    }

    return (
        <div className="tooltip">
            <div className="tooltip-time">{formatTime(label, interval)}</div>
            <div className="tooltip-price">{formatPrice(payload[0].value)}</div>
        </div>
    )
}

/**
 * Price line plus density zones.
 * compact=true draws the axis-less variant used by the mini grid.
 */
export default function SRChart({
    rows,
    interval,
    analysis,
    visible = { main: true, above: true, below: true },
    compact = false,
    height = 420
}) {
    if (!rows?.length || !analysis) {
        return <div className="chart-empty">NO DATA</div>
    }

    const zones = [
        visible.main ? analysis.main : null,
        visible.above ? analysis.above : null,
        visible.below ? analysis.below : null
    ]

    const domain = buildDomain(rows, zones)

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart
                data={rows}
                margin={compact
                    ? { top: 4, right: 6, bottom: 4, left: 6 }
                    : { top: 10, right: 16, bottom: 4, left: 8 }}
            >
                <CartesianGrid stroke="#26303f" strokeDasharray="2 4" vertical={!compact} />

                <XAxis
                    dataKey="timestamp"
                    hide={compact}
                    tick={{ fill: "#7f8ea3", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#26303f" }}
                    minTickGap={40}
                    tickFormatter={value => formatTime(value, interval)}
                />

                <YAxis
                    domain={domain}
                    hide={compact}
                    width={78}
                    orientation="right"
                    tick={{ fill: "#7f8ea3", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#26303f" }}
                    tickFormatter={formatPrice}
                />

                {visible.above && analysis.above && (
                    <ReferenceArea
                        y1={analysis.above.low}
                        y2={analysis.above.high}
                        fill={COLORS.above}
                        fillOpacity={0.18}
                        ifOverflow="extendDomain"
                    />
                )}

                {visible.below && analysis.below && (
                    <ReferenceArea
                        y1={analysis.below.low}
                        y2={analysis.below.high}
                        fill={COLORS.below}
                        fillOpacity={0.18}
                        ifOverflow="extendDomain"
                    />
                )}

                {visible.main && analysis.main && (
                    <ReferenceArea
                        y1={analysis.main.low}
                        y2={analysis.main.high}
                        fill={COLORS.main}
                        fillOpacity={0.26}
                        stroke={COLORS.main}
                        strokeOpacity={0.5}
                        ifOverflow="extendDomain"
                    />
                )}

                {visible.main && analysis.main && !compact && (
                    <ReferenceLine
                        y={analysis.main.center}
                        stroke={COLORS.below}
                        strokeDasharray="6 3"
                        strokeWidth={1.2}
                    />
                )}

                <ReferenceLine
                    y={analysis.current}
                    stroke={COLORS.current}
                    strokeDasharray="5 4"
                    strokeWidth={compact ? 1 : 1.4}
                    label={compact ? undefined : {
                        value: formatPrice(analysis.current),
                        position: "insideTopRight",
                        fill: COLORS.current,
                        fontSize: 11
                    }}
                />

                <Line
                    type="monotone"
                    dataKey="close"
                    stroke={COLORS.price}
                    strokeWidth={compact ? 1 : 1.6}
                    dot={false}
                    isAnimationActive={false}
                />

                {!compact && (
                    <Tooltip
                        content={<ChartTooltip interval={interval} />}
                        cursor={{ stroke: "#5b6b83", strokeDasharray: "3 3" }}
                    />
                )}

                {!compact && (
                    <Brush
                        dataKey="timestamp"
                        height={26}
                        travellerWidth={8}
                        stroke="#3a4757"
                        fill="#131a24"
                        tickFormatter={value => formatTime(value, interval)}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    )
}
