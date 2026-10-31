import { createRouter, createWebHashHistory } from 'vue-router'
import EditorView from '@/views/EditorView.vue'

// ハッシュ方式。base: './' のサブパス配信でも、再読み込みで壊れない（U0 の決定 C）。
// 主画面と辞典設定（U4e）、プロファイル管理（判断ポイント67。ポップアップを置き換えた）
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'editor', component: EditorView },
    // 辞典設定は、主画面の最初の読み込みを軽くするため、別のファイルに分けて読む
    // プロファイル管理（ヘッダーの［プロファイル］で移る）。辞典設定と同じく別のファイルに分けて読む
    {
      path: '/profiles',
      name: 'profiles',
      component: () => import('@/views/ProfilesView.vue'),
    },
    {
      path: '/dictionary',
      name: 'dictionary',
      component: () => import('@/views/DictionaryView.vue'),
    },
  ],
})

export default router
