import { useEffect, useMemo, useRef, useState } from "react"

import { fetchSymbols } from "../api.js"
import { formatCompact, formatPrice } from "../format.js"

const MAX_RESULTS = 8

/**
 * Ranks symbols for a query: exact match, then prefix matches,
 * then substring matches — each group already volume-sorted.
 */
function filterSymbols(symbols, query) {
    if (!query) {
        return symbols.slice(0, MAX_RESULTS)
    }

    const exact = []
    const prefix = []
    const partial = []

    for (const entry of symbols) {
        if (entry.symbol === query) exact.push(entry)
        else if (entry.symbol.startsWith(query)) prefix.push(entry)
        else if (entry.symbol.includes(query)) partial.push(entry)

        if (exact.length + prefix.length >= MAX_RESULTS) break
    }

    return [...exact, ...prefix, ...partial].slice(0, MAX_RESULTS)
}

function Highlight({ text, query }) {
    const index = query ? text.indexOf(query) : -1

    if (index === -1) {
        return text
    }

    return (
        <>
            {text.slice(0, index)}
            <mark>{text.slice(index, index + query.length)}</mark>
            {text.slice(index + query.length)}
        </>
    )
}

export default function SymbolPicker({ value, onSelect }) {
    const [query, setQuery] = useState(value)
    const [symbols, setSymbols] = useState([])
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)

    const wrapRef = useRef(null)
    const listRef = useRef(null)

    useEffect(() => {
        setQuery(value)
    }, [value])

    useEffect(() => {
        let cancelled = false

        fetchSymbols()
            .then(list => {
                if (!cancelled) setSymbols(list)
            })
            .catch(() => {
                // Picker degrades to a plain text input if the list fails.
            })

        return () => { cancelled = true }
    }, [])

    // Close when the click lands outside the picker.
    useEffect(() => {
        if (!open) return

        function onPointerDown(event) {
            if (!wrapRef.current?.contains(event.target)) {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", onPointerDown)

        return () => document.removeEventListener("mousedown", onPointerDown)
    }, [open])

    const matches = useMemo(
        () => filterSymbols(symbols, query.trim().toUpperCase()),
        [symbols, query]
    )

    // Keep the highlighted row in view while arrowing through the list.
    useEffect(() => {
        listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
    }, [active, open])

    function commit(symbol) {
        setQuery(symbol)
        setOpen(false)
        setActive(0)
        onSelect(symbol)
    }

    function onChange(event) {
        setQuery(event.target.value.toUpperCase())
        setOpen(true)
        setActive(0)
    }

    function onKeyDown(event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()

            if (!open) {
                setOpen(true)
                return
            }

            if (matches.length === 0) return

            const step = event.key === "ArrowDown" ? 1 : -1

            setActive((active + step + matches.length) % matches.length)
            return
        }

        if (event.key === "Enter") {
            event.preventDefault()

            const picked = open && matches[active]

            commit(picked ? picked.symbol : query.trim().toUpperCase())
            return
        }

        if (event.key === "Escape") {
            setOpen(false)
            setActive(0)
        }
    }

    return (
        <div className="picker" ref={wrapRef}>
            <input
                className="symbol-input"
                value={query}
                onChange={onChange}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="BTCUSDT"
                spellCheck={false}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls="symbol-listbox"
                aria-autocomplete="list"
                aria-activedescendant={open && matches[active] ? `symbol-${matches[active].symbol}` : undefined}
            />

            {open && (
                <ul className="picker-list" id="symbol-listbox" role="listbox" ref={listRef}>
                    {matches.length === 0 && (
                        <li className="picker-empty">
                            {symbols.length === 0 ? "Loading symbols…" : "No match"}
                        </li>
                    )}

                    {matches.map((entry, index) => (
                        <li
                            key={entry.symbol}
                            id={`symbol-${entry.symbol}`}
                            role="option"
                            aria-selected={index === active}
                            className={`picker-item ${index === active ? "picker-item-active" : ""}`}
                            onMouseEnter={() => setActive(index)}
                            // mousedown fires before blur, so the click always lands.
                            onMouseDown={event => {
                                event.preventDefault()
                                commit(entry.symbol)
                            }}
                        >
                            <span className="picker-symbol">
                                <Highlight text={entry.symbol} query={query.trim().toUpperCase()} />
                            </span>

                            <span className="picker-volume">{formatCompact(entry.volume)}</span>

                            <span className="picker-price">{formatPrice(entry.price)}</span>

                            <span className={`picker-change ${entry.change >= 0 ? "up" : "down"}`}>
                                {entry.change >= 0 ? "+" : ""}{entry.change.toFixed(2)}%
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
