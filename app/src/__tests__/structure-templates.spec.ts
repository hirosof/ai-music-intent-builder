// 曲の構成の入力欄: ひな型の保存・読み込み（UI 判断ポイント75）とドラッグでの並び替え（76）。jsdom で構造と操作だけ。ドラッグの実物は目視
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import Sortable from 'sortablejs'

import App from '../App.vue'
import EditorView from '@/views/EditorView.vue'
import { resetSongEditor, useSongEditor } from '@/composables/useSongEditor'
import { resetStructureTemplates } from '@/composables/useStructureTemplates'
import { commitTemplateStore, openTemplateStore, STORAGE_KEYS } from '@/data/storage'
import { spec } from '@/data/spec'
import { createInitialSong } from '@/domain/editor/initial'
import type { SectionElement, SongData, SongRequest } from '@/domain/types/song'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  resetSongEditor()
  resetStructureTemplates()
  localStorage.clear()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

async function mountApp(song: SongData) {
  localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(song))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: EditorView }],
  })
  router.push('/')
  await router.isReady()
  wrapper = mount(App, { global: { plugins: [router, ui] }, attachTo: document.body })
  await flushPromises()
}
const req = (): SongRequest => useSongEditor().request.value
const $ = <T extends Element = HTMLElement>(testid: string) =>
  document.querySelector<T>(`[data-testid="${testid}"]`)
async function click(testid: string) {
  const el = $(testid)
  if (!el) throw new Error(`見つからない: ${testid}`)
  el.click()
  await flushPromises()
}
async function type(testid: string, value: string) {
  const el = $(testid)
  const input = el instanceof HTMLInputElement ? el : el?.querySelector('input')
  if (!input) throw new Error(`入力欄が見つからない: ${testid}`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}
const button = (testid: string) => $<HTMLButtonElement>(testid)!
const songWith = (mutate: (r: SongRequest) => void): SongData => {
  const s = createInitialSong(spec)
  mutate(s.requests[0]!)
  return s
}
const specifiedSong = (value: SectionElement[], vocal = false) =>
  songWith((r) => {
    r.axes.structure = { state: 'specified', value }
    if (vocal) {
      r.vocalMode = 'vocal'
      r.lyricsAuthor = 'chat-ai'
    }
  })
const instrumental = () => specifiedSong([{ id: 'intro' }, { id: 'chorus' }, { id: 'outro' }])
const storedTemplates = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.structureTemplates) ?? 'null')
const seedTemplates = (...templates: unknown[]) =>
  localStorage.setItem(
    STORAGE_KEYS.structureTemplates,
    JSON.stringify({ schemaVersion: 1, templates }),
  )
const tpl = (name: string, sections: SectionElement[], id = name) => ({
  id,
  name,
  updatedAt: '2026-11-01T10:00:00+09:00',
  sections,
})
/** 行の中のボタン */
const rowButton = (name: string, testid: string) =>
  $(`template-row-${name}`)!.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)!
async function openEditor(vocal = false) {
  await click(vocal ? 'edit-lyrics' : 'edit-structure')
}
const SAVED_SECTIONS = [{ id: 'verse' }, { id: 'chorus' }]

