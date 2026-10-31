// 保存の画面（U4d。jsdom で構造と操作だけ）: 保存・書き出す（M3・M4）、ファイルの取り込み（M5）。
// プロファイル管理の画面（判断ポイント67。ポップアップ〔M6〕を置き換えた）は profiles-view.spec.ts
// ダウンロードは URL.createObjectURL とリンクのクリックを捕まえて、中身とファイル名を確かめる
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import { useToast } from '@nuxt/ui/composables'

import App from '../App.vue'
import EditorView from '@/views/EditorView.vue'
import { resetProfileStore } from '@/composables/useProfileStore'
import { resetSongEditor, useSongEditor } from '@/composables/useSongEditor'
import { resetUiSettings } from '@/composables/useUiSettings'
import { factoryProfiles } from '@/data/factory'
import { STORAGE_KEYS } from '@/data/storage'
import { spec } from '@/data/spec'
import { createInitialSong } from '@/domain/editor/initial'
import { buildExportFile, emptyStore, saveProfile, toJsonText } from '@/domain/storage/profiles'
import type { ExportFile, ProfileStore, SongData } from '@/domain/types/song'

let wrapper: VueWrapper | undefined
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

async function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: EditorView }],
  })
  router.push('/')
  await router.isReady()
  wrapper = mount(App, { global: { plugins: [router, ui] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}
const $ = <T extends Element = HTMLElement>(testid: string) =>
  document.querySelector<T>(`[data-testid="${testid}"]`)
async function click(testid: string, within?: Element | null) {
  const el = (within ?? document).querySelector<HTMLElement>(`[data-testid="${testid}"]`)
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
/** 出た通知の見出し（jsdom では通知の DOM が描かれないため、状態から読む） */
const toastTitles = () =>
  useToast()
    .toasts.value.map((t) => `${t.title ?? ''} ${t.description ?? ''}`)
    .join(' | ')
const NOW = new Date('2026-10-19T01:00:00Z')
const f1 = factoryProfiles[0]!
const f2 = factoryProfiles[1]!
const putStore = (s: ProfileStore) => localStorage.setItem(STORAGE_KEYS.profiles, toJsonText(s))
/** ルートに保存したストア（id は UUID） */
const save = (s: ProfileStore, name: string, data: SongData, at: Date) =>
  saveProfile(s, null, name, data, at).store
/** 保存したストア（localStorage）で、その名前のプロファイルの id。なければ決まった印 */
const idOf = (name: string) => stored()?.profiles.find((p) => p.name === name)?.id ?? `id:${name}`
/** 画面が覚える「対応するプロファイル」（id。判断ポイント70）を、名前で指定する */
const setCurrent = (name: string) => (editor().currentProfileId.value = idOf(name))
/** 画面が覚えているプロファイルの、今の名前（ストアにない id はそのまま） */
const currentName = () => {
  const id = editor().currentProfileId.value
  return id === null ? null : (stored()?.profiles.find((p) => p.id === id)?.name ?? id)
}
/** 書き出しのファイルに入れるプロファイル（ルート。id は位置から） */
const asUser = (ps: { name: string; data: SongData; updatedAt?: string }[]) =>
  ps.map((p, i) => ({
    updatedAt: '2026-10-01T00:00:00+09:00',
    ...p,
    id: `file${i + 1}`,
    folderId: null,
  }))
const incompleteSong = (): SongData => {
  const s = createInitialSong(spec)
  s.requests[0]!.axes.purpose = { state: 'specified' }
  return s
}
const receive = async (w: VueWrapper, name: string, text: string) => {
  await (
    w.findComponent(EditorView).vm as unknown as {
      receiveFile(n: string, t: string): Promise<void>
    }
  ).receiveFile(name, text)
  await flushPromises()
}

describe('保存（M3）', () => {
  it('名前を付けて保存し、対応する名前を覚える。同じ名前は上書きの確認を挟む', async () => {
    await mountApp()
    await click('save-song')
    expect($<HTMLButtonElement>('save-submit')!.disabled).toBe(true)
    await type('save-name', '曲A')
    await click('save-submit')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['曲A'])
    expect(currentName()).toBe('曲A')
    expect(toastTitles()).toContain('「曲A」を保存しました')

    editor().song.value.requests[0]!.output.variantCount = 5
    await click('save-song')
    expect($<HTMLInputElement>('save-name')!.value).toBe('曲A')
    await click('save-submit')
    expect($('save-confirm-overwrite')).not.toBeNull()
    expect(stored()!.profiles[0]!.data.requests[0]!.output.variantCount).toBe(3)
    await click('save-submit')
    expect(stored()!.profiles).toHaveLength(1)
    expect(stored()!.profiles[0]!.data.requests[0]!.output.variantCount).toBe(5)
  })

  it('保存先は、覚えているプロファイルのフォルダ。同名の判定もそのフォルダの中（判断ポイント70）', async () => {
    const g = { id: 'g', parentId: null, name: 'ゲーム' }
    putStore({
      ...emptyStore(),
      folders: [g],
      profiles: [
        { id: 'root', folderId: null, name: '曲', updatedAt: f1.updatedAt, data: f1.data },
        { id: 'in-g', folderId: 'g', name: '曲', updatedAt: f1.updatedAt, data: f1.data },
      ],
    })
    await mountApp()
    editor().replaceSong(f2.data, 'in-g')
    await click('save-song')
    expect($<HTMLInputElement>('save-name')!.value).toBe('曲')
    await click('save-submit')
    expect($('save-confirm-overwrite')).not.toBeNull()
    await click('save-submit')
    const ps = stored()!.profiles
    expect(ps.map((p) => p.id)).toEqual(['root', 'in-g'])
    expect(ps[1]!.data).toEqual(f2.data)
    expect(ps[0]!.data).toEqual(f1.data)
    expect(editor().currentProfileId.value).toBe('in-g')
  })

  it('覚えているプロファイルがなければ、保存先はルート。新しい id を覚える', async () => {
    await mountApp()
    await click('save-song')
    await type('save-name', '新曲')
    await click('save-submit')
    const p = stored()!.profiles[0]!
    expect([p.name, p.folderId]).toEqual(['新曲', null])
    expect(editor().currentProfileId.value).toBe(p.id)
  })

  it('未完成なら保存できず、理由を出す（判断ポイント43）', async () => {
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(incompleteSong()))
    await mountApp()
    await click('save-song')
    await type('save-name', '曲A')
    expect($('save-errors')!.textContent).toContain('S5')
    expect($<HTMLButtonElement>('save-submit')!.disabled).toBe(true)
  })

  it('ストアが拒否されていると保存できない（判断ポイント44）', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, '{')
    await mountApp()
    await click('save-song')
    await type('save-name', '曲A')
    expect($('save-store-rejected')).not.toBeNull()
    expect($<HTMLButtonElement>('save-submit')!.disabled).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe('{')
  })
})

