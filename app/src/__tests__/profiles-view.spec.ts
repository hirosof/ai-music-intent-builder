// プロファイル管理の画面（ui-and-nonfunctional.md 判断ポイント67。jsdom で構造と操作だけ）。
// パンくず＋一覧、検索、行の操作（開く・上書き保存・書き出す・名前の変更・移動・削除）、複数選択、新しいフォルダ、読込。
// ダウンロードは URL.createObjectURL とリンクのクリックを捕まえて、中身とファイル名を確かめる
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import USelect from '@nuxt/ui/components/Select.vue'
import { useToast } from '@nuxt/ui/composables'

import App from '../App.vue'
import EditorView from '@/views/EditorView.vue'
import ProfilesView from '@/views/ProfilesView.vue'
import { resetProfileStore } from '@/composables/useProfileStore'
import { resetSongEditor, useSongEditor } from '@/composables/useSongEditor'
import { resetUiSettings } from '@/composables/useUiSettings'
import { factoryProfiles } from '@/data/factory'
import { STORAGE_KEYS } from '@/data/storage'
import { spec } from '@/data/spec'
import { createInitialSong } from '@/domain/editor/initial'
import { buildExportFile, emptyStore, toJsonText } from '@/domain/storage/profiles'
import type { ExportFile, ProfileStore, SongData, UserProfile } from '@/domain/types/song'

let wrapper: VueWrapper | undefined
let router: Router
const downloads: { name: string; blob: Blob }[] = []
beforeEach(() => {
  downloads.length = 0
  let last: Blob | undefined
  ;(URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b: Blob) => {
    last = b
    return 'blob:test'
  }
  ;(URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function (this: HTMLAnchorElement) {
      downloads.push({ name: this.download, blob: last! })
    },
  )
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  resetSongEditor()
  resetProfileStore()
  resetUiSettings()
  vi.restoreAllMocks()
  localStorage.clear()
  document.body.innerHTML = ''
})

async function mountApp(path = '/profiles') {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: EditorView },
      { path: '/profiles', component: ProfilesView },
    ],
  })
  router.push(path)
  await router.isReady()
  wrapper = mount(App, { global: { plugins: [router, ui] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}
const $ = <T extends Element = HTMLElement>(testid: string, within?: Element | null) =>
  (within ?? document).querySelector<T>(`[data-testid="${testid}"]`)
async function click(testid: string, within?: Element | null) {
  const el = $(testid, within)
  if (!el) throw new Error(`見つからない: ${testid}`)
  el.click()
  await flushPromises()
}
async function type(testid: string, value: string) {
  const el = $<HTMLInputElement>(testid)!
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}
const stored = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) ?? 'null') as ProfileStore | null
const editor = () => useSongEditor()
const toastTitles = () =>
  useToast()
    .toasts.value.map((t) => `${t.title ?? ''} ${t.description ?? ''}`)
    .join(' | ')
const putStore = (s: ProfileStore) => localStorage.setItem(STORAGE_KEYS.profiles, toJsonText(s))
const f1 = factoryProfiles[0]!
const f2 = factoryProfiles[1]!

// ストア: ゲーム ＞ ボス戦、作業用。ゲームに「村」、ボス戦に「第1形態」、ルートに「ルートの曲」「古い曲」
const prof = (
  id: string,
  name: string,
  folderId: string | null,
  updatedAt: string,
  data: SongData = f1.data,
): UserProfile => ({ id, name, folderId, updatedAt, data })
const sample = (): ProfileStore => ({
  ...emptyStore(),
  folders: [
    { id: 'g', parentId: null, name: 'ゲーム' },
    { id: 'b', parentId: 'g', name: 'ボス戦' },
    { id: 'w', parentId: null, name: '作業用' },
  ],
  profiles: [
    prof('p-old', '古い曲', null, '2026-09-01T00:00:00+09:00'),
    prof('p-village', '村', 'g', '2026-10-01T00:00:00+09:00'),
    prof('p-boss', '第1形態', 'b', '2026-10-02T00:00:00+09:00', f2.data),
    prof('p-root', 'ルートの曲', null, '2026-10-03T00:00:00+09:00', f2.data),
  ],
})
/** 一覧の行（種類・名前）。並びのまま */
const rows = () =>
  [...document.querySelectorAll('[data-testid^="pm-folder-"], [data-testid^="pm-profile-"]')].map(
    (e) => e.getAttribute('data-testid')!.replace(/^pm-/, ''),
  )
