import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue(), ui()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        element: resolve(import.meta.dirname, 'element.html'),
        vuetify: resolve(import.meta.dirname, 'vuetify.html'),
        nuxtui: resolve(import.meta.dirname, 'nuxtui.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    server: { deps: { inline: ['vuetify', '@nuxt/ui'] } },
    css: false,
  },
})