describe('書き出す（M4・判断ポイント64）', () => {
  it('「プロファイルにも保存する」がオンなら、保存してから、その1件をファイルに書き出す（名前.json）', async () => {
    await mountApp()
    await click('export-song')
    await type('save-name', '曲B')
    await click('save-also-store')
    await click('save-submit')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['曲B'])
    expect(downloads.map((d) => d.name)).toEqual(['曲B.json'])
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file).toMatchObject({ schemaVersion: 2, exportType: 'profiles', folders: [] })
    expect(file.profiles).toEqual(stored()!.profiles)
  })

  it('オン: 同じ名前があれば上書きの確認を挟む', async () => {
    putStore(save(emptyStore(), '曲B', f1.data, NOW))
    await mountApp()
    await click('export-song')
    await type('save-name', '曲B')
    await click('save-also-store')
    await click('save-submit')
    expect($('save-confirm-overwrite')).not.toBeNull()
    expect(downloads).toHaveLength(0)
    await click('save-submit')
    expect(stored()!.profiles[0]!.data).toEqual(editor().savedSong.value)
    expect(downloads.map((d) => d.name)).toEqual(['曲B.json'])
  })

  it('チェックの初期値はオフで、開くたびにオフに戻る', async () => {
    await mountApp()
    await click('export-song')
    expect($<HTMLButtonElement>('save-also-store')!.getAttribute('aria-checked')).toBe('false')
    expect($('save-export-note')!.textContent).toContain('保存せず')
    await click('save-also-store')
    expect($<HTMLButtonElement>('save-also-store')!.getAttribute('aria-checked')).toBe('true')
    await click('save-cancel')
    await click('export-song')
    expect($<HTMLButtonElement>('save-also-store')!.getAttribute('aria-checked')).toBe('false')
  })

  it('オフ: ストアも覚えている名前も変えず、入力した名前の1件を書き出すだけ（同名があっても確認しない）', async () => {
    putStore(save(emptyStore(), '曲B', f1.data, NOW))
    const before = localStorage.getItem(STORAGE_KEYS.profiles)
    await mountApp()
    setCurrent('前の名前')
    await click('export-song')
    await type('save-name', '曲B')
    await click('save-submit')
    expect($('save-confirm-overwrite')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe(before)
    expect(currentName()).toBe('id:前の名前')
    expect(downloads.map((d) => d.name)).toEqual(['曲B.json'])
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file.profiles.map((p) => p.name)).toEqual(['曲B'])
    expect(file.profiles[0]!.data).toEqual(editor().savedSong.value)
    expect(toastTitles()).toContain('ユーザープロファイルには保存していません')
  })

  it('オフでも、書き出しの前の検査は今のまま（未完成なら書き出さない）', async () => {
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(incompleteSong()))
    await mountApp()
    await click('export-song')
    await type('save-name', '曲A')
    expect($('save-errors')).not.toBeNull()
    expect($<HTMLButtonElement>('save-submit')!.disabled).toBe(true)
  })

  it('ストアが拒否されているときは、保存せずにファイルにだけ書き出す（チェックは無効でオフ）', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, '{')
    await mountApp()
    await click('export-song')
    await type('save-name', '曲C')
    expect($('save-store-rejected')!.textContent).toContain('保存せずにファイルにだけ書き出します')
    const box = $<HTMLButtonElement>('save-also-store')!
    expect(box.disabled).toBe(true)
    expect(box.getAttribute('aria-checked')).toBe('false')
    await click('save-submit')
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe('{')
    expect(downloads.map((d) => d.name)).toEqual(['曲C.json'])
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file.profiles[0]!.data).toEqual(editor().savedSong.value)
  })
})

