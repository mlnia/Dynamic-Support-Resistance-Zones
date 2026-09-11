export function formatPrice(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "-"
    }

    const abs = Math.abs(value)
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6

    return value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    })
}

export function formatCompact(value) {
    if (!Number.isFinite(value)) {
        return "-"
    }

    return value.toLocaleString("en-US", {
        notation: "compact",
        maximumFractionDigits: 1
    })
}

export function formatTime(timestamp, interval) {
    const date = new Date(timestamp)
    const long = ["4h", "12h", "1d"].includes(interval)

    return date.toLocaleString("en-US", long
        ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }
        : { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function formatClock(date) {
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    })
}
