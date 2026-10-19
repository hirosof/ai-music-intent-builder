<script setup lang="ts">
// 主画面: カード一覧＋依頼文（ui-and-nonfunctional.md §1・§3）。カードの「変更」でポップアップ（U4b）。
// ヘッダー: ［新規］［保存］［書き出す］［読込］［プロファイル］（U4d の決定 M1）。スマホ幅では「…」のメニューにまとめる
import type { DropdownMenuItem } from '@nuxt/ui'
import { useFileDialog } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import ConfirmReplaceDialog from '@/components/ConfirmReplaceDialog.vue'
import CardEditor from '@/components/editor/CardEditor.vue'
import RequestTextArea from '@/components/editor/RequestTextArea.vue'
import SongCard from '@/components/editor/SongCard.vue'
import ImportDialog from '@/components/storage/ImportDialog.vue'
import ProfilesDialog from '@/components/storage/ProfilesDialog.vue'
import SaveDialog from '@/components/storage/SaveDialog.vue'
import { useSongEditor } from '@/composables/useSongEditor'
import { loadImportFile } from '@/data/storage'
import { visibleCards, type CardDef } from '@/domain/editor/cards'
import type { LoadResult } from '@/domain/storage/load'
import type { ExportFile } from '@/domain/types/song'

const editor = useSongEditor()
const cards = computed(() => visibleCards(editor.request.value))

const confirmNew = ref(false)
const saveMode = ref<'save' | 'export'>('save')
const saveOpen = ref(false)
const profilesOpen = ref(false)
const importOpen = ref(false)
const importName = ref('')
const importResult = ref<LoadResult<ExportFile> | null>(null)

function openSave(mode: 'save' | 'export') {
  saveMode.value = mode
  saveOpen.value = true
}

// 読込（判断ポイント34: useFileDialog。判断ポイント46: エクスポートファイルだけ）
const {
  open: openFile,
  reset: resetFile,
  onChange,
} = useFileDialog({
  accept: '.json,application/json',
  multiple: false,
})
onChange(async (files) => {
  const f = files?.[0]
  if (!f) return
  await receiveFile(f.name, await f.text())
  resetFile()
})
/** 選んだファイルの中身を検査して、取り込みのダイアログを開く（テストからも呼ぶ） */
async function receiveFile(name: string, text: string) {
  importName.value = name
  importResult.value = loadImportFile(text)
  importOpen.value = true
}
defineExpose({ receiveFile })

const actions = computed(() => [
  { label: '新規', testid: 'new-song', onSelect: () => (confirmNew.value = true) },
  { label: '保存', testid: 'save-song', onSelect: () => openSave('save') },
  { label: '書き出す', testid: 'export-song', onSelect: () => openSave('export') },
  { label: '読込', testid: 'import-file', onSelect: () => openFile() },
  { label: 'プロファイル', testid: 'open-profiles', onSelect: () => (profilesOpen.value = true) },
])
const menuItems = computed<DropdownMenuItem[]>(() =>
  actions.value.map((a) => ({ label: a.label, onSelect: a.onSelect })),
)

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
          <span class="hidden text-sm text-muted lg:inline" data-testid="tool-label">
            対象ツール: Suno {{ editor.request.value.toolVersion }}
          </span>
          <div class="hidden gap-1 sm:flex">
            <UButton
              v-for="a in actions"
              :key="a.testid"
              :label="a.label"
              color="neutral"
              variant="outline"
              size="sm"
              :data-testid="a.testid"
              @click="a.onSelect"
            />
          </div>
          <UDropdownMenu :items="menuItems" class="sm:hidden">
            <UButton
              label="…"
              color="neutral"
              variant="outline"
              aria-label="メニュー"
              data-testid="header-menu"
            />
          </UDropdownMenu>
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
          :warnings="editor.warnings.value"
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
          <RequestTextArea
            :generated="editor.generated.value"
            :request="editor.savedSong.value.requests[0]!"
          />
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
  <SaveDialog v-model:open="saveOpen" :mode="saveMode" />
  <ProfilesDialog v-model:open="profilesOpen" />
  <ImportDialog v-model:open="importOpen" :file-name="importName" :result="importResult" />
</template>
