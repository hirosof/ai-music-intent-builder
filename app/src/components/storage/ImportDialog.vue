<script setup lang="ts">
// ファイルの取り込み（U4d の決定 M5。song-file.md §4-3・§6-2、判断ポイント35・44・46）。
// 1つのダイアログの中で、段階を切り替える: 検査の結果 → 追加／置換の選択 →（置換の確認）／（名前の衝突ごとの確認）。
// 取り込み先はユーザープロファイルだけで、編集中の内容は変えない
import { useToast } from '@nuxt/ui/composables'
import { computed, ref, watch } from 'vue'
import { useProfileStore } from '@/composables/useProfileStore'
import type { LoadResult } from '@/domain/storage/load'
import {
  importAdd,
  importReplace,
  type ConflictResolution,
  type NameConflict,
} from '@/domain/storage/profiles'
import type { ExportFile } from '@/domain/types/song'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ fileName: string; result: LoadResult<ExportFile> | null }>()

const profiles = useProfileStore()
const toast = useToast()

type Step = 'choose' | 'confirmReplace' | 'conflict'
const step = ref<Step>('choose')
const conflict = ref<NameConflict | null>(null)
const renameTo = ref('')
const applyToRest = ref(false)
let answer: ((r: ConflictResolution) => void) | null = null
let remembered: ConflictResolution['action'] | null = null
const failure = ref<string[]>([])

watch(open, (v) => {
  if (!v) {
    // 衝突の確認の途中で閉じたら、残りも含めて取り込まない（書き込みもしない。add の open の確認）
    remembered = 'skip'
    answer?.({ action: 'skip' })
    answer = null
    return
  }
  step.value = 'choose'
  conflict.value = null
  remembered = null
  applyToRest.value = false
  failure.value = []
})

const file = computed(() => (props.result?.ok ? props.result.value : null))
const rejectedStore = computed(() =>
  profiles.state.value.status === 'rejected' ? profiles.state.value.errors : null,
)

function finish(summary: string) {
  toast.add({
    title: `「${props.fileName}」を取り込みました`,
    description: summary,
    color: 'success',
  })
  open.value = false
}

async function add() {
  const store = profiles.store.value
  if (!store || !file.value) return
  const r = await importAdd(store, file.value, (c) => {
    if (remembered === 'overwrite' || remembered === 'skip') return { action: remembered }
    if (remembered === 'rename') return { action: 'rename', name: c.suggestedName }
    conflict.value = c
    renameTo.value = c.suggestedName
    step.value = 'conflict'
    return new Promise<ConflictResolution>((resolve) => (answer = resolve))
  })
  if (!open.value) return
  const c = profiles.commit(r.store)
  if (!c.ok) {
    failure.value = c.errors
    step.value = 'choose'
    return
  }
  finish(
    `追加 ${r.added.length} 件・上書き ${r.overwritten.length} 件・取り込まない ${r.skipped.length} 件`,
  )
}

function decide(action: ConflictResolution['action']) {
  const name = renameTo.value.trim()
  if (
    action === 'rename' &&
    (name === '' || profiles.store.value?.profiles.some((p) => p.name === name))
  )
    return
  if (applyToRest.value) remembered = action
  const resolve = answer
  answer = null
  resolve?.(action === 'rename' ? { action, name } : { action })
}
const renameInvalid = computed(() => {
  const name = renameTo.value.trim()
  if (name === '') return '名前を入力してください'
  if (profiles.store.value?.profiles.some((p) => p.name === name)) return 'その名前もすでにあります'
  return ''
})

function replace() {
  if (!file.value) return
  const c = profiles.commit(importReplace(file.value))
  if (!c.ok) {
    failure.value = c.errors
    step.value = 'choose'
    return
  }
  finish(`ユーザープロファイルを ${file.value.profiles.length} 件に置き換えました`)
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="ファイルを取り込む"
    :description="fileName"
    data-testid="import-dialog"
  >
    <template #body>
      <!-- 検査で拒否（ファイル全体を取り込まない。§6-2 の 5） -->
      <UAlert
        v-if="result && !result.ok"
        color="error"
        variant="subtle"
        title="このファイルは取り込めません"
        :description="result.errors.join('\n')"
        data-testid="import-rejected"
      />
      <UAlert
        v-else-if="rejectedStore"
        color="warning"
        variant="subtle"
        title="ユーザープロファイルを読み込めなかったため、取り込めません"
        :description="rejectedStore.join('\n')"
        data-testid="import-store-rejected"
      />
      <div v-else-if="file && step === 'choose'" class="space-y-3" data-testid="import-choose">
        <p>
          プロファイル {{ file.profiles.length }} 件:
          {{ file.profiles.map((p) => p.name).join('、') }}
        </p>
        <UAlert
          v-if="result?.ok && result.warnings.length"
          color="warning"
          variant="subtle"
          title="注意があります"
          :description="result.warnings.join('\n')"
          data-testid="import-warnings"
        />
        <p class="text-sm text-muted">
          「追加」は今のユーザープロファイルに加えます（同じ名前があれば、1件ずつ確認します）。「置換」は今のユーザープロファイルをすべて入れ替えます。
        </p>
        <UAlert
          v-if="failure.length"
          color="error"
          variant="subtle"
          title="取り込めませんでした"
          :description="failure.join('\n')"
        />
      </div>
      <div v-else-if="step === 'confirmReplace'" data-testid="import-confirm-replace">
        <p>
          今のユーザープロファイルは、すべてファイルの内容に置き換わります。よろしいですか？（編集中の内容は変わりません）
        </p>
      </div>
      <div
        v-else-if="step === 'conflict' && conflict"
        class="space-y-3"
        data-testid="import-conflict"
      >
        <p>「{{ conflict.incoming.name }}」は、すでにユーザープロファイルにあります。</p>
        <UFormField label="別名で追加するときの名前" :error="renameInvalid || undefined">
          <UInput v-model="renameTo" class="w-full" data-testid="import-rename" />
        </UFormField>
        <UCheckbox v-model="applyToRest" label="残りすべてに適用" data-testid="import-apply-rest" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <template v-if="step === 'conflict'">
          <UButton
            label="取り込まない"
            color="neutral"
            variant="outline"
            data-testid="import-skip"
            @click="decide('skip')"
          />
          <UButton
            label="別名で追加"
            color="neutral"
            :disabled="!!renameInvalid"
            data-testid="import-rename-ok"
            @click="decide('rename')"
          />
          <UButton
            label="上書き"
            color="warning"
            data-testid="import-overwrite"
            @click="decide('overwrite')"
          />
        </template>
        <template v-else-if="step === 'confirmReplace'">
          <UButton label="戻る" color="neutral" variant="outline" @click="step = 'choose'" />
          <UButton
            label="置き換える"
            color="error"
            data-testid="import-replace-ok"
            @click="replace"
          />
        </template>
        <template v-else>
          <UButton
            label="閉じる"
            color="neutral"
            variant="outline"
            data-testid="import-cancel"
            @click="open = false"
          />
          <template v-if="file && !rejectedStore">
            <UButton
              label="置換"
              color="neutral"
              data-testid="import-replace"
              @click="step = 'confirmReplace'"
            />
            <UButton label="追加" data-testid="import-add" @click="add" />
          </template>
        </template>
      </div>
    </template>
  </UModal>
</template>
