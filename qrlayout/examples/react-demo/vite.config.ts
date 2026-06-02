import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['qrcode', 'jsbarcode'],
    exclude: ['qrlayout-core', 'qrlayout-ui'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  resolve: {
    alias: {
      'qrcode/lib/browser.js': 'qrcode',
    },
  },
})