describe('ひな型として保存', () => {
  it('①指定で並びが空でないときだけ押せる', async () => {
    await mountApp(songWith((r) => (r.axes.structure = { state: 'delegated' })))
    await openEditor()
    expect(button('template-save-open').disabled).toBe(true)
    // ①を選んでも、並びが空のあいだは押せない
    await click('state-structure-specified')
    expect($('pending-hint-structure')).not.toBeNull()
    expect(button('template-save-open').disabled).toBe(true)
  })

  it('一時保持の値があっても、①指定でなければ押せない', async () => {
    await mountApp(
      songWith((r) => (r.axes.structure = { state: 'delegated', value: [{ id: 'intro' }] })),
    )
    await openEditor()
    expect(button('template-save-open').disabled).toBe(true)
  })

  it('インストで保存すると sung を持たない。名前の前後の空白は除く', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    expect($('template-save-sections')!.textContent).toContain('イントロ → サビ → アウトロ')
    expect(button('template-save-submit').disabled).toBe(true)
    await type('template-save-name', '  基本  ')
    await click('template-save-submit')
    const stored = storedTemplates()
    expect(stored.schemaVersion).toBe(1)
    expect(stored.templates).toHaveLength(1)
    expect(stored.templates[0].name).toBe('基本')
    expect(stored.templates[0].id).toEqual(expect.any(String))
    expect(stored.templates[0].sections).toEqual([
      { id: 'intro' },
      { id: 'chorus' },
      { id: 'outro' },
    ])
  })

  it('歌ありで保存すると sung を持つ', async () => {
    await mountApp(
      specifiedSong(
        [
          { id: 'intro', sung: true },
          { id: 'chorus', sung: false },
        ],
        true,
      ),
    )
    await openEditor(true)
    await click('template-save-open')
    await type('template-save-name', '歌')
    await click('template-save-submit')
    expect(storedTemplates().templates[0].sections).toEqual([
      { id: 'intro', sung: true },
      { id: 'chorus', sung: false },
    ])
  })

  it('同じ名前は上書きの確認を出す。やめれば変えず、上書きは id を保って中身を替える', async () => {
    seedTemplates(tpl('基本', SAVED_SECTIONS, 'keep-id'))
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    await type('template-save-name', '基本')
    await click('template-save-submit')
    expect($('template-save-confirm')).not.toBeNull()
    expect(storedTemplates().templates[0].sections).toEqual(SAVED_SECTIONS)
    await click('template-save-cancel')
    expect($('template-save-confirm')).toBeNull()
    expect($('template-save-name')).not.toBeNull()
    await click('template-save-submit')
    await click('template-save-submit')
    const t = storedTemplates().templates
    expect(t).toHaveLength(1)
    expect(t[0].id).toBe('keep-id')
    expect(t[0].sections).toHaveLength(3)
    expect(t[0].updatedAt).not.toBe('2026-11-01T10:00:00+09:00')
  })

  it('拒否したストアには書き込まない。理由を出し、保存を押せない', async () => {
    const bad = JSON.stringify({ schemaVersion: 2, templates: [] })
    localStorage.setItem(STORAGE_KEYS.structureTemplates, bad)
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    expect($('template-save-rejected')!.textContent).toContain('新しい版')
    await type('template-save-name', '基本')
    expect(button('template-save-submit').disabled).toBe(true)
    await click('template-save-submit')
    expect(localStorage.getItem(STORAGE_KEYS.structureTemplates)).toBe(bad)
  })

  it('保存の失敗（容量の超過など）は理由を出し、範囲を閉じない', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    await type('template-save-name', '基本')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key) => {
      if (key === STORAGE_KEYS.structureTemplates) throw new Error('容量を超えました')
    })
    await click('template-save-submit')
    expect($('template-save-failure')!.textContent).toContain('容量を超えました')
    expect($('template-save-name')).not.toBeNull()
  })
})

