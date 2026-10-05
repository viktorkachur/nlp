import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' — щоб збірка працювала з будь-якого підкаталогу (GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react()],
})
