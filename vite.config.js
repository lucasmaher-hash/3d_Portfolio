import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        gallery: resolve(import.meta.dirname, 'gallery.html'),
        galleryOriginal: resolve(import.meta.dirname, 'gallery-original.html'),
        galleryBaked: resolve(import.meta.dirname, 'gallery-baked.html'),
        gallery1: resolve(import.meta.dirname, 'gallery-1.html'),
        gallery2: resolve(import.meta.dirname, 'gallery-2.html'),
        gallery3: resolve(import.meta.dirname, 'gallery-3.html'),
        gallery4: resolve(import.meta.dirname, 'gallery-4.html'),
        galleryColourCheck: resolve(import.meta.dirname, 'gallery-colour-check.html'),
      },
    },
  },
})
