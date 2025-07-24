import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // ✅ Ensures correct asset paths in production
  plugins: [react()],
})
