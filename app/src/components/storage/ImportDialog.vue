<script setup lang="ts">
// ファイルの取り込み（U4d の決定 M5。song-file.md §4-3・§6-2、判断ポイント35・44・46）。
// 1つのダイアログの中で、段階を切り替える: 検査の結果と取り込むプロファイルの選択 → 追加／置換 →（置換の確認）／（名前の衝突ごとの確認）。
// 選択とプレビュー、1件だけ選んだときの直接開く（判断ポイント65）。「追加」「置換」は選んだものだけが対象で、編集中の内容は変えない。
// 「開く（保存しない）」はストアに入れずに編集中の内容として開き、「追加して開く」は追加のあとに開く。
// どちらも、先に「新規」と同じ確認を出す（判断ポイント52。同じダイアログの中で切り替える）。
// ストア拒否中は「開く（保存しない）」だけを使える（判断ポイント65 (5)。ストアを使わないため）
import { useToast } from '@nuxt/ui/composables'
import { computed, ref, watch } from 'vue'
import { useProfileStore } from '@/composables/useProfileStore'
import { useSongEditor } from '@/composables/useSongEditor'
import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import type { LoadResult } from '@/domain/storage/load'
import { profilePreview } from '@/domain/storage/preview'
import {
  findProfileById,
  importAdd,
  importReplace,
  selectFromFile,
  type ConflictResolution,
  type NameConflict,
} from '@/domain/storage/profiles'
import type { ExportFile, Profile } from '@/domain/types/song'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ fileName: string; result: LoadResult<ExportFile> | null }>()

const profiles = useProfileStore()
const editor = useSongEditor()
const toast = useToast()

type Step = 'choose' | 'confirmReplace' | 'conflict' | 'confirmOpen'
const step = ref<Step>('choose')
// 1件だけ選んだときの直接開く（判断ポイント65 (3)）。open: 開く（保存しない）、addOpen: 追加して開く
const openMode = ref<'open' | 'addOpen'>('open')
// 選んだプロファイル（ファイルの中の位置）と、展開している行
const selected = ref(new Set<number>())
const expanded = ref(new Set<number>())
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
const chosen = computed(() => (file.value ? selectFromFile(file.value, selected.value) : null))
const chosenCount = computed(() => chosen.value?.profiles.length ?? 0)
// 選択の初期値はすべて。開いたときと、ファイルが変わったときに選び直す
watch(
  [open, () => props.result],
  ([v]) => {
    if (!v) return
    selected.value = new Set(file.value?.profiles.map((_, i) => i) ?? [])
    expanded.value = new Set()
  },
  { immediate: true },
)
const previews = computed(() =>
  (file.value?.profiles ?? []).map((p) =>
    profilePreview(spec, p, checkSaved(JSON.stringify(p.data)).warnings),
  ),
)
function toggle(set: 'selected' | 'expanded', i: number, on: boolean) {
  const next = new Set(set === 'selected' ? selected.value : expanded.value)
  if (on) next.add(i)
  else next.delete(i)
  if (set === 'selected') selected.value = next
  else expanded.value = next
}
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

/** 選んだものを追加する。書き込めたら結果を返す（閉じた・失敗したら null） */
async function addChosen() {
  const store = profiles.store.value
  if (!store || !chosen.value || chosenCount.value === 0) return null
  const r = await importAdd(store, chosen.value, (c) => {
    if (remembered === 'overwrite' || remembered === 'skip') return { action: remembered }
    if (remembered === 'rename') return { action: 'rename', name: c.suggestedName }
    conflict.value = c
    renameTo.value = c.suggestedName
    step.value = 'conflict'
    return new Promise<ConflictResolution>((resolve) => (answer = resolve))
  })
  if (!open.value) return null
  const c = profiles.commit(r.store)
  if (!c.ok) {
    failure.value = c.errors
    step.value = 'choose'
    return null
  }
  return r
}
const addSummary = (r: { added: string[]; overwritten: string[]; skipped: string[] }) =>
  `追加 ${r.added.length} 件・上書き ${r.overwritten.length} 件・取り込まない ${r.skipped.length} 件`

async function add() {
  const r = await addChosen()
  if (r) finish(addSummary(r))
}

