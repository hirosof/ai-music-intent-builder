<script setup lang="ts">
// プロファイル管理の画面（ui-and-nonfunctional.md 判断ポイント67。プロファイルのポップアップを置き換える）。
// タブ「ユーザー／ファクトリー」。ユーザーは、パンくず＋今のフォルダの中身（サブフォルダが先、プロファイルが後）。
// 検索語があれば全フォルダから探し、パスの列を出す。各行にチェックボックス（複数選択で 書き出す／移動／削除）と操作。
// 確認・入力は1つのダイアログの中で切り替える（モーダルを重ねない。判断ポイント8）。開くは、判断ポイント52 の確認のあと組み立ての画面へ
import { useToast } from '@nuxt/ui/composables'
import { useFileDialog } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmReplaceDialog from '@/components/ConfirmReplaceDialog.vue'
import FolderPicker from '@/components/storage/FolderPicker.vue'
import ImportDialog from '@/components/storage/ImportDialog.vue'
import { useProfileStore } from '@/composables/useProfileStore'
import { useSongEditor } from '@/composables/useSongEditor'
import { factoryProfiles } from '@/data/factory'
import { downloadJson, loadImportFile, prepareForSave } from '@/data/storage'
import { checkSaved } from '@/data/validation'
import { exportFileName } from '@/domain/storage/file-name'
import { folderPath, folderPathLabel } from '@/domain/storage/folders'
import type { LoadResult } from '@/domain/storage/load'
import {
  createFolder,
  deleteItems,
  deletionCounts,
  expandSelection,
  folderNameError,
  moveErrors,
  moveItems,
  renameFolder,
  searchAll,
  unmovableTargets,
  type Selection,
} from '@/domain/storage/manage'
import { buildExportFile, renameError, renameProfile, saveProfile } from '@/domain/storage/profiles'
import { formatDisplayTimestamp } from '@/domain/storage/timestamp'
import type { ExportFile, Folder, Profile, ProfileStore, UserProfile } from '@/domain/types/song'

const editor = useSongEditor()
const profiles = useProfileStore()
const toast = useToast()
const router = useRouter()

const tab = ref<'user' | 'factory'>('user')
const tabs = [
  { label: 'ユーザー', value: 'user', slot: 'user' as const },
  { label: 'ファクトリー', value: 'factory', slot: 'factory' as const },
]
const store = computed(() => profiles.store.value)
const rejected = computed(() =>
  profiles.state.value.status === 'rejected' ? profiles.state.value.errors : null,
)
const folders = computed(() => store.value?.folders ?? [])
const failure = ref<string[]>([])

// ---------------------------------------------------------------------------
// 今のフォルダ・検索・並び
// ---------------------------------------------------------------------------
const current = ref<string | null>(null)
// 今のフォルダがなくなったら（削除・取り込みの置換）、ルートに戻る
watch(folders, (fs) => {
  if (current.value !== null && !fs.some((f) => f.id === current.value)) current.value = null
})
const crumbs = computed(() => {
  const names = folderPath(folders.value, current.value)
  const ids: string[] = []
  for (let id = current.value; id !== null;) {
    ids.unshift(id)
    id = folders.value.find((f) => f.id === id)?.parentId ?? null
  }
  return names.map((name, i) => ({ id: ids[i]!, name }))
})
const query = ref('')
const searching = computed(() => query.value.trim() !== '')
const sort = ref<'name' | 'updated'>('updated')
const sortItems = [
  { label: '更新日時の新しい順', value: 'updated' },
  { label: '名前順', value: 'name' },
]
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ja')
const sortProfiles = (ps: UserProfile[]) =>
  [...ps].sort((a, b) =>
    sort.value === 'name' ? byName(a, b) : Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  )

