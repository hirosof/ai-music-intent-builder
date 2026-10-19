// 保存の画面（U4d。jsdom で構造と操作だけ）: 保存・書き出す（M3・M4）、プロファイルのポップアップ（M6）、ファイルの取り込み（M5）。
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
    expect(editor().currentProfileName.value).toBe('曲A')
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

describe('書き出す（M4）', () => {
  it('保存してから、その1件をファイルに書き出す（名前.json）', async () => {
    await mountApp()
    await click('export-song')
    await type('save-name', '曲B')
    await click('save-submit')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['曲B'])
    expect(downloads.map((d) => d.name)).toEqual(['曲B.json'])
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file).toMatchObject({ schemaVersion: 1, exportType: 'profiles' })
    expect(file.profiles).toEqual(stored()!.profiles)
  })

  it('ストアが拒否されているときは、保存せずにファイルにだけ書き出す', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, '{')
    await mountApp()
    await click('export-song')
    await type('save-name', '曲C')
    expect($('save-store-rejected')!.textContent).toContain('保存せずにファイルにだけ書き出します')
    await click('save-submit')
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe('{')
    expect(downloads.map((d) => d.name)).toEqual(['曲C.json'])
    const file = JSON.parse(await downloads[0]!.blob.text()) as ExportFile
    expect(file.profiles[0]!.data).toEqual(editor().savedSong.value)
  })
})

describe('プロファイルのポップアップ（M6）', () => {
  const twoProfiles = () =>
    saveProfile(
      saveProfile(emptyStore(), 'いろは', f1.data, new Date('2026-10-01T00:00:00Z')),
      'あいう',
      f2.data,
      NOW,
    )
  const names = () =>
    [...document.querySelectorAll('[data-testid^="profile-"]')]
      .map((e) => e.getAttribute('data-testid')!)
      .filter((t) => !/^profile-(load|overwrite|export|delete)$/.test(t))
      .map((t) => t.slice('profile-'.length))

  it('一覧は更新日時の新しい順で、名前で絞り込める', async () => {
    putStore(twoProfiles())
    await mountApp()
    await click('open-profiles')
    expect(names()).toEqual(['あいう', 'いろは'])
    await type('profiles-search', 'イロ')
    expect(names()).toEqual(['いろは'])
  })

  it('読み込むは確認を挟み、編集中の内容を置き換えて名前を覚える。「いいえ」なら変わらない', async () => {
    putStore(twoProfiles())
    await mountApp()
    await click('open-profiles')
    const row = $('profile-いろは')
    await click('profile-load', row)
    expect($('profiles-confirm')!.textContent).toContain('編集中の内容は破棄されます')
    await click('profiles-confirm-no')
    expect(editor().song.value).toEqual(createInitialSong(spec))
    await click('profile-load', $('profile-いろは'))
    await click('profiles-confirm-yes')
    expect(editor().song.value).toEqual(f1.data)
    expect(editor().currentProfileName.value).toBe('いろは')
  })

  it('ファクトリーは読み込むだけで、名前は覚えない', async () => {
    await mountApp()
    await click('open-profiles')
    const tab = [...document.querySelectorAll('button[role="tab"]')].find((b) =>
      b.textContent?.includes('ファクトリー'),
    ) as HTMLElement
    tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    await flushPromises()
    await click('factory-load', $(`factory-${f2.name}`))
    await click('profiles-confirm-yes')
    expect(editor().song.value).toEqual(f2.data)
    expect(editor().currentProfileName.value).toBeNull()
  })

  it('上書き保存と削除は確認を挟む。すべて書き出す', async () => {
    putStore(twoProfiles())
    await mountApp()
    editor().song.value.requests[0]!.output.variantCount = 7
    await click('open-profiles')
    await click('profile-overwrite', $('profile-いろは'))
    await click('profiles-confirm-yes')
    expect(
      stored()!.profiles.find((p) => p.name === 'いろは')!.data.requests[0]!.output.variantCount,
    ).toBe(7)
    expect(editor().currentProfileName.value).toBe('いろは')
    await click('profile-delete', $('profile-いろは'))
    await click('profiles-confirm-yes')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['あいう'])
    expect(editor().currentProfileName.value).toBeNull()
    await click('profiles-export-all')
    expect(downloads).toHaveLength(1)
    expect(downloads[0]!.name).toBe('あいう.json')
  })

  it('未完成なら上書き保存できない', async () => {
    putStore(twoProfiles())
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(incompleteSong()))
    await mountApp()
    await click('open-profiles')
    await click('profile-overwrite', $('profile-いろは'))
    expect($('profiles-overwrite-errors')).not.toBeNull()
    expect($<HTMLButtonElement>('profiles-confirm-yes')!.disabled).toBe(true)
  })

  it('ストアが拒否されていると、理由を出し、操作を出さない', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify({ schemaVersion: 9, profiles: [] }))
    await mountApp()
    await click('open-profiles')
    expect($('profiles-rejected')!.textContent).toContain('F8 新しい版')
    expect($('profiles-export-all')).toBeNull()
  })
})

describe('ファイルの取り込み（M5）', () => {
  const fileText = (...ps: { name: string; data: SongData }[]) =>
    toJsonText(
      buildExportFile(
        ps.map((p) => ({ ...p, updatedAt: '2026-10-01T00:00:00+09:00' })),
        NOW,
      ),
    )

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
      saveProfile(
        saveProfile(saveProfile(emptyStore(), 'A', f1.data, NOW), 'B', f1.data, NOW),
        'C',
        f1.data,
        NOW,
      ),
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
    putStore(saveProfile(saveProfile(emptyStore(), 'A', f1.data, NOW), 'B', f1.data, NOW))
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
    putStore(saveProfile(saveProfile(emptyStore(), 'A', f1.data, NOW), 'Z', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'A', data: f2.data }))
    await click('import-add')
    await type('import-rename', 'Z')
    expect($<HTMLButtonElement>('import-rename-ok')!.disabled).toBe(true)
    expect(document.body.textContent).toContain('その名前もすでにあります')
  })

  it('置換は確認を挟んで、ストアを入れ替える', async () => {
    putStore(saveProfile(emptyStore(), 'old', f1.data, NOW))
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'new', data: f2.data }))
    await click('import-replace')
    expect($('import-confirm-replace')).not.toBeNull()
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['old'])
    await click('import-replace-ok')
    expect(stored()!.profiles.map((p) => p.name)).toEqual(['new'])
  })

  it('ストアが拒否されていると取り込めない', async () => {
    localStorage.setItem(STORAGE_KEYS.profiles, '{')
    const w = await mountApp()
    await receive(w, 'a.json', fileText({ name: 'X', data: f1.data }))
    expect($('import-store-rejected')).not.toBeNull()
    expect($('import-add')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe('{')
  })

  it('衝突の確認の途中で閉じると、何も書き込まない', async () => {
    putStore(saveProfile(emptyStore(), 'A', f1.data, NOW))
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