const row = (kind: 'folder' | 'profile', name: string) => $(`pm-${kind}-${name}`)
/** 行の操作を開いて、その操作を押す */
async function act(kind: 'folder' | 'profile', name: string, action: string) {
  await click('pm-actions', row(kind, name))
  await click(action, row(kind, name))
}
async function select(kind: 'folder' | 'profile', name: string) {
  await click('pm-select', row(kind, name))
}
const where = (name: string) => {
  const s = stored()!
  const path = (id: string | null): string[] => {
    const f = s.folders.find((x) => x.id === id)
    return f ? [...path(f.parentId), f.name] : []
  }
  return ['ルート', ...path(s.profiles.find((p) => p.name === name)!.folderId)].join('/')
}
async function factoryTab() {
  const tab = [...document.querySelectorAll('button[role="tab"]')].find((b) =>
    b.textContent?.includes('ファクトリー'),
  ) as HTMLElement
  tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  await flushPromises()
}

describe('画面への移動', () => {
  it('ヘッダーの［プロファイル］で /profiles に移る（ポップアップは開かない）', async () => {
    await mountApp('/')
    await click('open-profiles')
    expect(router.currentRoute.value.path).toBe('/profiles')
    expect($('profiles-tabs')).not.toBeNull()
    expect($('profiles-dialog')).toBeNull()
  })
})

describe('パンくず＋一覧・並び・検索', () => {
  it('今のフォルダの中身。サブフォルダ（名前順）が先、プロファイル（更新日時の新しい順）が後', async () => {
    const s = sample()
    s.profiles.push(prof('p-a', 'アルファ', null, '2026-08-01T00:00:00+09:00'))
    putStore(s)
    await mountApp()
    expect(rows()).toEqual([
      'folder-ゲーム',
      'folder-作業用',
      'profile-ルートの曲',
      'profile-古い曲',
      'profile-アルファ',
    ])
    const sortSelect = wrapper!
      .findAllComponents(USelect)
      .find(
        (c) =>
          ((c.props() as { items?: { value?: string }[] }).items ?? [])[0]?.value === 'updated',
      )!
    sortSelect.vm.$emit('update:modelValue', 'name')
    await flushPromises()
    expect(rows()).toEqual([
      'folder-ゲーム',
      'folder-作業用',
      'profile-アルファ',
      'profile-ルートの曲',
      'profile-古い曲',
    ])
  })

  it('フォルダの名前で中に入り、パンくずで戻る。行の「開く」でも入れる', async () => {
    putStore(sample())
    await mountApp()
    await click('pm-enter', row('folder', 'ゲーム'))
    expect(rows()).toEqual(['folder-ボス戦', 'profile-村'])
    expect($('pm-breadcrumb')!.textContent!.replace(/\s/g, '')).toBe('ルート＞ゲーム')
    await act('folder', 'ボス戦', 'pm-open-folder')
    expect(rows()).toEqual(['profile-第1形態'])
    expect($('pm-breadcrumb')!.textContent!.replace(/\s/g, '')).toBe('ルート＞ゲーム＞ボス戦')
    await click('pm-crumb-g')
    expect(rows()).toEqual(['folder-ボス戦', 'profile-村'])
    await click('pm-crumb-root')
    expect(rows()).toContain('folder-ゲーム')
  })

  it('検索語があれば全フォルダから探し、パスの列を出す。空に戻せば今のフォルダの中身', async () => {
    putStore(sample())
    await mountApp()
    await type('profiles-search', 'ぼす')
    expect($('pm-breadcrumb')).toBeNull()
    expect(rows()).toEqual(['folder-ボス戦'])
    expect($('pm-path', row('folder', 'ボス戦'))!.textContent).toBe('ルート ＞ ゲーム')
    await type('profiles-search', '形態')
    expect(rows()).toEqual(['profile-第1形態'])
    expect($('pm-path', row('profile', '第1形態'))!.textContent).toBe('ルート ＞ ゲーム ＞ ボス戦')
    await type('profiles-search', '')
    expect(rows()).toEqual([
      'folder-ゲーム',
      'folder-作業用',
      'profile-ルートの曲',
      'profile-古い曲',
    ])
    expect($('pm-path')).toBeNull()
  })

  it('ユーザープロファイルがなければ、その旨を出す', async () => {
    await mountApp()
    expect($('pm-empty')!.textContent).toContain('ユーザープロファイルはありません')
  })
})

