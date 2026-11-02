<script setup lang="ts">
// プロファイル管理の画面（ui-and-nonfunctional.md 判断ポイント67。プロファイルのポップアップを置き換える）。
// タブ「ユーザー／ファクトリー」。ユーザーは、パンくず＋今のフォルダの中身（サブフォルダが先、プロファイルが後）。
// 検索語があれば全フォルダから探し、パスの列を出す（対象は 両方／フォルダ／プロファイル から選べる。細部 (i)）。各行にチェックボックス（複数選択で 書き出す／移動／削除のメニュー。判断ポイント80）と操作。
// 選択は行全体の押下・一括選択・Shift の範囲選択でも切り替える（判断ポイント71）。行の操作は［操作］のメニュー（判断ポイント77）。
// 確認・入力は1つのダイアログの中で切り替える（モーダルを重ねない。判断ポイント8）。開くは、判断ポイント52 の確認のあと組み立ての画面へ
import type { DropdownMenuItem } from '@nuxt/ui'
import { useToast } from '@nuxt/ui/composables'
import { useFileDialog } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmReplaceDialog from '@/components/ConfirmReplaceDialog.vue'
import FolderPicker from '@/components/storage/FolderPicker.vue'
import ImportDialog from '@/components/storage/ImportDialog.vue'
import { useProfileStore } from '@/composables/useProfileStore'
import { useProfilesView } from '@/composables/useProfilesView'
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
  type SearchTarget,
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
// 検索の対象（細部 (i)。画面の中でだけ覚える。検索語があるときだけ効く）
const { searchTarget } = useProfilesView()
const searchTargetItems: { label: string; value: SearchTarget }[] = [
  { label: '両方', value: 'both' },
  { label: 'フォルダ', value: 'folder' },
  { label: 'プロファイル', value: 'profile' },
]
const targetLabel = (v: unknown) => searchTargetItems.find((x) => x.value === v)?.label ?? ''
const searchPlaceholder = computed(
  () =>
    ({
      both: 'フォルダ名・プロファイル名で検索（全フォルダ）',
      folder: 'フォルダ名で検索（全フォルダ）',
      profile: 'プロファイル名で検索（全フォルダ）',
    })[searchTarget.value],
)
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
    const hits = searchAll(s, query.value, searchTarget.value)
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
  clearSelection()
}

// ---------------------------------------------------------------------------
// 選択（判断ポイント71）
// ---------------------------------------------------------------------------
const selected = ref(new Set<string>())
/** 範囲選択の起点（直前に切り替えた行の key） */
const anchor = ref<string | null>(null)
function clearSelection() {
  selected.value = new Set()
  anchor.value = null
}
// 見えていない行を選んだままにしない: 検索語・検索の対象・タブが変わったら外す（フォルダの移動は enter）
watch([query, searchTarget, tab], clearSelection)
// 一覧から消えた行（取り込みの置換など）は、選択からも外す
watch(rows, (rs) => {
  const keys = new Set(rs.map((r) => r.key))
  if ([...selected.value].some((k) => !keys.has(k)))
    selected.value = new Set([...selected.value].filter((k) => keys.has(k)))
})
/**
 * 行（とそのチェックボックス）の押下。ボタン（［操作］）とフォルダの名前は除く。
 * Shift＋押下は、起点から押した行までを起点と同じ状態にそろえる（起点がなければ通常の押下）
 */
function onRowClick(r: Row, e: MouseEvent) {
  const hit = (e.target as Element).closest('button, a, input')
  if (hit && hit.getAttribute('role') !== 'checkbox') return
  const keys = rows.value.map((x) => x.key)
  const from = anchor.value === null ? -1 : keys.indexOf(anchor.value)
  const to = keys.indexOf(r.key)
  const next = new Set(selected.value)
  if (e.shiftKey && from >= 0) {
    const on = selected.value.has(anchor.value!)
    for (const k of keys.slice(Math.min(from, to), Math.max(from, to) + 1)) {
      if (on) next.add(k)
      else next.delete(k)
    }
  } else if (next.has(r.key)) next.delete(r.key)
  else next.add(r.key)
  selected.value = next
  anchor.value = r.key
}
/** Shift＋押下で、ブラウザが文字を選択しないようにする */
function onRowMouseDown(e: MouseEvent) {
  if (e.shiftKey) e.preventDefault()
}