describe('ファイルの取り込み（M5）', () => {
  const fileText = (...ps: { name: string; data: SongData }[]) =>
    toJsonText(buildExportFile(asUser(ps), NOW))

  it('エクスポートファイルでなければ、理由つきで取り込まない', async () => {
    const w = await mountApp()
    await receive(w, 'song.json', JSON.stringify(f1.data))
    expect($('import-rejected')!.textContent).toContain('エクスポートファイルを使ってください')
    expect($('import-add')).toBeNull()
  })

  it('追加（衝突なし）。編集中の内容は変えない', async () => {
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'X', data: f1.data }, { name: 'Y', data: f2.data }))
    expect($('import-choose')!.textContent).toContain('2 件')
    await click('import-add')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['X', 'Y'])
    expect(editor().song.value).toEqual(createInitialSong(spec))
    expect(toastTitles()).toContain('追加 2 件・上書き 0 件・取り込まない 0 件')
  })

  it('衝突ごとに確認（別名・上書き・取り込まない）', async () => {
    putStore(
      save(save(save(emptyStore(), 'A', f1.data, NOW), 'B', f1.data, NOW), 'C', f1.data, NOW),
    )
    const w = await mountApp()
    await receive(
      w,
      'a.json',
      fileText(
        { name: 'A', data: f2.data },
        { name: 'B', data: f2.data },
        { name: 'C', data: f2.data },
      ),
    )
    await click('import-add')
    expect($('import-conflict')!.textContent).toContain('「A」')
    expect($<HTMLInputElement>('import-rename')!.value).toBe('A（2）')
    await click('import-rename-ok')
    expect($('import-conflict')!.textContent).toContain('「B」')
    await click('import-overwrite')
    await click('import-skip')
    const s = stored()!
    expect(s.profiles.map((p) => p.name)).toEqual(['A', 'B', 'C', 'A（2）'])
    expect(s.profiles.find((p) => p.name === 'B')!.data).toEqual(f2.data)
    expect(s.profiles.find((p) => p.name === 'C')!.data).toEqual(f1.data)
  })

  it('「残りすべてに適用」で、以後の衝突を聞かない', async () => {
    putStore(save(save(emptyStore(), 'A', f1.data, NOW), 'B', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'A', data: f2.data }, { name: 'B', data: f2.data }))
    await click('import-add')
    $<HTMLElement>('import-apply-rest')!.click()
    await flushPromises()
    await click('import-overwrite')
    expect($('import-conflict')).toBeNull()
    expect(stored()!.profiles.map((p) => p.data)).toEqual([f2.data, f2.data])
  })

  it('別名がすでにある名前なら、別名で追加を押せない', async () => {
    putStore(save(save(emptyStore(), 'A', f1.data, NOW), 'Z', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'A', data: f2.data }))
    await click('import-add')
    await type('import-rename', 'Z')
    expect($<HTMLButtonElement>('import-rename-ok')!.disabled).toBe(true)
    expect(document.body.textContent).toContain('その名前もすでにあります')
  })

  it('置換は確認を挟んで、ストアを入れ替える', async () => {
    putStore(save(emptyStore(), 'old', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'new', data: f2.data }))
    await click('import-replace')
    expect($('import-confirm-replace')).not.toBeNull()
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['old'])
    await click('import-replace-ok')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['new'])
  })

  it('ストアが拒否されていると取り込めない（追加・置換・追加して開くを出さない）', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, '{')
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'X', data: f1.data }))
    expect($('import-store-rejected')!.textContent).toContain(
      'ユーザープロファイルを読み込めなかったため、取り込めません',
    )
    expect($('import-add')).toBeNull()
    expect($('import-replace')).toBeNull()
    expect($('import-add-open')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe('{')
  })

  it('衝突の確認の途中で閉じると、何も書き込まない', async () => {
    putStore(save(emptyStore(), 'A', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'N', data: f2.data }, { name: 'A', data: f2.data }))
    await click('import-add')
    expect($('import-conflict')).not.toBeNull()
    const close =
      document.querySelector<HTMLElement>('[data-testid="import-dialog"] button[aria-label]') ??
      [...document.querySelectorAll<HTMLElement>('button')].find(
        (b) =>
          b.getAttribute('aria-label')?.includes('閉') || b.getAttribute('aria-label') === 'Close',
      )
    close!.click()
    await flushPromises()
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['A'])
  })
})

