import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base: the same build runs inside the Android app and on any static host.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') },
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5175 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