describe('ひな型から読み込む', () => {
  it('ひな型がなければその旨を出す', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    expect($('template-empty')).not.toBeNull()
  })

  it('一覧は名前順で、名前と並びを出す。歌ありのときは「（歌なし）」も', async () => {
    seedTemplates(
      tpl('ん', [{ id: 'chorus' }]),
      tpl('あ', [{ id: 'intro' }, { id: 'chorus', sung: true }]),
    )
    await mountApp(specifiedSong([{ id: 'intro', sung: false }], true))
    await openEditor(true)
    await click('template-load-open')
    const rows = [...$('template-list')!.children].map((e) => e.getAttribute('data-testid'))
    expect(rows).toEqual(['template-row-あ', 'template-row-ん'])
    // sung のない要素は、読み込むときと同じく defaultSung で見せる
    expect($('template-row-あ')!.textContent).toContain('イントロ（歌なし） → サビ')
  })

  it('インストの一覧には「（歌なし）」を出さない', async () => {
    seedTemplates(tpl('あ', [{ id: 'intro', sung: false }]))
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    expect($('template-row-あ')!.textContent).not.toContain('歌なし')
  })

  it('並びが空なら確認なしで読み込み、状態を①指定にする', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(songWith((r) => (r.axes.structure = { state: 'delegated' })))
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-select').click()
    await flushPromises()
    expect($('template-confirm-replace')).toBeNull()
    expect(req().axes.structure).toEqual({ state: 'specified', value: SAVED_SECTIONS })
  })

  it('並びが空でなければ確認する。やめれば変えず、置き換えると並びが替わる', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-select').click()
    await flushPromises()
    expect($('template-confirm-replace')!.textContent).toContain('あ')
    expect(document.body.textContent).toContain('ひな型の並びで置き換えます。')
    expect(document.body.textContent).not.toContain('保存したひな型の一覧です。')
    await click('template-cancel')
    expect(req().axes.structure!.value).toHaveLength(3)
    expect($('template-list')).not.toBeNull()
    rowButton('あ', 'template-select').click()
    await flushPromises()
    await click('template-submit')
    expect(req().axes.structure!.value).toEqual(SAVED_SECTIONS)
  })

  it('一時保持の値があれば、①指定でなくても確認し、読み込むと①指定になる', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(
      songWith((r) => (r.axes.structure = { state: 'delegated', value: [{ id: 'intro' }] })),
    )
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-select').click()
    await flushPromises()
    await click('template-submit')
    expect(req().axes.structure).toEqual({ state: 'specified', value: SAVED_SECTIONS })
  })

  it('歌ありで読み込むと、sung のない要素に defaultSung を当てる', async () => {
    seedTemplates(tpl('あ', [{ id: 'intro' }, { id: 'chorus' }, { id: 'verse', sung: false }]))
    await mountApp(
      songWith((r) => {
        r.vocalMode = 'vocal'
        r.lyricsAuthor = 'chat-ai'
      }),
    )
    await openEditor(true)
    await click('template-load-open')
    rowButton('あ', 'template-select').click()
    await flushPromises()
    expect(req().axes.structure!.value).toEqual([
      { id: 'intro', sung: false },
      { id: 'chorus', sung: true },
      { id: 'verse', sung: false },
    ])
  })

  it('インストで読み込むと印は要素に残り、保存の正規化で外れる（判断ポイント74 の細部 (d)）', async () => {
    seedTemplates(tpl('あ', [{ id: 'intro', sung: true }]))
    await mountApp(songWith((r) => (r.axes.structure = { state: 'delegated' })))
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-select').click()
    await flushPromises()
    expect(req().axes.structure!.value).toEqual([{ id: 'intro', sung: true }])
    expect(useSongEditor().savedSong.value.requests[0]!.axes.structure!.value).toEqual([
      { id: 'intro' },
    ])
  })

  it('読み込んだあとに編集しても、ひな型は変わらない', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(songWith((r) => (r.axes.structure = { state: 'delegated' })))
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-select').click()
    await flushPromises()
    await click('down-structure-0')
    expect(req().axes.structure!.value).toEqual([{ id: 'chorus' }, { id: 'verse' }])
    await click('template-load-open')
    expect($('template-row-あ')!.textContent).toContain('Aメロ → サビ')
    expect(storedTemplates().templates[0].sections).toEqual(SAVED_SECTIONS)
  })

  it('名前の変更: 空・重複は押せない。変更は保存され、一覧に戻る', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS), tpl('い', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-rename').click()
    await flushPromises()
    await type('template-rename-name', 'い')
    expect(button('template-submit').disabled).toBe(true)
    await type('template-rename-name', '   ')
    expect(button('template-submit').disabled).toBe(true)
    await type('template-rename-name', ' う ')
    await click('template-submit')
    expect(
      storedTemplates().templates.map((t: { id: string; name: string }) => [t.id, t.name]),
    ).toEqual([
      ['あ', 'う'],
      ['い', 'い'],
    ])
    expect(storedTemplates().templates[0].updatedAt).toBe('2026-11-01T10:00:00+09:00')
    expect($('template-row-う')).not.toBeNull()
  })

  it('名前の変更: 使えない名前は Enter でも確定しない', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS), tpl('い', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-rename').click()
    await flushPromises()
    await type('template-rename-name', 'い')
    const root = $('template-rename-name')!
    const input = root instanceof HTMLInputElement ? root : root.querySelector('input')!
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect($('template-load-failure')).toBeNull()
    expect($('template-rename-name')).not.toBeNull()
    expect(storedTemplates().templates[0].name).toBe('あ')
  })

  it('削除: 確認してから消す。やめれば残る', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS), tpl('い', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-delete').click()
    await flushPromises()
    expect($('template-confirm-delete')!.textContent).toContain('あ')
    await click('template-cancel')
    expect(storedTemplates().templates).toHaveLength(2)
    rowButton('あ', 'template-delete').click()
    await flushPromises()
    await click('template-submit')
    expect(storedTemplates().templates.map((t: { name: string }) => t.name)).toEqual(['い'])
    expect($('template-row-あ')).toBeNull()
    expect(req().axes.structure!.value).toHaveLength(3)
  })

  it('名前の変更・削除の失敗は理由を出す', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-delete').click()
    await flushPromises()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key) => {
      if (key === STORAGE_KEYS.structureTemplates) throw new Error('容量を超えました')
    })
    await click('template-submit')
    expect($('template-load-failure')!.textContent).toContain('容量を超えました')
    expect($('template-confirm-delete')).not.toBeNull()
  })

  it('拒否したストア: 理由を出し、一覧を出さない。ストアは書き換えない', async () => {
    const bad = JSON.stringify({
      schemaVersion: 1,
      templates: [tpl('あ', [{ id: 'no-such-term' }])],
    })
    localStorage.setItem(STORAGE_KEYS.structureTemplates, bad)
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    expect($('template-load-rejected')!.textContent).toContain('不明な語 id: no-such-term')
    expect($('template-list')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.structureTemplates)).toBe(bad)
  })
})

