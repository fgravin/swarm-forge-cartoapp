import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // MapLibre GL JS alone is about 1 MB minified.
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      // ogc-client loads OpenLayers and proj4, its optional peer dependencies, only
      // for WMTS tile grids, which the application never asks for. They are not
      // installed: leave them out of the build rather than fail on their imports.
      external: [/^ol(\/|$)/, /^proj4$/],
    },
  },
})
