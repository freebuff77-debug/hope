import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.1.0') },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.png'],
      manifest: {
        name: 'Maalun: Catatan Keuangan',
        short_name: 'Maalun',
        description: 'Catat pengeluaran, pemasukan, anggaran, dan tagihan. Gratis selamanya.',
        lang: 'id',
        theme_color: '#0a47e0',
        background_color: '#f3f6fc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 5173 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