interface Row {
  key: string
  kind: 'folder' | 'profile'
  id: string
  name: string
  folder?: Folder
  profile?: UserProfile
  /** 検索のときだけ: 入っているフォルダのパス */
  path?: string
}
const rows = computed<Row[]>(() => {
  const s = store.value
  if (!s) return []
  const folderRow = (f: Folder, path?: string): Row => ({
    key: `f:${f.id}`,
    kind: 'folder',
    id: f.id,
    name: f.name,
    folder: f,
    path,
  })
  const profileRow = (p: UserProfile, path?: string): Row => ({
    key: `p:${p.id}`,
    kind: 'profile',
    id: p.id,
    name: p.name,
    profile: p,
    path,
  })
  if (searching.value) {
    const hits = searchAll(s, query.value)
    const fs = hits.flatMap((h) => (h.kind === 'folder' ? [h] : []))
    const ps = hits.flatMap((h) => (h.kind === 'profile' ? [h] : []))
    const pathOf = new Map(ps.map((h) => [h.profile.id, h.path]))
    return [
      ...fs.sort((a, b) => byName(a.folder, b.folder)).map((h) => folderRow(h.folder, h.path)),
      ...sortProfiles(ps.map((h) => h.profile)).map((p) => profileRow(p, pathOf.get(p.id))),
    ]
  }
  return [
    ...s.folders
      .filter((f) => f.parentId === current.value)
      .sort(byName)
      .map((f) => folderRow(f)),
    ...sortProfiles(s.profiles.filter((p) => p.folderId === current.value)).map((p) =>
      profileRow(p),
    ),
  ]
})
function enter(id: string | null) {
  current.value = id
  query.value = ''
  selected.value = new Set()
  expanded.value = null
}

// ---------------------------------------------------------------------------
// 選択と、行の操作の開閉
// ---------------------------------------------------------------------------
const selected = ref(new Set<string>())
const expanded = ref<string | null>(null)
function toggleSelect(key: string, on: boolean) {
  const next = new Set(selected.value)
  if (on) next.add(key)
  else next.delete(key)
  selected.value = next
}
const selectionOf = (keys: Iterable<string>): Selection => {
  const ks = [...keys]
  return {
    folderIds: ks.filter((k) => k.startsWith('f:')).map((k) => k.slice(2)),
    profileIds: ks.filter((k) => k.startsWith('p:')).map((k) => k.slice(2)),
  }
}
const rowSelection = (r: Row): Selection =>
  r.kind === 'folder'
    ? { folderIds: [r.id], profileIds: [] }
    : { folderIds: [], profileIds: [r.id] }

// ---------------------------------------------------------------------------
// 書き込み
// ---------------------------------------------------------------------------
function commit(next: ProfileStore): boolean {
  const c = profiles.commit(next)
  if (!c.ok) {
    failure.value = c.errors
    return false
  }
  failure.value = []
  return true
}

function exportSelection(sel: Selection, label: string) {
  const s = store.value
  if (!s) return
  const list = expandSelection(s, sel).profiles
  if (list.length === 0) {
    failure.value = ['書き出すプロファイルがありません（空のフォルダは書き出せません）']
    return
  }
  const now = new Date()
  downloadJson(exportFileName(list, now), buildExportFile(list, now, s.folders))
  failure.value = []
  toast.add({ title: `${label}（${list.length} 件）を書き出しました`, color: 'success' })
}

// ---------------------------------------------------------------------------
// 確認・入力のダイアログ（1つのダイアログの中で切り替える）
// ---------------------------------------------------------------------------
type Pending =
  | { kind: 'overwrite'; profile: UserProfile }
  | { kind: 'rename'; row: Row }
  | { kind: 'newFolder' }
  | { kind: 'move'; sel: Selection }
  | { kind: 'delete'; sel: Selection }
// 中身（pending）は閉じても残す（閉じる間の表示が空にならないように）。開閉は dialogOpen
const pending = ref<Pending | null>(null)
const dialogOpen = ref(false)
// 確認・入力を閉じたら（実行・キャンセルとも）、行の操作も閉じる
watch(dialogOpen, (v) => {
  if (!v) expanded.value = null
})
const nameInput = ref('')
const moveTarget = ref<string | null>(null)
const prepared = computed(() => prepareForSave(editor.song.value))