describe('取り込みの選択・プレビュー・直接開く（判断ポイント65）', () => {
  const fileText = (...ps: { name: string; data: SongData }[]) =>
    toJsonText(buildExportFile(asUser(ps), NOW))
  const checked = (i: number) =>
    $<HTMLButtonElement>(`import-select-${i}`)!.getAttribute('aria-checked') === 'true'
  const songWithWarning = (): SongData => {
    const s = createInitialSong(spec)
    s.requests[0]!.axes.purpose = { state: 'delegated', value: 'battle-theme' }
    return s
  }
  const xyz = () =>
    fileText(
      { name: 'X', data: f1.data },
      { name: 'Y', data: f2.data },
      { name: 'Z', data: f1.data },
    )

  it('一覧は初期値ですべて選択。要約（ツールと版・用途・主ジャンル・注意）と、展開した「指定」の項目', async () => {
    const w = await mountApp()
    await receive(
      w,
      'a.json',
      fileText({ name: 'X', data: f1.data }, { name: 'W', data: songWithWarning() }),
    )
    expect([checked(0), checked(1)]).toEqual([true, true])
    expect($('import-count')!.textContent).toContain('選択 2 件')
    expect($('import-row-summary-0')!.textContent).toMatch(/Suno v\d.*用途: .*主ジャンル: /s)
    expect($('import-row-warning-0')).toBeNull()
    expect($('import-row-warning-1')).not.toBeNull()
    expect($('import-detail-0')).toBeNull()
    await click('import-expand-0')
    const detail = $('import-detail-0')!.textContent!
    expect(detail).toContain('ほかの項目:')
    const specified = Object.entries(f1.data.requests[0]!.axes).filter(
      ([, a]) => a.state === 'specified',
    )
    expect(specified.length).toBeGreaterThan(0)
    for (const [fid] of specified) expect(detail).toContain(spec.fieldById.get(fid)!.label)
  })

  it('開いたまま別のファイルを受け取ったら、選び直す（すべて選択）', async () => {
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'X', data: f1.data }))
    await click('import-select-0')
    await receive(w, 'b.json', xyz())
    expect([checked(0), checked(1), checked(2)]).toEqual([true, true, true])
  })

  it('選んだものだけを追加する', async () => {
    const w = await mountApp()
    await receive(w, 'a.json', xyz())
    await click('import-select-1')
    expect(checked(1)).toBe(false)
    await click('import-add')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['X', 'Z'])
  })

  it('置換は、ストアを選んだものだけで入れ替える（確認は今のまま）', async () => {
    putStore(save(emptyStore(), 'old', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', xyz())
    await click('import-select-0')
    await click('import-replace')
    expect($('import-confirm-replace')!.textContent).toContain('選んだ 2 件')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['old'])
    await click('import-replace-ok')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['Y', 'Z'])
  })

  it('何も選んでいないと、追加・置換・開くを使えない。開くは1件だけ選んだときに出る', async () => {
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'X', data: f1.data }, { name: 'Y', data: f2.data }))
    expect($('import-open')).toBeNull()
    await click('import-select-0')
    expect($('import-open')).not.toBeNull()
    expect($('import-add-open')).not.toBeNull()
    await click('import-select-1')
    expect($<HTMLButtonElement>('import-add')!.disabled).toBe(true)
    expect($<HTMLButtonElement>('import-replace')!.disabled).toBe(true)
    expect($('import-open')).toBeNull()
    expect($('import-add-open')).toBeNull()
  })

  it('開く（保存しない）: 確認を挟み、編集中の内容として開く。ストアは変えず、覚えている名前はなし', async () => {
    putStore(save(emptyStore(), 'old', f1.data, NOW))
    const before = localStorage.getItem(STORAGE_KEYS.profiles)
    const w = await mountApp()
    setCurrent('old')
    await receive(w, 'a.json', fileText({ name: 'Y', data: f2.data }))
    await click('import-open')
    expect($('import-confirm-open')!.textContent).toContain('編集中の内容は破棄されます')
    await click('import-back')
    expect(editor().song.value).toEqual(createInitialSong(spec))
    await click('import-open')
    await click('import-open-ok')
    expect(editor().song.value).toEqual(f2.data)
    expect(currentName()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe(before)
    expect(toastTitles()).toContain('「Y」を開きました（ユーザープロファイルには保存していません）')
  })

  it('追加して開く: 確認のあと追加し、追加した名前で開く', async () => {
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'X', data: f1.data }, { name: 'Y', data: f2.data }))
    await click('import-select-0')
    await click('import-add-open')
    expect($('import-confirm-open')!.textContent).toContain('追加して開きますか')
    expect(stored()).toBeNull()
    await click('import-open-ok')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['Y'])
    expect(editor().song.value).toEqual(f2.data)
    expect(currentName()).toBe('Y')
  })

  it('追加して開く: 名前が衝突したら確認する。別名なら別名で開き、取り込まないなら開かない', async () => {
    putStore(save(emptyStore(), 'Y', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'Y', data: f2.data }))
    await click('import-add-open')
    await click('import-open-ok')
    expect($('import-conflict')).not.toBeNull()
    await click('import-rename-ok')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['Y', 'Y（2）'])
    expect(editor().song.value).toEqual(f2.data)
    expect(currentName()).toBe('Y（2）')

    editor().replaceSong(createInitialSong(spec), 'id:前')
    await receive(w, 'b.json', fileText({ name: 'Y', data: f2.data }))
    await click('import-add-open')
    await click('import-open-ok')
    await click('import-skip')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['Y', 'Y（2）'])
    expect(editor().song.value).toEqual(createInitialSong(spec))
    expect(currentName()).toBe('id:前')
    expect(toastTitles()).toContain('（開いていません）')
  })

  it('ストア拒否中も、選択・プレビューと「開く（保存しない）」は使える（細部 (5)）', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, '{')
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'X', data: f1.data }, { name: 'Y', data: f2.data }))
    expect($('import-store-rejected')).not.toBeNull()
    expect([checked(0), checked(1)]).toEqual([true, true])
    expect($('import-row-summary-1')!.textContent).toContain('用途: ')
    expect($('import-open')).toBeNull()
    await click('import-select-0')
    expect($('import-open')).not.toBeNull()
    expect($('import-add-open')).toBeNull()
    expect($('import-add')).toBeNull()
    expect($('import-replace')).toBeNull()
    await click('import-open')
    expect($('import-confirm-open')!.textContent).toContain('「Y」を開きますか')
    await click('import-open-ok')
    expect(editor().song.value).toEqual(f2.data)
    expect(currentName()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe('{')
    expect(toastTitles()).toContain('「Y」を開きました（ユーザープロファイルには保存していません）')

    // 開いたあとの保存は、今の拒否中の保存と同じ（理由を出して保存しない）
    await click('save-song')
    await type('save-name', 'Y')
    expect($('save-store-rejected')).not.toBeNull()
    expect($<HTMLButtonElement>('save-submit')!.disabled).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe('{')
  })

  it('追加して開く: 上書きなら、その名前で開く', async () => {
    putStore(save(emptyStore(), 'Y', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'Y', data: f2.data }))
    await click('import-add-open')
    await click('import-open-ok')
    await click('import-overwrite')
    expect(stored()!.profiles.map((p) => p.data)).toEqual([f2.data])
    expect(editor().song.value).toEqual(f2.data)
    expect(currentName()).toBe('Y')
  })
})

