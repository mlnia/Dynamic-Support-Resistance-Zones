import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// The dev server proxies /fapi to Binance so the browser
// never hits CORS or region restrictions.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/fapi": {
                target: "https://fapi.binance.com",
                changeOrigin: true,
                secure: true
            }
        }
    }
})
