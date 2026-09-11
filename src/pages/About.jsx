import { useMemo } from "react"

import SRChart from "../components/SRChart.jsx"
import { analyzeInterval } from "../analysis.js"
import { COLORS, SIGNAL_TIMEFRAMES } from "../constants.js"
import { exampleRows } from "../exampleData.js"
import { formatPrice } from "../format.js"

const ZONES = [
    {
        color: COLORS.main,
        title: "Orange band — strongest zone",
        text: "The price band where this market spent the most time. Signals are based on this band."
    },
    {
        color: COLORS.above,
        title: "Green band — upper zone",
        text: "The busiest area above the current price. Often the next place price stalls on the way up."
    },
    {
        color: COLORS.below,
        title: "Purple band — lower zone",
        text: "The busiest area below the current price. Often the next place price slows on the way down."
    },
    {
        color: COLORS.current,
        title: "Red dashed line — right now",
        text: "The latest price. When it sits on the orange band, the pair is flagged as a signal."
    }
]

const FAQ = [
    {
        q: "Do I need an account or API key?",
        a: "No. The site only reads public market data. It cannot see your balances, cannot place orders, and never asks for credentials."
    },
    {
        q: "Is anything I do here stored?",
        a: "No. Every calculation runs in your browser. There is no server, no account, and no tracking of what you look at."
    },
    {
        q: "Why did a signal disappear after I opened it?",
        a: "Zones are recalculated from the candles currently loaded. A new candle, or a different candle count, can shift the band just enough for price to fall outside it. Signals are a snapshot, not a standing state."
    },
    {
        q: "Which timeframe should I look at?",
        a: "Shorter timeframes react faster and change more often; longer ones move slowly but their zones are built from more history. Looking for the same zone on more than one timeframe is usually more telling than any single one."
    },
    {
        q: "What is the countdown next to the controls?",
        a: "The seconds until the next automatic refresh. Next to it, a small bar shows how much of the exchange's per-minute request budget has been used, so heavy use stays visible."
    },
    {
        q: "Why does a chart sometimes say DATA ERROR?",
        a: "That timeframe's request failed or the symbol has too little history. The other timeframes keep working — the next refresh usually fills it in."
    }
]