/** 編集中の内容として開く。id は画面が覚えるプロファイルの id（保存しないで開くときは null。判断ポイント70） */
function openAsEditing(profile: Profile, id: string | null) {
  editor.replaceSong(profile.data, id)
  const warnings = checkSaved(JSON.stringify(profile.data)).warnings
  toast.add({
    title: `「${profile.name}」を開きました${id === null ? '（ユーザープロファイルには保存していません）' : ''}${warnings.length ? '（注意があります）' : ''}`,
    description: warnings.join('\n') || undefined,
    color: warnings.length ? 'warning' : 'success',
  })
  open.value = false
}

function askOpen(mode: 'open' | 'addOpen') {
  if (chosenCount.value !== 1 || (mode === 'addOpen' && rejectedStore.value)) return
  openMode.value = mode
  step.value = 'confirmOpen'
}

/** 確認のあと、開く。追加して開くは「追加」と同じ処理（名前の衝突の確認を含む）のあと、追加した名前で開く */
async function confirmOpen() {
  const incoming = chosen.value?.profiles[0]
  if (!incoming || chosenCount.value !== 1) return
  if (openMode.value === 'open') {
    openAsEditing(incoming, null)
    return
  }
  const r = await addChosen()
  if (!r) return
  const id = r.storedIds[0]
  const stored =
    id !== undefined && profiles.store.value && findProfileById(profiles.store.value, id)
  if (!stored) {
    // 取り込まないを選んだときは、開かない
    finish(`${addSummary(r)}（開いていません）`)
    return
  }
  openAsEditing(stored, stored.id)
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
  if (!chosen.value || chosenCount.value === 0 || rejectedStore.value) return
  const c = profiles.commit(importReplace(chosen.value))
  if (!c.ok) {
    failure.value = c.errors
    step.value = 'choose'
    return
  }
  finish(`ユーザープロファイルを ${chosenCount.value} 件に置き換えました`)
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
      <div v-else-if="file && step === 'choose'" class="space-y-3" data-testid="import-choose">
        <!-- ストア拒否中も、検査・選択・プレビューと「開く（保存しない）」は使える（判断ポイント65 (5)） -->
        <UAlert
          v-if="rejectedStore"
          color="warning"
          variant="subtle"
          title="ユーザープロファイルを読み込めなかったため、取り込めません"
          :description="rejectedStore.join('\n')"
          data-testid="import-store-rejected"
        />
        <p data-testid="import-count">
          プロファイル {{ file.profiles.length }} 件（選択 {{ chosenCount }} 件）
        </p>
        <!-- 取り込むものを選ぶ（初期値はすべて選択）。行を展開すると「指定」の項目を出す（判断ポイント65） -->
        <ul
          class="divide-y divide-default rounded-md border border-default"
          data-testid="import-list"
        >
          <li
            v-for="(pv, i) in previews"
            :key="i"
            class="space-y-1 p-2"
            :data-testid="`import-row-${i}`"
          >
            <div class="flex items-start gap-2">
              <UCheckbox
                :model-value="selected.has(i)"
                :aria-label="`${pv.name} を選ぶ`"
                class="pt-0.5"
                :data-testid="`import-select-${i}`"
                @update:model-value="(v: unknown) => toggle('selected', i, v === true)"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline gap-x-2">
                  <span class="font-medium break-all">{{ pv.name }}</span>
                  <span class="text-xs text-muted">{{ pv.updatedAt }}</span>
                  <UBadge
                    v-if="pv.hasWarnings"
                    label="注意あり"
                    color="warning"
                    variant="subtle"
                    size="sm"
                    :data-testid="`import-row-warning-${i}`"
                  />
                </div>
                <div class="text-xs text-muted" :data-testid="`import-row-summary-${i}`">
                  {{ pv.tool
                  }}<template v-for="x in pv.summary" :key="x.label">
                    ／ {{ x.label }}: {{ x.text }}</template
                  >
                </div>
              </div>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :label="expanded.has(i) ? '閉じる' : '詳しく'"
                :data-testid="`import-expand-${i}`"
                @click="toggle('expanded', i, !expanded.has(i))"
              />
            </div>
            <div
              v-if="expanded.has(i)"
              class="space-y-1 pl-7 text-sm"
              :data-testid="`import-detail-${i}`"
            >
              <dl v-if="pv.specified.length" class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <template v-for="x in pv.specified" :key="x.label">
                  <dt class="text-muted">{{ x.label }}</dt>
                  <dd class="break-all">{{ x.text }}</dd>
                </template>
              </dl>
              <p v-else class="text-muted">「指定」の項目はありません</p>
              <p v-if="pv.others" class="text-xs text-muted">ほかの項目: {{ pv.others }}</p>
            </div>
          </li>
        </ul>
        <UAlert
          v-if="result?.ok && result.warnings.length"
          color="warning"
          variant="subtle"
          title="注意があります"
          :description="result.warnings.join('\n')"
          data-testid="import-warnings"
        />
        <p v-if="rejectedStore" class="text-sm text-muted">
          1件だけ選ぶと、編集中の内容として開けます（ユーザープロファイルには保存しません）。
        </p>
        <p v-else class="text-sm text-muted">
          「追加」は選んだものを今のユーザープロファイルに加えます（同じ名前があれば、1件ずつ確認します）。「置換」は今のユーザープロファイルを、選んだものだけで入れ替えます。1件だけ選ぶと、編集中の内容として開けます。
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
          今のユーザープロファイルは、すべて選んだ
          {{ chosenCount }} 件に置き換わります。よろしいですか？（編集中の内容は変わりません）
        </p>
      </div>
      <div v-else-if="step === 'confirmOpen'" class="space-y-2" data-testid="import-confirm-open">
        <p class="font-medium">
          「{{ chosen?.profiles[0]?.name }}」を{{
            openMode === 'open' ? '開きますか' : '追加して開きますか'
          }}
        </p>
        <p class="text-sm text-muted">
          編集中の内容は破棄されます。残したいときは、先に保存または書き出してください。
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
      <!-- 実行するボタンを左、やめるボタンを右（利用者の判断 (a)） -->
      <div class="flex w-full flex-wrap justify-end gap-2" data-testid="dialog-buttons">
        <template v-if="step === 'conflict'">
          <UButton
            label="上書き"
            color="warning"
            data-testid="import-overwrite"
            @click="decide('overwrite')"
          />
          <UButton
            label="別名で追加"
            color="neutral"
            :disabled="!!renameInvalid"
            data-testid="import-rename-ok"
            @click="decide('rename')"
          />
          <UButton
            label="取り込まない"
            color="neutral"
            variant="outline"
            data-testid="import-skip"
            @click="decide('skip')"
          />
        </template>
        <template v-else-if="step === 'confirmOpen'">
          <UButton
            :label="openMode === 'open' ? '破棄して開く' : '破棄して追加して開く'"
            color="error"
            data-testid="import-open-ok"
            @click="confirmOpen"
          />
          <UButton
            label="戻る"
            color="neutral"
            variant="outline"
            data-testid="import-back"
            @click="step = 'choose'"
          />
        </template>
        <template v-else-if="step === 'confirmReplace'">
          <UButton
            label="置き換える"
            color="error"
            data-testid="import-replace-ok"
            @click="replace"
          />
          <UButton
            label="戻る"
            color="neutral"
            variant="outline"
            data-testid="import-back"
            @click="step = 'choose'"
          />
        </template>
        <template v-else>
          <template v-if="file">
            <!-- ストア拒否中は、ストアを使う操作（追加・置換・追加して開く）を出さない（判断ポイント65 (5)） -->
            <template v-if="!rejectedStore">
              <UButton
                label="追加"
                :disabled="chosenCount === 0"
                data-testid="import-add"
                @click="add"
              />
              <UButton
                label="置換"
                color="neutral"
                :disabled="chosenCount === 0"
                data-testid="import-replace"
                @click="step = 'confirmReplace'"
              />
            </template>
            <!-- 1件だけ選んだとき（判断ポイント65 (3)） -->
            <template v-if="chosenCount === 1">
              <UButton
                label="開く（保存しない）"
                color="neutral"
                data-testid="import-open"
                @click="askOpen('open')"
              />
              <UButton
                v-if="!rejectedStore"
                label="追加して開く"
                color="neutral"
                data-testid="import-add-open"
                @click="askOpen('addOpen')"
              />
            </template>
          </template>
          <UButton
            label="閉じる"
            color="neutral"
            variant="outline"
            data-testid="import-cancel"
            @click="open = false"
          />
        </template>
      </div>
    </template>
  </UModal>
</template>