describe('開く（判断ポイント52 の確認のあと、組み立ての画面へ）', () => {
  it('確認を挟み、編集中の内容を置き換え、id を覚えて組み立ての画面に戻る。キャンセルなら変わらない', async () => {
    putStore(sample())
    await mountApp()
    await click('pm-enter', row('folder', 'ゲーム'))
    await act('profile', '村', 'pm-open')
    expect(document.body.textContent).toContain('「村」を開きますか')
    await click('confirm-cancel')
    expect(editor().song.value).toEqual(createInitialSong(spec))
    expect(router.currentRoute.value.path).toBe('/profiles')
    await click('pm-open', row('profile', '村'))
    await click('confirm-ok')
    await flushPromises()
    expect(editor().song.value).toEqual(f1.data)
    expect(editor().currentProfileId.value).toBe('p-village')
    expect(router.currentRoute.value.path).toBe('/')
    expect(toastTitles()).toContain('「村」を開きました')
  })

  it('ファクトリーは開くだけ（覚えるプロファイルはなし）。名前の変更などの操作はない', async () => {
    putStore(sample())
    await mountApp()
    editor().currentProfileId.value = 'p-root'
    await factoryTab()
    expect($('profiles-factory')!.querySelector('[data-testid="pm-rename"]')).toBeNull()
    await click('factory-open', $(`factory-${f2.name}`))
    await click('confirm-ok')
    await flushPromises()
    expect(editor().song.value).toEqual(f2.data)
    expect(editor().currentProfileId.value).toBeNull()
    expect(router.currentRoute.value.path).toBe('/')
  })
})