export default function About() {
    // Fixed sample series, so the numbers in the story below always match
    // the chart beside it.
    const example = useMemo(() => {
        const rows = exampleRows()

        return { rows, analysis: analyzeInterval(rows) }
    }, [])

    const { main, current } = example.analysis
    const offset = ((current - main.center) / main.center) * 100

    return (
        <article className="about">
            <section className="about-hero">
                <h2>What this site is</h2>

                <p className="lead">
                    A map of the price levels that actually matter on Binance futures. For any pair, it
                    highlights the price bands where the market has spent the most time — the levels
                    price keeps returning to — and tells you when price is sitting on one of them
                    right now.
                </p>

                <p>
                    Think of it as a chart that has already marked the busy areas for you, across nine
                    timeframes at once. It reads public market data only: no account, no API key, no
                    orders, nothing to sign up for.
                </p>
            </section>

            <section className="about-section">
                <h3>How to use it</h3>

                <ol className="steps">
                    <li>
                        <span className="step-index">1</span>
                        <div>
                            <strong>Start on the Dashboard with one pair.</strong> Type a symbol in the
                            box — the list underneath suggests the busiest markets as you type. The big
                            chart shows your selected timeframe; the nine small charts below show the
                            same pair on every other timeframe. Click any of them to bring it up top.
                        </div>
                    </li>

                    <li>
                        <span className="step-index">2</span>
                        <div>
                            <strong>Read where price sits.</strong> The coloured bands are the busy
                            areas, the red dashed line is the current price. The panel on the right
                            gives the exact bounds of the strongest band and how much of the recent
                            history landed inside it. Drag the bar under the chart to zoom into a
                            period, and use the legend buttons to hide bands you don't want to see.
                        </div>
                    </li>

                    <li>
                        <span className="step-index">3</span>
                        <div>
                            <strong>Use the Signals tab to find candidates.</strong> Instead of checking
                            pairs one by one, it scans the most traded symbols and shows a card for
                            every pair currently sitting on its strongest band — one card per symbol and
                            timeframe, for example <em>BTCUSDT 5m</em>. Filter by timeframe with the
                            chips, and click a card to open that exact pair on the Dashboard.
                        </div>
                    </li>

                    <li>
                        <span className="step-index">4</span>
                        <div>
                            <strong>Keep it fresh, or don't.</strong> Both pages refresh on their own
                            while <em>Auto</em> is ticked, and the countdown shows when. Untick it to
                            freeze the view, or press Refresh / Scan now yourself. Refreshing pauses
                            automatically while this tab is in the background.
                        </div>
                    </li>
                </ol>
            </section>

            <section className="about-section">
                <h3>Reading a chart</h3>

                <div className="zone-legend">
                    {ZONES.map(zone => (
                        <div className="zone-legend-item" key={zone.title}>
                            <span className="swatch swatch-lg" style={{ background: zone.color }} />
                            <div>
                                <strong>{zone.title}</strong>
                                <p>{zone.text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="muted-note">
                    How the bands are found, in one sentence: recent closing prices are sorted into 20
                    equal slices of the price range, and the fullest slice becomes the strongest zone.
                    A signal is raised when price returns to that slice. Signals are checked on{" "}
                    {SIGNAL_TIMEFRAMES.join(", ")}; charts are drawn for those plus 4h, 12h and 1d.
                </p>
            </section>

            <section className="about-section">
                <h3>A worked example</h3>

                <p>
                    Here is one signal from end to end. The chart is sample data rather than a live
                    market, but every number below is taken from it — this is exactly what the site
                    would show you.
                </p>

                <div className="example">
                    <div className="signal-card signal-card-static">
                        <div className="signal-card-head">
                            <span className="signal-card-symbol">BTCUSDT</span>
                            <span className="signal-card-tf">5m</span>
                            <span className="signal-card-price">{formatPrice(current)}</span>
                        </div>

                        <SRChart
                            rows={example.rows}
                            interval="5m"
                            analysis={example.analysis}
                            compact
                            height={104}
                        />

                        <div className="signal-card-stats">
                            <span className="tag tag-in">in zone</span>
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
                    </div>

                    <div className="example-chart">
                        <SRChart
                            rows={example.rows}
                            interval="5m"
                            analysis={example.analysis}
                            height={240}
                        />
                    </div>
                </div>

                <ol className="steps">
                    <li>
                        <span className="step-index">1</span>
                        <div>
                            <strong>It appears on the Signals page.</strong> The card on the left says
                            BTCUSDT is sitting in its strongest band on the 5m timeframe. The band runs{" "}
                            {formatPrice(main.low)} – {formatPrice(main.high)}, and the density figure
                            says {main.strength.toFixed(1)}% of the last 200 closes happened inside that
                            narrow strip. Price is {formatPrice(current)} — back inside it.
                        </div>
                    </li>

                    <li>
                        <span className="step-index">2</span>
                        <div>
                            <strong>You click it and land on the Dashboard.</strong> The large chart is
                            the same market with room to look around. The orange band is that strip. You
                            can see price left it twice — once falling away, once pushing above — and
                            came back both times. That is what a level people care about looks like.
                        </div>
                    </li>

                    <li>
                        <span className="step-index">3</span>
                        <div>
                            <strong>You glance at the other timeframes.</strong> The nine mini charts
                            below show whether 15m or 1h mark a band in roughly the same place. When
                            several timeframes agree on one area, it is a more meaningful level than one
                            that only the 5m chart sees.
                        </div>
                    </li>

                    <li>
                        <span className="step-index">4</span>
                        <div>
                            <strong>Then it is over to you.</strong> The site has told you one thing:
                            price is back at an area that mattered before. It has no view on whether the
                            band holds or breaks, and no view on direction. If price drifts away, the
                            card simply disappears at the next scan.
                        </div>
                    </li>
                </ol>
            </section>

            <section className="about-section">
                <h3>What a signal means</h3>

                <div className="about-columns">
                    <div className="about-col">
                        <h4>It means</h4>
                        <ul>
                            <li>Price is back in the band where it previously spent the most time.</li>
                            <li>That band is worth a look on the chart.</li>
                            <li>The condition is true right now, on that one timeframe.</li>
                        </ul>
                    </div>

                    <div className="about-col">
                        <h4>It does not mean</h4>
                        <ul>
                            <li>A direction — the rule is symmetric and says nothing about up or down.</li>
                            <li>An entry, exit, target or stop. There is no position logic in this app.</li>
                            <li>A tested edge. No backtest, win rate or performance claim is made.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="about-section">
                <h3>Good to know</h3>

                <dl className="faq">
                    {FAQ.map(item => (
                        <div className="faq-item" key={item.q}>
                            <dt>{item.q}</dt>
                            <dd>{item.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="disclaimer" id="disclaimer">
                <h3>Disclaimer</h3>

                <p>
                    <strong>This site is provided for general informational and educational purposes
                    only. It is not investment, financial, trading, legal, or tax advice, and it is not
                    a recommendation, offer, or solicitation to buy or sell any asset.</strong>
                </p>

                <p>
                    Nothing displayed here should be relied upon to make any financial decision. The
                    signals, zones, and statistics are the output of a simple, publicly described
                    calculation over historical prices. They carry no predictive claim, have not been
                    validated for profitability, and past price behaviour does not indicate future
                    results.
                </p>

                <p>
                    Trading cryptocurrency derivatives carries a high level of risk, including the total
                    loss of deposited funds, and is not suitable for every person. You are solely
                    responsible for your own decisions and for complying with the laws and regulations
                    that apply where you live. Consider seeking advice from an independent, licensed
                    professional before acting on any market information.
                </p>

                <p>
                    Market data is retrieved from third-party public endpoints and is provided
                    <strong> “as is” and “as available”</strong>, without warranty of any kind, express
                    or implied, including accuracy, completeness, timeliness, merchantability, or
                    fitness for a particular purpose. Data may be delayed, interrupted, or wrong. To the
                    fullest extent permitted by law, the authors and contributors of this software
                    accept no liability for any loss or damage — direct, indirect, incidental,
                    consequential, or otherwise — arising from its use or from reliance on anything it
                    displays.
                </p>

                <p>
                    This project is an independent, open-source tool. It is not affiliated with,
                    endorsed by, sponsored by, or connected to Binance or any exchange, and all
                    trademarks belong to their respective owners.
                </p>
            </section>
        </article>
    )
}
