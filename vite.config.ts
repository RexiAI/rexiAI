import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Local dev: forward /api/* to scripts/dev-api-server.mjs (run it on :3000
      // with `npx -y tsx scripts/dev-api-server.mjs`). In production Vercel serves
      // these as serverless functions; the proxy mirrors that under `vite dev` so
      // the SPA can call its own backend (e.g. GET /api/config for free mode).
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['node_modules', '.standards/**', 'dist/**', '.opencode/**'],
  },
})
