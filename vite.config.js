import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        galleryBaked: resolve(import.meta.dirname, 'gallery-baked.html'),
        gallery1: resolve(import.meta.dirname, 'gallery-1.html'),
        gallery4: resolve(import.meta.dirname, 'gallery-4.html'),
        galleryColourCheck: resolve(import.meta.dirname, 'gallery-colour-check.html'),
      },
    },
  },
})