function ask(p: Pending) {
  failure.value = []
  if (p.kind === 'rename') nameInput.value = p.row.name
  if (p.kind === 'newFolder') nameInput.value = ''
  if (p.kind === 'move') moveTarget.value = current.value
  pending.value = p
  dialogOpen.value = true
}
const nameError = computed(() => {
  const p = pending.value
  const s = store.value
  if (!s || !p) return null
  const name = nameInput.value.trim()
  if (p.kind === 'newFolder') return folderNameError(s, current.value, name)
  if (p.kind !== 'rename') return null
  return p.row.kind === 'folder'
    ? folderNameError(s, p.row.folder!.parentId, name, p.row.id)
    : renameError(s, p.row.id, name)
})
const moveProblems = computed(() => {
  const p = pending.value
  return p?.kind === 'move' && store.value ? moveErrors(store.value, p.sel, moveTarget.value) : []
})
const unmovable = computed(() => {
  const p = pending.value
  return p?.kind === 'move' && store.value
    ? unmovableTargets(store.value, p.sel)
    : new Set<string>()
})
const deleteText = computed(() => {
  const p = pending.value
  if (p?.kind !== 'delete' || !store.value) return ''
  const c = deletionCounts(store.value, p.sel)
  return c.folders > 0
    ? `フォルダ ${c.folders} 個、プロファイル ${c.profiles} 件を削除します（フォルダは中身ごと）。元に戻せません。`
    : `プロファイル ${c.profiles} 件を削除します。元に戻せません。`
})
const dialogTitle = computed(() => {
  const p = pending.value
  if (!p) return ''
  return {
    overwrite: '上書き保存',
    rename: '名前を変更',
    newFolder: '新しいフォルダ',
    move: '移動',
    delete: '削除',
  }[p.kind]
})
const okLabel = computed(() => {
  const k = pending.value?.kind
  return k === 'delete'
    ? '削除する'
    : k === 'move'
      ? '移動する'
      : k === 'newFolder'
        ? '作る'
        : k === 'rename'
          ? '変更する'
          : '上書きする'
})
const okDisabled = computed(() => {
  const p = pending.value
  if (!p) return true
  if (p.kind === 'overwrite') return prepared.value.errors.length > 0
  if (p.kind === 'rename' || p.kind === 'newFolder') return !!nameError.value
  if (p.kind === 'move') return moveProblems.value.length > 0
  return false
})

function confirm() {
  const p = pending.value
  const s = store.value
  if (!dialogOpen.value || !p || !s || okDisabled.value) return
  const name = nameInput.value.trim()
  if (p.kind === 'overwrite') {
    const { folderId, name: pname, id } = p.profile
    if (!commit(saveProfile(s, folderId, pname, prepared.value.song, new Date()).store)) return
    editor.currentProfileId.value = id
    toast.add({ title: `「${pname}」を上書き保存しました`, color: 'success' })
  } else if (p.kind === 'rename') {
    if (name !== p.row.name) {
      const next =
        p.row.kind === 'folder' ? renameFolder(s, p.row.id, name) : renameProfile(s, p.row.id, name)
      if (!commit(next)) return
      toast.add({ title: `「${p.row.name}」の名前を「${name}」に変更しました`, color: 'success' })
    }
  } else if (p.kind === 'newFolder') {
    if (!commit(createFolder(s, current.value, name).store)) return
    toast.add({ title: `フォルダ「${name}」を作りました`, color: 'success' })
  } else if (p.kind === 'move') {
    if (!commit(moveItems(s, p.sel, moveTarget.value))) return
    selected.value = new Set()
    toast.add({
      title: `「${folderPathLabel(folders.value, moveTarget.value)}」に移動しました`,
      color: 'success',
    })
  } else {
    const gone = expandSelection(s, p.sel).profiles.map((x) => x.id)
    if (!commit(deleteItems(s, p.sel))) return
    if (editor.currentProfileId.value !== null && gone.includes(editor.currentProfileId.value))
      editor.currentProfileId.value = null
    selected.value = new Set()
    toast.add({ title: '削除しました', color: 'success' })
  }
  expanded.value = null
  dialogOpen.value = false
}

