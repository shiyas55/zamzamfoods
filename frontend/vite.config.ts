import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // Development server configuration
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      // In development, proxy /api calls to the local Django server.
      // In production (Vercel), VITE_API_URL is used directly — no proxy needed.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // No source maps in production (avoids exposing source code)
    sourcemap: false,
  },
})
