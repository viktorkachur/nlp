import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// У режимі розробки запити /api проксуються на локальний FastAPI-сервер (порт 8000);
// у продакшені фронтенд і API віддає один і той самий сервер, тому CORS не потрібен.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
