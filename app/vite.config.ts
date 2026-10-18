import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// 仕様の JSON（design/v0/ が正）。アプリには写さず、ここから直接読む
const specDir = fileURLToPath(new URL('../design/v0/docs/specifications', import.meta.url))
// レンダリング例（依頼文の正解データ）と、その入力。テストだけが読む
const examplesDir = fileURLToPath(new URL('../design/v0/docs/examples', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // 相対パス。GitHub Pages とローカル IIS のどちらのサブパスにも、同じビルドで置ける（R-09）
  base: './',
  plugins: [vue(), ui(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@spec': specDir,
      '@examples': examplesDir,
    },
  },
  server: {
    fs: {
      // app/ の外にある仕様の JSON（と、テストが読むレンダリング例）を、開発サーバから読めるようにする
      allow: [fileURLToPath(new URL('./', import.meta.url)), specDir, examplesDir],
    },
  },
})
