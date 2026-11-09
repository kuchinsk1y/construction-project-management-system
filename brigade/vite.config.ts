import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Brigade app (foremen's work log). Runs next to the ERP web app (5173) and uses the same API.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  preview: { port: 4174 },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
