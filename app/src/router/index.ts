import { createRouter, createWebHashHistory } from 'vue-router'

// ハッシュ方式。base: './' のサブパス配信でも、再読み込みで壊れない（U0 の決定 C）
const router = createRouter({
  history: createWebHashHistory(),
  routes: [],
})

export default router