// ---------------------------------------------------------------------------
// 開く（判断ポイント52 の確認のあと、組み立ての画面に戻る）
// ---------------------------------------------------------------------------
// 確認のダイアログは、閉じてから confirm を出すので、開く対象は表示の有無と別に持つ
const opening = ref<{ profile: Profile; id: string | null } | null>(null)
const openConfirm = ref(false)
function askOpen(profile: Profile, id: string | null) {
  opening.value = { profile, id }
  openConfirm.value = true
}
function openConfirmed() {
  const o = opening.value
  if (!o) return
  editor.replaceSong(o.profile.data, o.id)
  const warnings = checkSaved(JSON.stringify(o.profile.data)).warnings
  toast.add({
    title: `「${o.profile.name}」を開きました${warnings.length ? '（注意があります）' : ''}`,
    description: warnings.join('\n') || undefined,
    color: warnings.length ? 'warning' : 'success',
  })
  opening.value = null
  void router.push('/')
}

// ---------------------------------------------------------------------------
// 読込（取り込み先の初期値は今のフォルダ。判断ポイント69）
// ---------------------------------------------------------------------------
const importOpen = ref(false)
const importName = ref('')
const importResult = ref<LoadResult<ExportFile> | null>(null)
const {
  open: openFile,
  reset: resetFile,
  onChange,
} = useFileDialog({ accept: '.json,application/json', multiple: false })
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
</script>

