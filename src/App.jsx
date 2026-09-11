import { useCallback, useEffect, useState } from "react"

import About from "./pages/About.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Signals from "./pages/Signals.jsx"

const ROUTES = [
    { key: "dashboard", label: "Dashboard" },
    { key: "signals", label: "Signals" },
    { key: "about", label: "About" }
]

function readRoute() {
    const key = window.location.hash.replace(/^#\/?/, "")

    return ROUTES.some(route => route.key === key) ? key : "dashboard"
}

export default function App() {
    const [route, setRoute] = useState(readRoute)

    const [symbol, setSymbol] = useState("BTCUSDT")
    const [selected, setSelected] = useState("15m")

    // Hash routing keeps both views linkable without pulling in a router.
    useEffect(() => {
        const onHashChange = () => setRoute(readRoute())

        window.addEventListener("hashchange", onHashChange)

        return () => window.removeEventListener("hashchange", onHashChange)
    }, [])

    const navigate = useCallback(key => {
        window.location.hash = `#/${key}`
        setRoute(key)
        window.scrollTo({ top: 0 })
    }, [])

    const selectSymbol = useCallback(next => {
        if (next) setSymbol(next)
    }, [])

    // A signal card opens that exact pair on the dashboard.
    const openPair = useCallback((nextSymbol, nextInterval) => {
        setSymbol(nextSymbol)
        setSelected(nextInterval)
        navigate("dashboard")
    }, [navigate])

    return (
        <div className="app">
            <header className="header">
                <div className="brand">
                    <h1>Dynamic S/R Zones</h1>
                    <span className="brand-sub">Binance Futures · price density clusters</span>
                </div>

                <nav className="nav">
                    {ROUTES.map(item => (
                        <button
                            key={item.key}
                            type="button"
                            className={`nav-item ${route === item.key ? "nav-item-active" : ""}`}
                            onClick={() => navigate(item.key)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </header>

            {route === "about" && <About />}

            {route === "signals" && <Signals onOpen={openPair} />}

            {route === "dashboard" && (
                <Dashboard
                    symbol={symbol}
                    onSymbolChange={selectSymbol}
                    selected={selected}
                    onSelect={setSelected}
                />
            )}

            {/* Shown on every page — the full text lives on the About page. */}
            <footer className="footer">
                <span>
                    <strong>Informational and educational use only — not investment advice.</strong>{" "}
                    Signals are the output of a simple historical-price calculation, carry no predictive
                    claim, and must not be relied upon for financial decisions. Market data comes from
                    Binance public endpoints “as is”, may be delayed or inaccurate, and this project is
                    not affiliated with or endorsed by any exchange. Trading carries risk of total loss.
                </span>

                <button type="button" className="footer-link" onClick={() => navigate("about")}>
                    Read the full disclaimer
                </button>
            </footer>
        </div>
    )
}
