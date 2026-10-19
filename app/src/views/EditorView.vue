<script setup lang="ts">
// 主画面: カード一覧＋依頼文（ui-and-nonfunctional.md §1・§3）。
// ヘッダーに「新規」（判断ポイント52）。保存・読込・プロファイルは U4d
import { computed, ref, useTemplateRef } from 'vue'
import ConfirmReplaceDialog from '@/components/ConfirmReplaceDialog.vue'
import RequestTextArea from '@/components/editor/RequestTextArea.vue'
import SongCard from '@/components/editor/SongCard.vue'
import { useSongEditor } from '@/composables/useSongEditor'
import { visibleCards } from '@/domain/editor/cards'

const editor = useSongEditor()
const cards = computed(() => visibleCards(editor.request.value))

const confirmNew = ref(false)

const requestArea = useTemplateRef<HTMLElement>('requestArea')
// 依頼文は常に最新のため、ボタンは「依頼文の位置へ移る」（§3）
function showRequest() {
  requestArea.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <UDashboardPanel id="editor">
    <template #header>
      <UDashboardNavbar title="依頼文の組み立て">
        <template #right>
          <span class="hidden text-sm text-muted sm:inline" data-testid="tool-label">
            対象ツール: Suno {{ editor.request.value.toolVersion }}
          </span>
          <UButton
            label="新規"
            color="neutral"
            variant="outline"
            data-testid="new-song"
            @click="confirmNew = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-3xl space-y-4">
        <SongCard
          v-for="card in cards"
          :key="card.id"
          :card="card"
          :request="editor.request.value"
          :incomplete="editor.incomplete.value"
        />
        <UButton
          block
          size="lg"
          label="以上の設定を元にチャット系AIに渡す依頼文を表示する"
          data-testid="show-request"
          @click="showRequest"
        />
        <div ref="requestArea" class="scroll-mt-4">
          <RequestTextArea :generated="editor.generated.value" />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <ConfirmReplaceDialog
    v-model:open="confirmNew"
    title="新規に作り直しますか"
    confirm-label="破棄して新規"
    @confirm="editor.resetToInitial()"
  />
</template>