describe('行の操作', () => {
  it('上書き保存は確認を挟み、編集中の内容で上書きする（id・位置・フォルダは保つ）', async () => {
    putStore(sample())
    await mountApp()
    editor().song.value.requests[0]!.output.variantCount = 7
    await click('pm-enter', row('folder', 'ゲーム'))
    await act('profile', '村', 'pm-overwrite')
    expect($('pm-dialog-ok')!.textContent).toContain('上書きする')
    await click('pm-dialog-ok')
    const p = stored()!.profiles.find((x) => x.id === 'p-village')!
    expect([p.name, p.folderId, p.data.requests[0]!.output.variantCount]).toEqual(['村', 'g', 7])
    expect(stored()!.profiles.map((x) => x.id)).toEqual(sample().profiles.map((x) => x.id))
    expect(editor().currentProfileId.value).toBe('p-village')
  })

  it('未完成なら上書き保存できない', async () => {
    putStore(sample())
    const s = createInitialSong(spec)
    s.requests[0]!.axes.purpose = { state: 'specified' }
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    await act('profile', '古い曲', 'pm-overwrite')
    expect($('pm-overwrite-errors')).not.toBeNull()
    expect($<HTMLButtonElement>('pm-dialog-ok')!.disabled).toBe(true)
  })

  it('プロファイルの名前の変更: 一意は同じフォルダの中。中身・更新日時は変えない。覚えている対応は id なので保たれる', async () => {
    putStore(sample())
    await mountApp()
    editor().currentProfileId.value = 'p-village'
    await click('pm-enter', row('folder', 'ゲーム'))
    await act('profile', '村', 'pm-rename')
    expect($<HTMLInputElement>('pm-name-input')!.value).toBe('村')
    await type('pm-name-input', ' ')
    expect($<HTMLButtonElement>('pm-dialog-ok')!.disabled).toBe(true)
    expect(document.body.textContent).toContain('名前を入力してください')
    // ルートの「古い曲」と同じ名前でも、別のフォルダなのでよい
    await type('pm-name-input', '  古い曲  ')
    await click('pm-dialog-ok')
    const p = stored()!.profiles.find((x) => x.id === 'p-village')!
    expect([p.name, p.updatedAt]).toEqual(['古い曲', '2026-10-01T00:00:00+09:00'])
    expect(editor().currentProfileId.value).toBe('p-village')
    expect(toastTitles()).toContain('「村」の名前を「古い曲」に変更しました')
    // 保存の名前の初期値も、今の名前（組み立ての画面に戻って確かめる）
    await router.push('/')
    await flushPromises()
    await click('save-song')
    expect($<HTMLInputElement>('save-name')!.value).toBe('古い曲')
  })

  it('フォルダの名前の変更: 同じ親の中で一意。キャンセルなら変えない', async () => {
    putStore(sample())
    const before = localStorage.getItem(STORAGE_KEYS.profiles)
    await mountApp()
    await act('folder', 'ゲーム', 'pm-rename')
    await type('pm-name-input', '作業用')
    expect(document.body.textContent).toContain('その名前はすでにあります')
    expect($<HTMLButtonElement>('pm-dialog-ok')!.disabled).toBe(true)
    await click('pm-dialog-cancel')
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe(before)
    await act('folder', 'ゲーム', 'pm-rename')
    await type('pm-name-input', 'ゲーム曲')
    await click('pm-dialog-ok')
    expect(stored()!.folders.find((f) => f.id === 'g')!.name).toBe('ゲーム曲')
    expect(where('村')).toBe('ルート/ゲーム曲')
  })

  it('移動: 木の形で移動先を選ぶ。フォルダは自分自身・配下に移せない（選べない）', async () => {
    putStore(sample())
    await mountApp()
    await act('folder', 'ゲーム', 'pm-move')
    expect($<HTMLButtonElement>('pm-move-option-g')!.disabled).toBe(true)
    expect($<HTMLButtonElement>('pm-move-option-b')!.disabled).toBe(true)
    await click('pm-move-option-w')
    await click('pm-dialog-ok')
    expect(stored()!.folders.find((f) => f.id === 'g')!.parentId).toBe('w')
    expect(where('第1形態')).toBe('ルート/作業用/ゲーム/ボス戦')
    expect(rows()).toEqual(['folder-作業用', 'profile-ルートの曲', 'profile-古い曲'])
  })

  it('移動: 移動先に同じ名前があれば、理由を出して移動しない', async () => {
    const s = sample()
    s.profiles.push(prof('p-dup', '村', null, '2026-10-04T00:00:00+09:00'))
    putStore(s)
    await mountApp()
    await act('profile', '村', 'pm-move')
    await click('pm-move-option-g')
    expect($('pm-move-problems')!.textContent).toContain(
      '「ルート ＞ ゲーム」に、同じ名前のプロファイル「村」があります',
    )
    expect($<HTMLButtonElement>('pm-dialog-ok')!.disabled).toBe(true)
    await click('pm-move-option-w')
    expect($('pm-move-problems')).toBeNull()
    await click('pm-dialog-ok')
    expect(where('ルートの曲')).toBe('ルート')
    expect(stored()!.profiles.find((p) => p.id === 'p-dup')!.folderId).toBe('w')
  })

  it('削除: 中身のあるフォルダは中身ごと。確認に件数。覚えている対応が消えたら外す', async () => {
    putStore(sample())
    await mountApp()
    editor().currentProfileId.value = 'p-boss'
    await act('folder', 'ゲーム', 'pm-delete')
    expect($('pm-delete-text')!.textContent).toContain(
      'フォルダ 2 個、プロファイル 2 件を削除します',
    )
    await click('pm-dialog-ok')
    expect(stored()!.folders.map((f) => f.id)).toEqual(['w'])
    expect(stored()!.profiles.map((p) => p.id)).toEqual(['p-old', 'p-root'])
    expect(editor().currentProfileId.value).toBeNull()
  })

  it('今いるフォルダを（検索の結果から）削除したら、ルートに戻る', async () => {
    putStore(sample())
    await mountApp()
    await click('pm-enter', row('folder', 'ゲーム'))
    await click('pm-enter', row('folder', 'ボス戦'))
    await type('profiles-search', 'ボス')
    await act('folder', 'ボス戦', 'pm-delete')
    await click('pm-dialog-ok')
    await type('profiles-search', '')
    expect($('pm-breadcrumb')!.textContent!.replace(/\s/g, '')).toBe('ルート')
    expect(rows()).toEqual([
      'folder-ゲーム',
      'folder-作業用',
      'profile-ルートの曲',
      'profile-古い曲',
    ])
  })

  it('削除しているフォルダの中にいたら、ルートに戻る', async () => {
    putStore(sample())
    await mountApp()
    await click('pm-enter', row('folder', 'ゲーム'))
    await act('folder', 'ボス戦', 'pm-delete')
    expect($('pm-delete-text')!.textContent).toContain('フォルダ 1 個、プロファイル 1 件')
    await click('pm-dialog-ok')
    expect(rows()).toEqual(['profile-村'])
    await click('pm-crumb-root')
    await select('folder', 'ゲーム')
    await click('pm-sel-delete')
    await click('pm-dialog-ok')
    expect(rows()).toEqual(['folder-作業用', 'profile-ルートの曲', 'profile-古い曲'])
  })

  it('書き出す: プロファイル1件（名前.json。属するフォルダの祖先を含む）', async () => {
    putStore(sample())
    await mountApp()
    await click('pm-enter', row('folder', 'ゲーム'))
    await click('pm-enter', row('folder', 'ボス戦'))
    await act('profile', '第1形態', 'pm-export')
    expect(downloads.map((d) => d.name)).toEqual(['第1形態.json'])
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file.folders.map((f) => f.name)).toEqual(['ゲーム', 'ボス戦'])
    expect(file.profiles.map((p) => p.id)).toEqual(['p-boss'])
  })
})