describe('ボタンの並び（利用者の判断 (a): 実行するボタンを左、やめるボタンを右）', () => {
  const order = () =>
    [...document.querySelectorAll('[data-testid="dialog-buttons"] button')].map((b) =>
      b.getAttribute('data-testid'),
    )

  it('新規・保存・取り込み（プロファイル管理の画面は profiles-view.spec.ts）', async () => {
    putStore(save(emptyStore(), 'A', f1.data, NOW))
    const w = await mountApp()
    await click('new-song')
    expect(order()).toEqual(['confirm-ok', 'confirm-cancel'])
    await click('confirm-cancel')

    await click('save-song')
    expect(order()).toEqual(['save-submit', 'save-cancel'])
    await click('save-cancel')

    await receive(w, 'a.json', toJsonText(buildExportFile(asUser([{ ...f2, name: 'A' }]), NOW)))
    expect(order()).toEqual([
      'import-add',
      'import-replace',
      'import-open',
      'import-add-open',
      'import-cancel',
    ])
    await click('import-open')
    expect(order()).toEqual(['import-open-ok', 'import-back'])
    await click('import-back')
    await click('import-replace')
    expect(order()).toEqual(['import-replace-ok', 'import-back'])
    await click('import-back')
    await click('import-add')
    expect(order()).toEqual(['import-overwrite', 'import-rename-ok', 'import-skip'])
  })
})

