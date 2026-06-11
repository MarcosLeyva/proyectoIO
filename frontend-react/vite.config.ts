import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../frontend/dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/grafico': 'http://localhost:8000',
      '/simplex': 'http://localhost:8000',
      '/transporte': 'http://localhost:8000',
      '/hungaro': 'http://localhost:8000',
      '/cpm': 'http://localhost:8000',
      '/decisiones': 'http://localhost:8000',
    }
  }
})
