import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Avoid browser CORS flakes for holder / quote sources
      '/proxy/jup': {
        target: 'https://lite-api.jup.ag',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/proxy\/jup/, ''),
      },
      '/proxy/gecko': {
        target: 'https://api.geckoterminal.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/proxy\/gecko/, ''),
      },
    },
  },
})
