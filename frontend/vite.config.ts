import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,
  },

  // Solution pour l'erreur "react-is" avec Recharts
  resolve: {
    alias: {
      'react-is': '/app/frontend/node_modules/react-is',
    },
  },

  build: {
    chunkSizeWarningLimit: 1000,
  },
})