// 一括選択（表示中の行が対象。検索中は検索の結果）
const allState = computed<boolean | 'indeterminate'>(() => {
  const n = rows.value.filter((r) => selected.value.has(r.key)).length
  return n === 0 ? false : n === rows.value.length ? true : 'indeterminate'
})
function selectOnly(kind?: Row['kind']) {
  selected.value = new Set(rows.value.filter((r) => !kind || r.kind === kind).map((r) => r.key))
  anchor.value = null
}
function toggleAll() {
  if (allState.value === true) clearSelection()
  else selectOnly()
}
const bulkItems = [
  { label: 'すべて', onSelect: () => selectOnly() },
  { label: 'フォルダだけ', onSelect: () => selectOnly('folder') },
  { label: 'プロファイルだけ', onSelect: () => selectOnly('profile') },
  { label: '選択を外す', onSelect: () => clearSelection() },
]
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
  // フォルダを選んだときは、選んだフォルダと配下のすべて（空のフォルダを含む）を入れる（細部 (k)）
  const { profiles: list, folderIds } = expandSelection(s, sel)
  if (list.length === 0) {
    failure.value = ['書き出すプロファイルがありません（空のフォルダは書き出せません）']
    return
  }
  const now = new Date()
  downloadJson(exportFileName(list, now), buildExportFile(list, now, s.folders, folderIds))
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
    clearSelection()
    toast.add({
      title: `「${folderPathLabel(folders.value, moveTarget.value)}」に移動しました`,
      color: 'success',
    })
  } else {
    const gone = expandSelection(s, p.sel).profiles.map((x) => x.id)
    if (!commit(deleteItems(s, p.sel))) return
    if (editor.currentProfileId.value !== null && gone.includes(editor.currentProfileId.value))
      editor.currentProfileId.value = null
    clearSelection()
    toast.add({ title: '削除しました', color: 'success' })
  }
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
// 行の操作のメニュー（判断ポイント77。項目と並びは判断ポイント67。「削除」は区切り線の後ろ）
// ---------------------------------------------------------------------------
function rowMenu(r: Row): DropdownMenuItem[][] {
  const shared: DropdownMenuItem[] = [
    { label: '名前を変更', onSelect: () => ask({ kind: 'rename', row: r }) },
    { label: '移動', onSelect: () => ask({ kind: 'move', sel: rowSelection(r) }) },
  ]
  const head: DropdownMenuItem[] = r.profile
    ? [
        { label: '開く', onSelect: () => askOpen(r.profile!, r.id) },
        { label: '上書き保存', onSelect: () => ask({ kind: 'overwrite', profile: r.profile! }) },
        { label: '書き出す', onSelect: () => exportSelection(rowSelection(r), `「${r.name}」`) },
      ]
    : [{ label: '開く', onSelect: () => enter(r.id) }]
  return [
    [...head, ...shared],
    [
      {
        label: '削除',
        color: 'error',
        onSelect: () => ask({ kind: 'delete', sel: rowSelection(r) }),
      },
    ],
  ]
}

