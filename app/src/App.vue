<script setup lang="ts">
// 画面の枠（U4 の決定 J3）。サイドメニュー（主画面・辞典設定、カラーモード）と、画面。
// 起動時に自動保存を読み込み、読めなかったとき・警告があるときは知らせる（判断ポイント43、song-file.md 補完・仮定7）
import { onMounted } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { ja } from '@nuxt/ui/locale'
import { useSongEditor } from '@/composables/useSongEditor'

const editor = useSongEditor()
const toast = useToast()

onMounted(() => {
  editor.start()
  const r = editor.restored.value
  if (r?.status === 'discarded') {
    toast.add({
      title: '前回の編集内容を読み込めませんでした',
      description: '保存の形が合わないため、初期状態で始めます。',
      color: 'warning',
    })
  } else if (r?.status === 'ok' && r.warnings.length > 0) {
    toast.add({
      title: '前回の編集内容を読み込みました（注意があります）',
      description: r.warnings.join('\n'),
      color: 'warning',
    })
  }
})

const navItems = [
  { label: '依頼文の組み立て', to: '/' },
  { label: '辞典設定', to: '/dictionary' },
]
</script>

<template>
  <!-- Nuxt UI の部品の文言（閉じる・カラーモードの選択肢など）を日本語にする -->
  <UApp :locale="ja">
    <UDashboardGroup>
      <UDashboardSidebar collapsible :ui="{ footer: 'border-t border-default' }">
        <template #header>
          <span class="truncate font-semibold">AI Music Intent Builder</span>
        </template>
        <UNavigationMenu :items="navItems" orientation="vertical" data-testid="side-nav" />
        <template #footer>
          <!-- カラーモード（判断ポイント32）。保存キーは VueUse の既定のまま（判断ポイント47 の例外。U4e の決定 N1） -->
          <UColorModeSelect class="w-full" data-testid="color-mode" />
        </template>
      </UDashboardSidebar>
      <RouterView />
    </UDashboardGroup>
  </UApp>
</template>