describe("見せ方: その場で開く範囲（判断ポイント75 の細部 (c')）", () => {
  const dialogs = () => document.querySelectorAll('[role="dialog"], [role="alertdialog"]')
  const expanded = (testid: string) => $(testid)!.getAttribute('aria-expanded')

  it.each([
    ['template-save-open', 'template-save-panel'],
    ['template-load-open', 'template-load-panel'],
  ])(
    '%s: オーバーレイを重ねず、カードのポップアップの中の、ボタンのすぐ下に開く',
    async (open, id) => {
      await mountApp(instrumental())
      await openEditor()
      const before = [...dialogs()]
      expect(before).toHaveLength(1)
      expect($(id)).toBeNull()
      await click(open)
      expect([...dialogs()]).toEqual(before)
      const p = $(id)!
      expect(p.closest('[role="dialog"]')).toBe(before[0])
      // 入力欄の部品の中で、ボタンの並びの次の要素
      expect(p.previousElementSibling).toBe($(open)!.parentElement)
      expect($('sections-structure')!.parentElement).toBe(p.parentElement)
    },
  )

  it('確認に切り替えても、オーバーレイを重ねない（置き換え・削除・名前の変更・上書き）', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    for (const b of ['template-select', 'template-rename', 'template-delete']) {
      rowButton('あ', b).click()
      await flushPromises()
      expect(dialogs()).toHaveLength(1)
      await click('template-cancel')
    }
    await click('template-save-open')
    await type('template-save-name', 'あ')
    await click('template-save-submit')
    expect($('template-save-confirm')).not.toBeNull()
    expect(dialogs()).toHaveLength(1)
  })

  it('2つの範囲は同時に開かない', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    expect(expanded('template-save-open')).toBe('true')
    await click('template-load-open')
    expect($('template-save-panel')).toBeNull()
    expect($('template-load-panel')).not.toBeNull()
    expect(expanded('template-save-open')).toBe('false')
    expect(expanded('template-load-open')).toBe('true')
    await click('template-save-open')
    expect($('template-load-panel')).toBeNull()
    expect($('template-save-panel')).not.toBeNull()
  })

  it('同じボタンをもう一度押すと閉じる', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    await click('template-load-open')
    expect($('template-load-panel')).toBeNull()
    expect(expanded('template-load-open')).toBe('false')
    await click('template-save-open')
    await click('template-save-open')
    expect($('template-save-panel')).toBeNull()
  })

  it('「キャンセル」「一覧を閉じる」で閉じる。確認の中では前に戻るだけ', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    expect($('template-save-cancel')!.textContent!.trim()).toBe('キャンセル')
    await click('template-save-cancel')
    expect($('template-save-panel')).toBeNull()
    await click('template-load-open')
    expect($('template-cancel')!.textContent!.trim()).toBe('一覧を閉じる')
    rowButton('あ', 'template-delete').click()
    await flushPromises()
    expect($('template-cancel')!.textContent!.trim()).toBe('キャンセル')
    await click('template-cancel')
    expect($('template-list')).not.toBeNull()
    await click('template-cancel')
    expect($('template-load-panel')).toBeNull()
  })

  it('一覧の閉じる操作は、ポップアップの「閉じる」と文言が違う（細部 (q)）', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    const labels = [...dialogs()[0]!.querySelectorAll('button')].map((b) => b.textContent!.trim())
    expect(labels.filter((t) => t === '閉じる')).toHaveLength(1)
    expect(labels.filter((t) => t === '一覧を閉じる')).toHaveLength(1)
  })

  it('保存が終わったら閉じる', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    await type('template-save-name', '基本')
    await click('template-save-submit')
    expect($('template-save-panel')).toBeNull()
    expect(storedTemplates().templates).toHaveLength(1)
  })

  it('読み込みが終わったら閉じる（確認なし・確認あり）', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(songWith((r) => (r.axes.structure = { state: 'delegated' })))
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-select').click()
    await flushPromises()
    expect($('template-load-panel')).toBeNull()
    await click('template-load-open')
    rowButton('あ', 'template-select').click()
    await flushPromises()
    await click('template-submit')
    expect($('template-load-panel')).toBeNull()
  })

  it('名前の変更・削除のあとは、閉じずに一覧へ戻る', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS), tpl('い', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-load-open')
    rowButton('あ', 'template-delete').click()
    await flushPromises()
    await click('template-submit')
    expect($('template-list')).not.toBeNull()
    rowButton('い', 'template-rename').click()
    await flushPromises()
    await type('template-rename-name', 'う')
    await click('template-submit')
    expect($('template-row-う')).not.toBeNull()
  })

  it('開き直すと、前の入力・確認を持ち越さない', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    await type('template-save-name', 'あ')
    await click('template-save-submit')
    expect($('template-save-confirm')).not.toBeNull()
    await click('template-save-open')
    await click('template-save-open')
    expect($('template-save-confirm')).toBeNull()
    const root = $('template-save-name')!
    const input = root instanceof HTMLInputElement ? root : root.querySelector('input')!
    expect(input.value).toBe('')
    await click('template-load-open')
    rowButton('あ', 'template-delete').click()
    await flushPromises()
    await click('template-load-open')
    await click('template-load-open')
    expect($('template-confirm-delete')).toBeNull()
    expect($('template-list')).not.toBeNull()
  })

  // 重ねないので、範囲を開いたまま入力欄を操作できる
  it('保存の範囲を開いたまま並びを変えると、表示も保存する値も今の並びになる', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    await click('down-structure-0')
    expect($('template-save-sections')!.textContent).toContain('サビ → イントロ → アウトロ')
    await type('template-save-name', '基本')
    await click('template-save-submit')
    expect(storedTemplates().templates[0].sections).toEqual([
      { id: 'chorus' },
      { id: 'intro' },
      { id: 'outro' },
    ])
  })

  it('保存の範囲を開いたまま①指定をやめると閉じる（読み込みの範囲は閉じない）', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('template-save-open')
    await click('state-structure-delegated')
    expect($('template-save-panel')).toBeNull()
    expect(button('template-save-open').disabled).toBe(true)
    await click('state-structure-specified')
    expect($('template-save-panel')).toBeNull()
    await click('template-load-open')
    await click('state-structure-delegated')
    expect($('template-load-panel')).not.toBeNull()
  })

  it('読み込みの範囲を開いたまま並びが空でなくなると、確認を出す', async () => {
    seedTemplates(tpl('あ', SAVED_SECTIONS))
    await mountApp(songWith((r) => (r.axes.structure = { state: 'delegated' })))
    await openEditor()
    await click('template-load-open')
    req().axes.structure = { state: 'specified', value: [{ id: 'intro' }] }
    await flushPromises()
    rowButton('あ', 'template-select').click()
    await flushPromises()
    expect($('template-confirm-replace')).not.toBeNull()
  })
})