<template>
  <UDashboardPanel id="profiles">
    <template #header>
      <UDashboardNavbar title="プロファイル管理" />
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-4xl">
        <UTabs v-model="tab" :items="tabs" :content="true" data-testid="profiles-tabs">
          <template #user>
            <div class="space-y-3 pt-2" data-testid="profiles-user">
              <UAlert
                v-if="rejected"
                color="warning"
                variant="subtle"
                title="ユーザープロファイルを読み込めなかったため、保存・削除・取り込みはできません"
                :description="rejected.join('\n')"
                data-testid="profiles-rejected"
              />
              <UAlert
                v-if="failure.length"
                color="error"
                variant="subtle"
                title="操作できませんでした"
                :description="failure.join('\n')"
                data-testid="pm-failure"
              />
              <template v-if="!rejected">
                <!-- 上部の操作 -->
                <div class="flex flex-wrap items-center gap-2">
                  <UButton
                    label="新しいフォルダ"
                    icon="i-lucide-folder-plus"
                    color="neutral"
                    variant="outline"
                    data-testid="pm-new-folder"
                    @click="ask({ kind: 'newFolder' })"
                  />
                  <UButton
                    label="読込"
                    color="neutral"
                    variant="outline"
                    data-testid="pm-import"
                    @click="openFile()"
                  />
                  <UButton
                    label="すべて書き出す"
                    color="neutral"
                    variant="outline"
                    :disabled="!store?.profiles.length"
                    data-testid="profiles-export-all"
                    @click="
                      exportSelection(
                        { folderIds: [], profileIds: store!.profiles.map((p) => p.id) },
                        'すべて',
                      )
                    "
                  />
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <UInput
                    v-model="query"
                    icon="i-lucide-search"
                    placeholder="名前で検索（全フォルダ）"
                    class="w-full sm:w-64"
                    data-testid="profiles-search"
                  />
                  <USelect
                    v-model="sort"
                    :items="sortItems"
                    class="w-48"
                    data-testid="profiles-sort"
                  />
                </div>
                <!-- パンくず（検索中は「検索の結果」） -->
                <nav
                  v-if="!searching"
                  class="flex flex-wrap items-center gap-1 text-sm"
                  aria-label="フォルダの位置"
                  data-testid="pm-breadcrumb"
                >
                  <UButton
                    label="ルート"
                    icon="i-lucide-house"
                    size="xs"
                    :color="current === null ? 'primary' : 'neutral'"
                    variant="ghost"
                    data-testid="pm-crumb-root"
                    @click="enter(null)"
                  />
                  <template v-for="c in crumbs" :key="c.id">
                    <span class="text-muted">＞</span>
                    <UButton
                      :label="c.name"
                      size="xs"
                      :color="c.id === current ? 'primary' : 'neutral'"
                      variant="ghost"
                      :data-testid="`pm-crumb-${c.id}`"
                      @click="enter(c.id)"
                    />
                  </template>
                </nav>
                <p v-else class="text-sm text-muted" data-testid="pm-search-note">
                  検索の結果（全フォルダ）: {{ rows.length }} 件
                </p>
                <!-- 複数選択の操作 -->
                <div
                  v-if="selected.size"
                  class="flex flex-wrap items-center gap-2 rounded-md bg-elevated p-2 text-sm"
                  data-testid="pm-selection"
                >
                  <span>{{ selected.size }} 件を選択</span>
                  <UButton
                    size="xs"
                    label="書き出す"
                    color="neutral"
                    variant="outline"
                    data-testid="pm-sel-export"
                    @click="exportSelection(selectionOf(selected), '選んだもの')"
                  />
                  <UButton
                    size="xs"
                    label="移動"
                    color="neutral"
                    variant="outline"
                    data-testid="pm-sel-move"
                    @click="ask({ kind: 'move', sel: selectionOf(selected) })"
                  />
                  <UButton
                    size="xs"
                    label="削除"
                    color="error"
                    variant="outline"
                    data-testid="pm-sel-delete"
                    @click="ask({ kind: 'delete', sel: selectionOf(selected) })"
                  />
                  <UButton
                    size="xs"
                    label="選択を解除"
                    color="neutral"
                    variant="ghost"
                    data-testid="pm-sel-clear"
                    @click="selected = new Set()"
                  />
                </div>
                <p v-if="rows.length === 0" class="text-sm text-muted" data-testid="pm-empty">
                  {{
                    searching
                      ? '見つかりませんでした。'
                      : store?.profiles.length || store?.folders.length
                        ? 'このフォルダは空です。'
                        : 'ユーザープロファイルはありません。組み立ての画面の「保存」で、編集中の内容を名前を付けて保存できます。'
                  }}
                </p>
                <ul v-else class="divide-y divide-default rounded-md border border-default">
                  <li
                    v-for="r in rows"
                    :key="r.key"
                    class="space-y-2 p-2"
                    :data-testid="`pm-${r.kind}-${r.name}`"
                  >
                    <div class="flex items-center gap-2">
                      <UCheckbox
                        :model-value="selected.has(r.key)"
                        :aria-label="`${r.name} を選ぶ`"
                        data-testid="pm-select"
                        @update:model-value="(v: unknown) => toggleSelect(r.key, v === true)"
                      />
                      <UIcon
                        :name="r.kind === 'folder' ? 'i-lucide-folder' : 'i-lucide-file-music'"
                        class="size-4 shrink-0 text-muted"
                      />
                      <div class="min-w-0 flex-1">
                        <button
                          v-if="r.kind === 'folder'"
                          type="button"
                          class="text-left font-medium break-all hover:underline"
                          data-testid="pm-enter"
                          @click="enter(r.id)"
                        >
                          {{ r.name }}
                        </button>
                        <div v-else class="font-medium break-all">{{ r.name }}</div>
                        <div class="flex flex-wrap gap-x-3 text-xs text-muted">
                          <span v-if="r.profile">{{
                            formatDisplayTimestamp(r.profile.updatedAt)
                          }}</span>
                          <span v-if="r.path !== undefined" data-testid="pm-path">{{
                            r.path
                          }}</span>
                        </div>
                      </div>
                      <UButton
                        size="xs"
                        :label="expanded === r.key ? '閉じる' : '操作'"
                        color="neutral"
                        variant="ghost"
                        data-testid="pm-actions"
                        @click="expanded = expanded === r.key ? null : r.key"
                      />
                    </div>
                    <!-- 行の操作 -->
                    <div
                      v-if="expanded === r.key"
                      class="flex flex-wrap gap-1 pl-8"
                      data-testid="pm-row-actions"
                    >
                      <template v-if="r.profile">
                        <UButton
                          size="xs"
                          label="開く"
                          data-testid="pm-open"
                          @click="askOpen(r.profile, r.id)"
                        />
                        <UButton
                          size="xs"
                          label="上書き保存"
                          color="neutral"
                          variant="outline"
                          data-testid="pm-overwrite"
                          @click="ask({ kind: 'overwrite', profile: r.profile })"
                        />
                        <UButton
                          size="xs"
                          label="書き出す"
                          color="neutral"
                          variant="outline"
                          data-testid="pm-export"
                          @click="exportSelection(rowSelection(r), `「${r.name}」`)"
                        />
                      </template>
                      <UButton
                        v-else
                        size="xs"
                        label="開く"
                        data-testid="pm-open-folder"
                        @click="enter(r.id)"
                      />
                      <UButton
                        size="xs"
                        label="名前を変更"
                        color="neutral"
                        variant="outline"
                        data-testid="pm-rename"
                        @click="ask({ kind: 'rename', row: r })"
                      />
                      <UButton
                        size="xs"
                        label="移動"
                        color="neutral"
                        variant="outline"
                        data-testid="pm-move"
                        @click="ask({ kind: 'move', sel: rowSelection(r) })"
                      />
                      <UButton
                        size="xs"
                        label="削除"
                        color="error"
                        variant="outline"
                        data-testid="pm-delete"
                        @click="ask({ kind: 'delete', sel: rowSelection(r) })"
                      />
                    </div>
                  </li>
                </ul>
              </template>
            </div>
          </template>
          <template #factory>
            <ul class="divide-y divide-default pt-2" data-testid="profiles-factory">
              <li
                v-for="p in factoryProfiles"
                :key="p.name"
                class="flex items-center justify-between gap-2 py-2"
                :data-testid="`factory-${p.name}`"
              >
                <span class="min-w-0 break-all">{{ p.name }}</span>
                <UButton
                  size="xs"
                  label="開く"
                  data-testid="factory-open"
                  @click="askOpen(p, null)"
                />
              </li>
            </ul>
          </template>
        </UTabs>
      </div>
    </template>
  </UDashboardPanel>

  <!-- 確認・入力（1つのダイアログの中で切り替える） -->
  <UModal v-model:open="dialogOpen" :title="dialogTitle" data-testid="pm-dialog">
    <template #body>
      <div v-if="pending" class="space-y-3">
        <template v-if="pending.kind === 'overwrite'">
          <p>「{{ pending.profile.name }}」を、編集中の内容で上書きします。</p>
          <UAlert
            v-if="prepared.errors.length"
            color="error"
            variant="subtle"
            title="未完成・誤りがあるため、上書きできません"
            :description="prepared.errors.join('\n')"
            data-testid="pm-overwrite-errors"
          />
        </template>
        <UFormField
          v-else-if="pending.kind === 'rename' || pending.kind === 'newFolder'"
          :label="
            pending.kind === 'newFolder'
              ? `「${folderPathLabel(folders, current)}」に作るフォルダの名前`
              : '新しい名前'
          "
          :error="nameError ?? undefined"
        >
          <UInput
            v-model="nameInput"
            class="w-full"
            autofocus
            data-testid="pm-name-input"
            @keydown.enter="confirm"
          />
        </UFormField>
        <template v-else-if="pending.kind === 'move'">
          <p class="text-sm">移動先のフォルダを選んでください。</p>
          <FolderPicker
            v-model="moveTarget"
            :folders="folders"
            :disabled="unmovable"
            testid="pm-move"
          />
          <UAlert
            v-if="moveProblems.length"
            color="warning"
            variant="subtle"
            title="移動できません"
            :description="moveProblems.join('\n')"
            data-testid="pm-move-problems"
          />
        </template>
        <p v-else data-testid="pm-delete-text">{{ deleteText }}</p>
      </div>
    </template>
    <template #footer>
      <!-- 実行するボタンを左、やめるボタンを右（利用者の判断 (a)） -->
      <div class="flex w-full justify-end gap-2" data-testid="dialog-buttons">
        <UButton
          :label="okLabel"
          :color="pending?.kind === 'delete' ? 'error' : 'primary'"
          :disabled="okDisabled"
          data-testid="pm-dialog-ok"
          @click="confirm"
        />
        <UButton
          label="キャンセル"
          color="neutral"
          variant="outline"
          data-testid="pm-dialog-cancel"
          @click="dialogOpen = false"
        />
      </div>
    </template>
  </UModal>

  <ConfirmReplaceDialog
    v-model:open="openConfirm"
    :title="`「${opening?.profile.name ?? ''}」を開きますか`"
    confirm-label="破棄して開く"
    @confirm="openConfirmed"
  />
  <ImportDialog
    v-model:open="importOpen"
    :file-name="importName"
    :result="importResult"
    :initial-folder-id="current"
    @opened="router.push('/')"
  />
</template>