describe('複数選択', () => {
  it('選んだものをまとめて書き出す。フォルダは中身すべて（構成ごと）', async () => {
    putStore(sample())
    await mountApp()
    await select('folder', 'ゲーム')
    await select('profile', 'ルートの曲')
    expect($('pm-selection')!.textContent).toContain('2 件を選択')
    await click('pm-sel-export')
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file.profiles.map((p) => p.name).sort()).toEqual(['ルートの曲', '村', '第1形態'].sort())
    expect(file.folders.map((f) => f.name)).toEqual(['ゲーム', 'ボス戦'])
    expect(downloads[0]!.name).toMatch(/^ai-music-intent-builder-profiles-\d{8}-\d{4}\.json$/)
  })

  it('空のフォルダだけを選んで書き出すと、理由を出して書き出さない', async () => {
    putStore(sample())
    await mountApp()
    await select('folder', '作業用')
    await click('pm-sel-export')
    expect(downloads).toHaveLength(0)
    expect($('pm-failure')!.textContent).toContain('書き出すプロファイルがありません')
  })

  it('選んだものをまとめて移動・削除する。選択の解除', async () => {
    putStore(sample())
    await mountApp()
    await select('profile', 'ルートの曲')
    await select('profile', '古い曲')
    await click('pm-sel-move')
    await click('pm-move-option-w')
    await click('pm-dialog-ok')
    expect([where('ルートの曲'), where('古い曲')]).toEqual(['ルート/作業用', 'ルート/作業用'])
    expect($('pm-selection')).toBeNull()
    await select('folder', 'ゲーム')
    await select('folder', '作業用')
    await click('pm-sel-clear')
    expect($('pm-selection')).toBeNull()
    await select('folder', 'ゲーム')
    await select('folder', '作業用')
    await click('pm-sel-delete')
    expect($('pm-delete-text')!.textContent).toContain('フォルダ 3 個、プロファイル 4 件')
    await click('pm-dialog-ok')
    expect(stored()).toEqual({ ...emptyStore() })
  })

  it('すべて書き出す', async () => {
    putStore(sample())
    await mountApp()
    await click('profiles-export-all')
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file.profiles).toHaveLength(4)
    expect(file.folders.map((f) => f.id).sort()).toEqual(['b', 'g'])
  })
})