// 複数選択の操作のメニュー（判断ポイント80。「削除」は区切り線の後ろ）
const selectionMenu = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: '書き出す',
      onSelect: () => exportSelection(selectionOf(selected.value), '選んだもの'),
    },
    { label: '移動', onSelect: () => ask({ kind: 'move', sel: selectionOf(selected.value) }) },
  ],
  [
    {
      label: '削除',
      color: 'error',
      onSelect: () => ask({ kind: 'delete', sel: selectionOf(selected.value) }),
    },
  ],
])

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
                <!-- 検索のまとまり（対象＋検索欄。細部 (i)）と、並び替え。スマホ幅では並び替えを次の行に回す -->
                <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <UFieldGroup class="w-full sm:w-auto" data-testid="pm-search-group">
                    <USelect
                      v-model="searchTarget"
                      :items="searchTargetItems"
                      class="w-44 shrink-0"
                      aria-label="検索の対象"
                      data-testid="pm-search-target"
                    >
                      <template #default="{ modelValue }">
                        <span class="truncate">対象: {{ targetLabel(modelValue) }}</span>
                      </template>
                    </USelect>
                    <UInput
                      v-model="query"
                      icon="i-lucide-search"
                      :placeholder="searchPlaceholder"
                      class="min-w-0 flex-1 sm:w-96 sm:flex-none"
                      data-testid="profiles-search"
                    />
                  </UFieldGroup>
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
                <p v-if="rows.length === 0" class="text-sm text-muted" data-testid="pm-empty">
                  {{
                    searching
                      ? '見つかりませんでした。'
                      : store?.profiles.length || store?.folders.length
                        ? 'このフォルダは空です。'
                        : 'ユーザープロファイルはありません。組み立ての画面の「保存」で、編集中の内容を名前を付けて保存できます。'
                  }}
                </p>
                <div v-else class="rounded-md border border-default">
                  <!-- 一括選択（表示中の行）と、複数選択の操作。「選択を外す」は ▼ のメニューに置く -->
                  <div
                    class="flex flex-wrap items-center gap-2 border-b border-default bg-elevated p-2 text-sm"
                    data-testid="pm-selection-bar"
                  >
                    <UCheckbox
                      :model-value="allState"
                      aria-label="表示中の行をすべて選ぶ"
                      data-testid="pm-select-all"
                      @update:model-value="toggleAll"
                    />
                    <UDropdownMenu :items="bulkItems" :content="{ align: 'start' }">
                      <UButton
                        icon="i-lucide-chevron-down"
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        aria-label="選び方"
                        data-testid="pm-select-menu"
                      />
                    </UDropdownMenu>
                    <UDropdownMenu
                      v-if="selected.size"
                      :items="selectionMenu"
                      :content="{ align: 'start' }"
                    >
                      <UButton
                        size="xs"
                        :label="`選択した ${selected.size} 件`"
                        trailing-icon="i-lucide-chevron-down"
                        color="neutral"
                        variant="outline"
                        data-testid="pm-selection"
                      />
                    </UDropdownMenu>
                  </div>
                  <ul class="divide-y divide-default">
                    <!-- 行全体で選択を切り替える。選んだ行に背景色、PC では重ねると背景を薄く変える -->
                    <li
                      v-for="r in rows"
                      :key="r.key"
                      class="flex cursor-pointer items-center gap-2 p-2"
                      :class="
                        selected.has(r.key)
                          ? 'bg-primary/10 hover:bg-primary/15'
                          : 'hover:bg-elevated/60'
                      "
                      :data-selected="selected.has(r.key)"
                      :data-testid="`pm-${r.kind}-${r.name}`"
                      @click="onRowClick(r, $event)"
                      @mousedown="onRowMouseDown"
                    >
                      <!-- 押下は行で受ける（Shift の範囲選択も同じ）。キーボード・読み上げのために残す（指の大きさの例外。判断ポイント78） -->
                      <UCheckbox
                        class="touch-target-exempt"
                        :model-value="selected.has(r.key)"
                        :aria-label="`${r.name} を選ぶ`"
                        data-testid="pm-select"
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
                      <UDropdownMenu :items="rowMenu(r)" :content="{ align: 'end' }">
                        <UButton
                          size="xs"
                          label="操作"
                          color="neutral"
                          variant="ghost"
                          data-testid="pm-actions"
                        />
                      </UDropdownMenu>
                    </li>
                  </ul>
                </div>
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
