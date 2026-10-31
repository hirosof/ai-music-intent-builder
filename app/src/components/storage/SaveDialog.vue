<script setup lang="ts">
// 「保存」と「書き出す」（U4d の決定 M3・M4、判断ポイント36・43・44）。
// 名前を入力 →（同名があれば同じダイアログの中で上書きの確認）→ ユーザープロファイルに保存。
// 「書き出す」は、チェック「プロファイルにも保存する」（初期値オフ。判断ポイント64）がオンなら、保存したその1件を書き出す。
// オフなら、ストアも覚えている名前も変えずに、入力した名前の1件をファイルに書き出すだけ（同名があっても確認しない）。
// ストアが拒否されているときは、チェックを無効にしてオフのまま（保存せずにファイルにだけ書き出す）。
// エラーが1件でもあれば保存できない（警告は許す）
import { useToast } from '@nuxt/ui/composables'
import { computed, ref, watch } from 'vue'
import { useProfileStore } from '@/composables/useProfileStore'
import { useSongEditor } from '@/composables/useSongEditor'
import { downloadJson, prepareForSave } from '@/data/storage'
import { exportFileName } from '@/domain/storage/file-name'
import {
  buildExportFile,
  findProfileById,
  findProfileByName,
  makeProfile,
  saveProfile,
} from '@/domain/storage/profiles'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ mode: 'save' | 'export' }>()

const editor = useSongEditor()
const profiles = useProfileStore()
const toast = useToast()

const name = ref('')
const confirmOverwrite = ref(false)
const failure = ref<string[]>([])
// 書き出すときにストアにも保存するか（判断ポイント64。開くたびにオフに戻す）
const alsoStore = ref(false)
// 保存先のフォルダ（null はルート）。編集中の内容に対応するプロファイルがあればそのフォルダ（判断ポイント70。選ぶ画面は段階2）
const folderId = ref<string | null>(null)
watch(open, (v) => {
  if (!v) return
  const current = editor.currentProfileId.value
  const p =
    current !== null && profiles.store.value
      ? findProfileById(profiles.store.value, current)
      : undefined
  name.value = p?.name ?? ''
  folderId.value = p?.folderId ?? null
  confirmOverwrite.value = false
  failure.value = []
  alsoStore.value = false
})

const prepared = computed(() => prepareForSave(editor.song.value))
const rejected = computed(() => profiles.state.value.status === 'rejected')
const storeErrors = computed(() =>
  profiles.state.value.status === 'rejected' ? profiles.state.value.errors : [],
)
const trimmed = computed(() => name.value.trim())
const canSubmit = computed(
  () =>
    trimmed.value !== '' &&
    prepared.value.errors.length === 0 &&
    !(props.mode === 'save' && rejected.value),
)
const title = computed(() => (props.mode === 'save' ? 'ユーザープロファイルに保存' : '書き出す'))
// ストアに保存するか（保存は常に。書き出しはチェックがオンのときだけ。拒否中は保存しない）
const storing = computed(() => !rejected.value && (props.mode === 'save' || alsoStore.value))

function submit() {
  if (!canSubmit.value) return
  const now = new Date()
  const store = storing.value ? profiles.store.value : null
  let savedId: string | null = null
  // ストアに保存する（保存しない書き出し・拒否されているときの書き出しは、ストアも覚えている名前も変えない）
  if (store) {
    if (findProfileByName(store, folderId.value, trimmed.value) && !confirmOverwrite.value) {
      confirmOverwrite.value = true
      return
    }
    const saved = saveProfile(store, folderId.value, trimmed.value, prepared.value.song, now)
    const c = profiles.commit(saved.store)
    if (!c.ok) {
      failure.value = c.errors
      return
    }
    savedId = saved.id
    editor.currentProfileId.value = saved.id
  }
  if (props.mode === 'export') {
    const saved =
      savedId !== null && profiles.store.value
        ? findProfileById(profiles.store.value, savedId)
        : undefined
    const profile = saved ?? makeProfile(trimmed.value, prepared.value.song, now)
    downloadJson(
      exportFileName([profile], now),
      buildExportFile([profile], now, profiles.store.value?.folders),
    )
  }
  toast.add({
    title:
      props.mode === 'save'
        ? `「${trimmed.value}」を保存しました`
        : store
          ? `「${trimmed.value}」を保存して、書き出しました`
          : `「${trimmed.value}」をファイルに書き出しました（ユーザープロファイルには保存していません）`,
    color: 'success',
  })
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="title" data-testid="save-dialog">
    <template #body>
      <div v-if="confirmOverwrite" class="space-y-2" data-testid="save-confirm-overwrite">
        <p>「{{ trimmed }}」はすでにあります。編集中の内容で上書きしますか？</p>
      </div>
      <div v-else class="space-y-3">
        <UFormField label="名前" required>
          <UInput
            v-model="name"
            class="w-full"
            autofocus
            data-testid="save-name"
            @keydown.enter="submit"
          />
        </UFormField>
        <template v-if="mode === 'export'">
          <UCheckbox
            v-model="alsoStore"
            label="プロファイルにも保存する"
            :disabled="rejected"
            data-testid="save-also-store"
          />
          <p v-if="!rejected" class="text-sm text-muted" data-testid="save-export-note">
            {{
              alsoStore
                ? 'ユーザープロファイルに保存してから、その1件をファイルに書き出します。'
                : 'ユーザープロファイルには保存せず、ファイルに書き出すだけです。'
            }}
          </p>
        </template>
        <UAlert
          v-if="rejected"
          color="warning"
          variant="subtle"
          :title="
            mode === 'save'
              ? 'ユーザープロファイルを読み込めなかったため、保存できません'
              : 'ユーザープロファイルを読み込めなかったため、保存せずにファイルにだけ書き出します'
          "
          :description="storeErrors.join('\n')"
          data-testid="save-store-rejected"
        />
        <UAlert
          v-if="prepared.errors.length"
          color="error"
          variant="subtle"
          title="未完成・誤りがあるため、保存できません"
          :description="prepared.errors.join('\n')"
          data-testid="save-errors"
        />
        <UAlert
          v-if="failure.length"
          color="error"
          variant="subtle"
          title="保存できませんでした"
          :description="failure.join('\n')"
          data-testid="save-failure"
        />
      </div>
    </template>
    <template #footer>
      <!-- 実行するボタンを左、やめるボタンを右（利用者の判断 (a)） -->
      <div class="flex w-full justify-end gap-2" data-testid="dialog-buttons">
        <UButton
          :label="confirmOverwrite ? '上書きする' : mode === 'save' ? '保存' : '書き出す'"
          :color="confirmOverwrite ? 'warning' : 'primary'"
          :disabled="!canSubmit"
          data-testid="save-submit"
          @click="submit"
        />
        <UButton
          label="キャンセル"
          color="neutral"
          variant="outline"
          data-testid="save-cancel"
          @click="confirmOverwrite ? (confirmOverwrite = false) : (open = false)"
        />
      </div>
    </template>
  </UModal>
</template>
