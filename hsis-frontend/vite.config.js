import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['32ca-49-47-219-228.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'https://7202-106-195-35-55.ngrok-free.app',
        changeOrigin: true
      }
    }
  }
})
