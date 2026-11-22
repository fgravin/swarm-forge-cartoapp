import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // MapLibre GL JS alone is about 1 MB minified.
    chunkSizeWarningLimit: 1500,
  },
})
