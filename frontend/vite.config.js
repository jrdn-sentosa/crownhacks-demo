import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Minimal Vite config: just enable React.
export default defineConfig({
  plugins: [react()],
})