describe('保存先・取り込み先のフォルダ（判断ポイント69・70）', () => {
  // ストア: ゲーム ＞ ボス戦、作業用。ゲームに「曲」
  const folders = [
    { id: 'g', parentId: null, name: 'ゲーム' },
    { id: 'b', parentId: 'g', name: 'ボス戦' },
    { id: 'w', parentId: null, name: '作業用' },
  ]
  const storeWithFolders = (): ProfileStore => ({
    ...emptyStore(),
    folders: structuredClone(folders),
    profiles: [{ id: 'in-g', folderId: 'g', name: '曲', updatedAt: f1.updatedAt, data: f1.data }],
  })
  const pressed = (testid: string) => $(testid)!.getAttribute('aria-checked') === 'true'
  // 版2 のファイル: A ＞ B に p、ルートに r
  const structuredFile = () =>
    toJsonText({
      ...buildExportFile(
        asUser([
          { ...f1, name: 'p' },
          { ...f2, name: 'r' },
        ]),
        NOW,
      ),
      folders: [
        { id: 'fa', parentId: null, name: 'A' },
        { id: 'fb', parentId: 'fa', name: 'B' },
      ],
      profiles: asUser([
        { ...f1, name: 'p' },
        { ...f2, name: 'r' },
      ]).map((p, i) => (i === 0 ? { ...p, folderId: 'fb' } : p)),
    })
  const folderOf = (name: string) => {
    const s = stored()!
    const p = s.profiles.find((x) => x.name === name)!
    return ['ルート', ...pathNames(s, p.folderId)].join('/')
  }
  const pathNames = (s: ProfileStore, id: string | null): string[] => {
    const f = s.folders.find((x) => x.id === id)
    return f ? [...pathNames(s, f.parentId), f.name] : []
  }

  it('保存: 木の形で保存先を選べる。初期値はルート（対応するプロファイルがないとき）。選んだフォルダに保存する', async () => {
    putStore(storeWithFolders())
    await mountApp()
    await click('save-song')
    expect(pressed('save-folder-option-root')).toBe(true)
    // 木の順（親の次に子。兄弟は名前順）
    const options = [...document.querySelectorAll('[data-testid^="save-folder-option-"]')].map(
      (e) => e.textContent!.trim(),
    )
    expect(options).toEqual(['ルート', 'ゲーム', 'ボス戦', '作業用'])
    await click('save-folder-option-b')
    expect(pressed('save-folder-option-b')).toBe(true)
    await type('save-name', '曲')
    // ボス戦には「曲」がないので、上書きの確認なしで保存する
    await click('save-submit')
    expect($('save-confirm-overwrite')).toBeNull()
    expect(folderOf('曲')).toBe('ルート/ゲーム')
    const saved = stored()!.profiles.filter((p) => p.name === '曲')
    expect(saved.map((p) => p.folderId)).toEqual(['g', 'b'])
    expect(editor().currentProfileId.value).toBe(saved[1]!.id)
  })

  it('保存: 同名の判定は保存先の中（確認から戻って保存先を変えれば、確認なしで保存する）', async () => {
    putStore(storeWithFolders())
    await mountApp()
    editor().replaceSong(f2.data, 'in-g')
    await click('save-song')
    expect(pressed('save-folder-option-g')).toBe(true)
    await click('save-submit')
    expect($('save-confirm-overwrite')!.textContent).toContain(
      '「ルート ＞ ゲーム」にすでにあります',
    )
    await click('save-cancel')
    await click('save-folder-option-w')
    await click('save-submit')
    expect($('save-confirm-overwrite')).toBeNull()
    expect(stored()!.profiles.map((p) => p.folderId)).toEqual(['g', 'w'])
    expect(stored()!.profiles[0]!.data).toEqual(f1.data)
  })

  it('書き出す: 保存先は「プロファイルにも保存する」がオンのときだけ選ぶ。ファイルには祖先のフォルダだけを入れる', async () => {
    putStore(storeWithFolders())
    await mountApp()
    await click('export-song')
    expect($('save-folder')).toBeNull()
    await click('save-also-store')
    expect($('save-folder')).not.toBeNull()
    await click('save-folder-option-b')
    await type('save-name', '新曲')
    await click('save-submit')
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file.folders.map((f) => f.name)).toEqual(['ゲーム', 'ボス戦'])
    expect(file.profiles.map((p) => [p.name, p.folderId])).toEqual([['新曲', 'b']])
  })

  it('取り込み: 取り込み先の初期値はルート（ヘッダーから）。選んだフォルダに入れる。版1 のファイルは構成の選択を出さない', async () => {
    putStore(storeWithFolders())
    const w = await mountApp()
    const v1 = {
      schemaVersion: 1,
      exportType: 'profiles',
      exportedAt: '2026-10-01T00:00:00+09:00',
      profiles: [{ name: '版1', updatedAt: '2026-10-01T00:00:00+09:00', data: f2.data }],
    }
    await receive(w, 'v1.json', JSON.stringify(v1))
    expect(pressed('import-target-option-root')).toBe(true)
    expect($('import-keep-structure')).toBeNull()
    await click('import-target-option-w')
    await click('import-add')
    expect(folderOf('版1')).toBe('ルート/作業用')
  })

  it('取り込み: 版2 のファイルは「フォルダ構成を保つ」（初期値オン）。取り込み先の下に再現し、同じ名前に合流する', async () => {
    putStore({
      ...storeWithFolders(),
      folders: [...folders, { id: 'ea', parentId: 'w', name: 'A' }],
    })
    const w = await mountApp()
    await receive(w, 'v2.json', structuredFile())
    expect($<HTMLButtonElement>('import-keep-structure')!.getAttribute('aria-checked')).toBe('true')
    await click('import-target-option-w')
    await click('import-add')
    expect(folderOf('p')).toBe('ルート/作業用/A/B')
    expect(folderOf('r')).toBe('ルート/作業用')
    // 作業用 ＞ A は既存（合流）。B だけ作る
    expect(
      stored()!
        .folders.filter((f) => f.name === 'A')
        .map((f) => f.id),
    ).toEqual(['ea'])
    expect(stored()!.folders).toHaveLength(5)
  })

  it('取り込み: 「フォルダ構成を保つ」を外すと、全件を取り込み先に入れる', async () => {
    putStore(storeWithFolders())
    const w = await mountApp()
    await receive(w, 'v2.json', structuredFile())
    await click('import-keep-structure')
    await click('import-target-option-g')
    await click('import-add')
    expect([folderOf('p'), folderOf('r')]).toEqual(['ルート/ゲーム', 'ルート/ゲーム'])
    expect(stored()!.folders).toHaveLength(3)
  })

  it('取り込み: 衝突の確認に、入る先のフォルダを出す', async () => {
    putStore(storeWithFolders())
    const w = await mountApp()
    await receive(w, 'a.json', toJsonText(buildExportFile(asUser([{ ...f2, name: '曲' }]), NOW)))
    await click('import-target-option-g')
    await click('import-add')
    expect($('import-conflict')!.textContent).toContain('「ルート ＞ ゲーム」にあります')
  })

  it('置換: 選んだプロファイルと必要なフォルダだけで入れ替える（構成を保つ）', async () => {
    putStore(storeWithFolders())
    const w = await mountApp()
    await receive(w, 'v2.json', structuredFile())
    await click('import-select-1')
    await click('import-replace')
    await click('import-replace-ok')
    expect(stored()!.folders.map((f) => f.name)).toEqual(['A', 'B'])
    expect(folderOf('p')).toBe('ルート/A/B')
    expect(stored()!.profiles).toHaveLength(1)
  })

  it('ストア拒否中は、取り込み先とフォルダ構成を出さない', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, '{')
    const w = await mountApp()
    await receive(w, 'v2.json', structuredFile())
    expect($('import-target')).toBeNull()
    expect($('import-keep-structure')).toBeNull()
  })
})
