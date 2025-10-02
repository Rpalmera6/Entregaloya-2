// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',     // <-- importante para GitHub Pages (usa rutas relativas)
  plugins: [react()],
})