describe('ドラッグでの並び替え（判断ポイント76）', () => {
  const sortable = () => Sortable.get($('sections-structure')!)!
  /** Sortable が DOM を動かしたあとに通知するのと同じ順で、ドラッグの結果を起こす */
  async function drag(oldIndex: number, newIndex: number) {
    const from = $('sections-structure')!
    const item = from.children[oldIndex] as HTMLElement
    const rows = [...from.children].filter((e) => e !== item)
    from.insertBefore(item, rows[newIndex] ?? null)
    sortable().options.onUpdate!({ item, from, to: from, oldIndex, newIndex } as never)
    await flushPromises()
  }
  const shownIds = () =>
    [...$('sections-structure')!.children].map((e) => e.textContent!.match(/\.\s*(\S+?)上へ/)?.[1])

  it('ハンドルからだけドラッグを始める。各行の先頭にある', async () => {
    await mountApp(instrumental())
    await openEditor()
    expect(sortable().options.handle).toBe('[data-drag-handle]')
    const row = $('sections-structure')!.children[0]!
    expect(row.firstElementChild!.getAttribute('data-testid')).toBe('handle-structure-0')
    expect(row.firstElementChild!.hasAttribute('data-drag-handle')).toBe(true)
    // ドロワーの閉じる操作と取り違えない。スクロールと取り違えない
    expect(row.firstElementChild!.hasAttribute('data-vaul-no-drag')).toBe(true)
    expect(row.firstElementChild!.classList.contains('touch-none')).toBe(true)
  })

  it('離れた位置へ動かすと、値にすぐ反映し、表示もそろう（下へ・上へ）', async () => {
    await mountApp(instrumental())
    await openEditor()
    await drag(0, 2)
    expect(req().axes.structure).toEqual({
      state: 'specified',
      value: [{ id: 'chorus' }, { id: 'outro' }, { id: 'intro' }],
    })
    expect(shownIds()).toEqual(['サビ', 'アウトロ', 'イントロ'])
    await drag(2, 0)
    expect(req().axes.structure!.value).toEqual([
      { id: 'intro' },
      { id: 'chorus' },
      { id: 'outro' },
    ])
    expect(shownIds()).toEqual(['イントロ', 'サビ', 'アウトロ'])
  })

  it('末尾の行を動かしたあとも、行を足すと順序が崩れない', async () => {
    await mountApp(instrumental())
    await openEditor()
    await drag(2, 1)
    await click('up-structure-1')
    expect(shownIds()).toEqual(['アウトロ', 'イントロ', 'サビ'])
    await drag(2, 0)
    expect(shownIds()).toEqual(['サビ', 'アウトロ', 'イントロ'])
    // 新しい行は最後に並ぶ
    const list = req().axes.structure!.value as SectionElement[]
    req().axes.structure!.value = [...list, { id: 'verse' }]
    await flushPromises()
    expect(shownIds()).toEqual(['サビ', 'アウトロ', 'イントロ', 'Aメロ'])
  })

  // 同じ語があると、Vue は同じ key の行を動かさない。Sortable が動かした行を戻しておかないと、番号と並びがずれる
  const numbers = () =>
    [...$('sections-structure')!.children].map((e) => e.textContent!.match(/(\d+)\./)?.[1])

  it('同じ語が並んでいても、番号と並びがそろう（動かした行を元の位置に戻してから書く）', async () => {
    await mountApp(
      specifiedSong([{ id: 'chorus' }, { id: 'chorus' }, { id: 'chorus' }, { id: 'intro' }]),
    )
    await openEditor()
    await drag(0, 3)
    expect(shownIds()).toEqual(['サビ', 'サビ', 'イントロ', 'サビ'])
    expect(numbers()).toEqual(['1', '2', '3', '4'])
  })

  it('末尾の行を戻すときは v-for の目印の前に戻す（あとで足した行が末尾に並ぶ）', async () => {
    await mountApp(specifiedSong([{ id: 'chorus' }, { id: 'chorus' }]))
    await openEditor()
    await drag(1, 0)
    expect(numbers()).toEqual(['1', '2'])
    const list = req().axes.structure!.value as SectionElement[]
    req().axes.structure!.value = [...list, { id: 'verse' }]
    await flushPromises()
    expect(numbers()).toEqual(['1', '2', '3'])
  })

  it('歌の印は要素と一緒に動く', async () => {
    await mountApp(
      specifiedSong(
        [
          { id: 'intro', sung: false },
          { id: 'chorus', sung: true },
        ],
        true,
      ),
    )
    await openEditor(true)
    await drag(0, 1)
    expect(req().axes.structure!.value).toEqual([
      { id: 'chorus', sung: true },
      { id: 'intro', sung: false },
    ])
  })

  it('①指定以外はドラッグできない。①に戻すとできる', async () => {
    await mountApp(
      songWith((r) => (r.axes.structure = { state: 'delegated', value: [{ id: 'intro' }] })),
    )
    await openEditor()
    expect(sortable().option('disabled')).toBe(true)
    await click('state-structure-specified')
    expect(req().axes.structure!.state).toBe('specified')
    expect(sortable().option('disabled')).toBe(false)
    await click('state-structure-delegated')
    expect(sortable().option('disabled')).toBe(true)
  })

  it('最初から①指定ならドラッグできる', async () => {
    await mountApp(instrumental())
    await openEditor()
    expect(sortable().option('disabled')).toBe(false)
  })

  it('「上へ」「下へ」は残す', async () => {
    await mountApp(instrumental())
    await openEditor()
    await click('down-structure-0')
    expect(req().axes.structure!.value).toEqual([
      { id: 'chorus' },
      { id: 'intro' },
      { id: 'outro' },
    ])
    await click('up-structure-1')
    expect(req().axes.structure!.value).toEqual([
      { id: 'intro' },
      { id: 'chorus' },
      { id: 'outro' },
    ])
  })
})

