<script setup lang="ts">
// 主画面: カード一覧＋依頼文（ui-and-nonfunctional.md §1・§3）。
// ヘッダーに「新規」（判断ポイント52）。保存・読込・プロファイルは U4d。カードの「変更」でポップアップ（U4b）
import { computed, ref, useTemplateRef } from 'vue'
import ConfirmReplaceDialog from '@/components/ConfirmReplaceDialog.vue'
import CardEditor from '@/components/editor/CardEditor.vue'
import RequestTextArea from '@/components/editor/RequestTextArea.vue'
import SongCard from '@/components/editor/SongCard.vue'
import { useSongEditor } from '@/composables/useSongEditor'
import { visibleCards, type CardDef } from '@/domain/editor/cards'

const editor = useSongEditor()
const cards = computed(() => visibleCards(editor.request.value))

const confirmNew = ref(false)

// 開いているポップアップのカード
const editing = ref<CardDef | null>(null)
const editorOpen = computed({
  get: () => editing.value !== null,
  set: (v) => {
    if (!v) editing.value = null
  },
})

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
          :request="editor.savedSong.value.requests[0]!"
          :incomplete="editor.incomplete.value"
          @edit="editing = card"
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

  <CardEditor
    v-if="editing"
    v-model:open="editorOpen"
    :card="editing"
    :request="editor.request.value"
    :scope-request="editor.savedSong.value.requests[0]!"
  />

  <ConfirmReplaceDialog
    v-model:open="confirmNew"
    title="新規に作り直しますか"
    confirm-label="破棄して新規"
    @confirm="editor.resetToInitial()"
  />
</template>
