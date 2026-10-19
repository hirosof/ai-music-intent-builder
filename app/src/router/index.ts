import { createRouter, createWebHashHistory } from 'vue-router'
import EditorView from '@/views/EditorView.vue'

// ハッシュ方式。base: './' のサブパス配信でも、再読み込みで壊れない（U0 の決定 C）。
// 主画面と辞典設定（U4e）の2つ（U4 の決定 J2）
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'editor', component: EditorView },
    // 辞典設定は、主画面の最初の読み込みを軽くするため、別のファイルに分けて読む
    {
      path: '/dictionary',
      name: 'dictionary',
      component: () => import('@/views/DictionaryView.vue'),
    },
  ],
})

export default router
