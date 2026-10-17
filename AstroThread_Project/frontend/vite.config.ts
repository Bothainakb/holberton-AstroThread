import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Flask API is served under the same origin as the app, so the login
// session cookie is first-party. Set API_PROXY_TARGET if Flask runs elsewhere.
const apiProxy = {
  '/api': { target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5000', changeOrigin: true },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