describe('ひな型のストアの接続部（§13-4）', () => {
  const good = () => ({ schemaVersion: 1, templates: [tpl('あ', SAVED_SECTIONS)] })

  it('値がなければ空のストア。正しければ読む', () => {
    expect(openTemplateStore()).toEqual({
      status: 'ok',
      store: { schemaVersion: 1, templates: [] },
    })
    localStorage.setItem(STORAGE_KEYS.structureTemplates, JSON.stringify(good()))
    expect(openTemplateStore()).toEqual({ status: 'ok', store: good() })
  })
  it('拒否した理由を返す（書き戻さない）', () => {
    const bad = '{"schemaVersion":99,"templates":[]}'
    localStorage.setItem(STORAGE_KEYS.structureTemplates, bad)
    const s = openTemplateStore()
    expect(s.status).toBe('rejected')
    expect(s.status === 'rejected' && s.errors[0]).toContain('新しい版')
    expect(localStorage.getItem(STORAGE_KEYS.structureTemplates)).toBe(bad)
  })
  it('localStorage を読めなければ拒否', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('使えない')
    })
    const s = openTemplateStore()
    expect(s.status === 'rejected' && s.errors[0]).toContain('使えない')
  })
  it('拒否したストアには書き込まない', () => {
    const c = commitTemplateStore({ status: 'rejected', errors: ['理由'] }, good())
    expect(c.ok).toBe(false)
    expect(!c.ok && c.errors).toContain('理由')
    expect(localStorage.getItem(STORAGE_KEYS.structureTemplates)).toBeNull()
  })
  it('検査に通らない中身は書き込まない', () => {
    const next = { schemaVersion: 1, templates: [tpl('あ', [{ id: 'no-such-term' }])] }
    const c = commitTemplateStore({ status: 'ok', store: good() }, next)
    expect(!c.ok && c.errors[0]).toContain('不明な語 id: no-such-term')
    expect(localStorage.getItem(STORAGE_KEYS.structureTemplates)).toBeNull()
  })
  it('書き込めたら、状態は次のストアになる', () => {
    const c = commitTemplateStore({ status: 'ok', store: good() }, good())
    expect(c).toEqual({ ok: true, state: { status: 'ok', store: good() } })
    expect(storedTemplates()).toEqual(good())
  })
})
