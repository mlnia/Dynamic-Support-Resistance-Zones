// Direct counterparts of the constants in the Python module.

export const INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "12h", "1d"]

export const TITLES = {
    "1m": "1 Minute",
    "3m": "3 Minutes",
    "5m": "5 Minutes",
    "15m": "15 Minutes",
    "30m": "30 Minutes",
    "1h": "1 Hour",
    "4h": "4 Hours",
    "12h": "12 Hours",
    "1d": "1 Day"
}

// Signals are computed only for these timeframes.
export const SIGNAL_TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1h"]

export const APPROACH_LOOKBACK = 30

export const BINS = 20

export const COLORS = {
    price: "#4aa3ff",
    main: "#ff9f2e",     // strongest zone
    above: "#25c26e",    // densest zone above current price
    below: "#a855f7",    // densest zone below current price
    current: "#ef4444"   // current price
}