describe('上部の操作', () => {
  it('新しいフォルダは今のフォルダの中に作る。同じ親の中で一意', async () => {
    putStore(sample())
    await mountApp()
    await click('pm-enter', row('folder', 'ゲーム'))
    await click('pm-new-folder')
    expect(document.body.textContent).toContain('「ルート ＞ ゲーム」に作るフォルダの名前')
    await type('pm-name-input', 'ボス戦')
    expect($<HTMLButtonElement>('pm-dialog-ok')!.disabled).toBe(true)
    await type('pm-name-input', '村の外')
    await click('pm-dialog-ok')
    const created = stored()!.folders.find((f) => f.name === '村の外')!
    expect(created.parentId).toBe('g')
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(rows()).toEqual(['folder-ボス戦', 'folder-村の外', 'profile-村'])
  })

  it('読込: 取り込み先の初期値は今見ているフォルダ。開いたら組み立ての画面へ', async () => {
    putStore(sample())
    const w = await mountApp()
    await click('pm-enter', row('folder', '作業用'))
    const text = toJsonText(
      buildExportFile(
        [prof('x', '取込', null, '2026-10-01T00:00:00+09:00', f2.data)],
        new Date('2026-10-19T00:00:00Z'),
      ),
    )
    const view = w.findComponent(ProfilesView).vm as unknown as {
      receiveFile(n: string, t: string): Promise<void>
    }
    await view.receiveFile('a.json', text)
    await flushPromises()
    expect($('import-target-option-w')!.getAttribute('aria-checked')).toBe('true')
    await click('import-add')
    expect(where('取込')).toBe('ルート/作業用')
    expect(router.currentRoute.value.path).toBe('/profiles')
    await view.receiveFile('a.json', text)
    await flushPromises()
    await click('import-open')
    await click('import-open-ok')
    await flushPromises()
    expect(editor().song.value).toEqual(f2.data)
    expect(router.currentRoute.value.path).toBe('/')
  })
})

describe('ストア拒否中・ダイアログのボタン', () => {
  it('ストアが拒否されていると、理由を出し、操作を出さない。ファクトリーは開ける', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify({ schemaVersion: 9, profiles: [] }))
    await mountApp()
    expect($('profiles-rejected')!.textContent).toContain('F8 新しい版')
    expect($('profiles-export-all')).toBeNull()
    expect($('pm-new-folder')).toBeNull()
    await factoryTab()
    expect($('factory-open')).not.toBeNull()
  })

  it('実行するボタンを左、やめるボタンを右', async () => {
    putStore(sample())
    await mountApp()
    await act('folder', 'ゲーム', 'pm-delete')
    expect(
      [...document.querySelectorAll('[data-testid="dialog-buttons"] button')].map((b) =>
        b.getAttribute('data-testid'),
      ),
    ).toEqual(['pm-dialog-ok', 'pm-dialog-cancel'])
  })
})
