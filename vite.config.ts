import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dedicated development origin keeps Social Fairways browser data
// separate from the Ramsdale Seniors Event Desk localhost origin.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5186,
    strictPort: true,
  },
  preview: {
    host: 'localhost',
    port: 5187,
    strictPort: true,
  },
})
