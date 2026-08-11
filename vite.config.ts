import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { experimentApiPlugin } from './vite.experimentApi.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expose non-VITE_ secrets (DATABASE_URL, etc.) to the Vite server API plugin.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] == null) process.env[key] = value
  }

  return {
    plugins: [react(), tailwindcss(), experimentApiPlugin()],
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
  }
})
