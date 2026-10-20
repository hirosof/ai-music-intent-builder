// 階層テーブル（U4c。jsdom で構造と操作だけ。見た目は目視）: 主ジャンル（L1）、副ジャンル、楽器の統合テーブル（L2）、
// 検索と開閉、非表示の語と転記（L3）
import { afterEach, describe, it, expect } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'

import App from '../App.vue'
import EditorView from '@/views/EditorView.vue'
import { resetSongEditor, useSongEditor } from '@/composables/useSongEditor'
import { resetUiSettings } from '@/composables/useUiSettings'
import { STORAGE_KEYS } from '@/data/storage'
import { spec } from '@/data/spec'
import type { SongRequest } from '@/domain/types/song'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  resetSongEditor()
  resetUiSettings()
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
const req = (): SongRequest => useSongEditor().request.value
const $ = <T extends Element = HTMLElement>(testid: string) =>
  document.querySelector<T>(`[data-testid="${testid}"]`)
const $$ = (prefix: string) => [...document.querySelectorAll(`[data-testid^="${prefix}"]`)]
async function click(testid: string) {
  const el = $(testid)
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
const genre = spec.vocabularyById.get('genre')!
const firstCat = [...genre.categories!].sort((a, b) => a.order - b.order)[0]!

describe('主ジャンル（L1）', () => {
  it('カテゴリ16行で始まり、クリックで開閉する', async () => {
    await mountApp()
    await click('edit-basic')
    await click('fold-mainGenre')
    await click('fold-subGenres')
    expect($$('tree-mainGenre-cat-')).toHaveLength(16)
    expect($$('tree-mainGenre-row-')).toHaveLength(0)
    await click(`tree-mainGenre-cat-${firstCat.id}`)
    expect($$('tree-mainGenre-row-').length).toBeGreaterThan(0)
    await click(`tree-mainGenre-cat-${firstCat.id}`)
    expect($$('tree-mainGenre-row-')).toHaveLength(0)
  })

  it('「選ぶ」で①指定になり、今の選択とカードに出る。「お任せ」で戻る（値は残る）', async () => {
    await mountApp()
    await click('edit-basic')
    await click('fold-mainGenre')
    await click('fold-subGenres')
    expect($('current-mainGenre')!.textContent).toBe('お任せ')
    await click(`tree-mainGenre-cat-${firstCat.id}`)
    const id = firstCat.itemOrder[0]!
    await click(`pick-mainGenre-${id}`)
    expect(req().axes.mainGenre).toEqual({ state: 'specified', value: id })
    const label = genre.items.find((i) => i.id === id)!.label
    expect($('current-mainGenre')!.textContent).toBe(label)
    expect($('row-mainGenre')!.textContent).toBe(label)
    expect($(`pick-mainGenre-${id}`)!.textContent).toContain('選択中')
    await click('pseudo-mainGenre-__delegated')
    expect(req().axes.mainGenre).toEqual({ state: 'delegated', value: id })
    expect($('row-mainGenre')!.textContent).toBe('お任せ')
  })

  it('検索で開き、消すと検索前の開閉に戻る', async () => {
    await mountApp()
    await click('edit-basic')
    await click('fold-mainGenre')
    await click('fold-subGenres')
    await type('tree-mainGenre-search', 'してぃぽっぷ')
    expect(
      $$('tree-mainGenre-row-').some((e) => e.getAttribute('data-testid')!.endsWith('/city-pop')),
    ).toBe(true)
    expect($$('tree-mainGenre-cat-').length).toBeLessThan(16)
    await type('tree-mainGenre-search', '')
    expect($$('tree-mainGenre-cat-')).toHaveLength(16)
    expect($$('tree-mainGenre-row-')).toHaveLength(0)
  })

  it('カテゴリ名で検索すると、配下の語がすべて残る', async () => {
    await mountApp()
    await click('edit-basic')
    await click('fold-mainGenre')
    await click('fold-subGenres')
    await type('tree-mainGenre-search', firstCat.label)
    const shown = $$('tree-mainGenre-row-').filter((e) =>
      e.getAttribute('data-testid')!.startsWith(`tree-mainGenre-row-${firstCat.id}/`),
    )
    const visible = firstCat.itemOrder.filter(
      (id) => genre.items.find((i) => i.id === id)?.defaultVisible !== false,
    )
    expect(shown).toHaveLength(visible.length)
  })

  it('非表示の語も表示すると、印と理由が出る。選べない語は自由記述へ転記する', async () => {
    await mountApp()
    await click('edit-basic')
    await click('fold-mainGenre')
    await click('fold-subGenres')
    await type('tree-mainGenre-search', ' ')
    const before = $$('tree-mainGenre-row-').length
    await type('tree-mainGenre-search', '')
    $('tree-mainGenre-show-hidden')!.click()
    await flushPromises()
    // 全カテゴリを開いて数える
    const catIds = $$('tree-mainGenre-cat-').map((e) => e.getAttribute('data-testid')!)
    for (const t of catIds) await click(t)
    expect($$('tree-mainGenre-row-').length).toBeGreaterThan(before)
    expect(document.body.textContent).toContain('非表示の語')
    const other = genre.items.find((i) => i.exclusion?.kind === 'other-axis')!
    expect($(`pick-mainGenre-${other.id}`)).toBeNull()
    await click(`tree-mainGenre-transfer-${other.id}`)
    expect(req().axes.mainGenre).toEqual({ state: 'specified', freeText: other.label })
    await click(`tree-mainGenre-transfer-${other.id}`)
    expect(req().axes.mainGenre!.freeText).toBe(other.label)
  }, 20_000) // 385語を全部開くため、並列の全体実行では既定の5秒を超えることがある
})

describe('副ジャンル', () => {
  it('開いた一覧で選ぶと①指定になる。①で使用する・使用しないを選び、一覧に出る', async () => {
    await mountApp()
    await click('edit-basic')
    await click('fold-mainGenre')
    await click('fold-subGenres')
    await click(`tree-subGenres-cat-${firstCat.id}`)
    const [a, b] = firstCat.itemOrder
    expect(req().axes.subGenres).toBeUndefined()
    await click(`choice-subGenres-${a}-use`)
    await click(`choice-subGenres-${b}-exclude`)
    expect(req().axes.subGenres).toEqual({
      state: 'specified',
      choices: { [a!]: 'use', [b!]: 'exclude' },
    })
    const summary = $('summary-subGenres')!.textContent!
    expect(summary).toContain(genre.items.find((i) => i.id === a)!.label)
    await click(`choice-subGenres-${a}-none`)
    expect(req().axes.subGenres!.choices).toEqual({ [b!]: 'exclude' })
  })
})

describe('楽器の統合テーブル（L2）', () => {
  it('1つのテーブルで、伴奏・リズムの項目は個別に出ない', async () => {
    await mountApp()
    await click('edit-sound')
    expect($('instrument-table')).not.toBeNull()
    expect($('editor-accompanimentInstruments')).toBeNull()
    expect($('editor-rhythmInstruments')).toBeNull()
    expect($('editor-voiceTreatment')).not.toBeNull()
  })

  it('すべて②のあいだは畳む。開くと、②の役割はチェックできず、①の役割がなければ除外できない', async () => {
    await mountApp()
    await click('edit-sound')
    expect($('tree-instruments')).toBeNull()
    await click('fold-instruments')
    ;($$('tree-instruments-cat-')[0] as HTMLElement).click()
    await flushPromises()
    const id = $$('exclude-')[0]!.getAttribute('data-testid')!.slice('exclude-'.length)
    expect($<HTMLButtonElement>(`use-leadInstruments-${id}`)!.disabled).toBe(true)
    expect($<HTMLButtonElement>(`exclude-${id}`)!.disabled).toBe(true)
    expect(document.body.textContent).toContain(
      '除外は、少なくとも1つの役割を「指定」にすると使えます',
    )
  })

  it('チェックで使用、除外は①の役割すべてへ。除外中はチェックできない。外すと全役割から消える', async () => {
    await mountApp()
    await click('edit-sound')
    await click('state-leadInstruments-specified')
    await click('state-accompanimentInstruments-specified')
    ;($$('tree-instruments-cat-')[0] as HTMLElement).click()
    await flushPromises()
    const [x, y] = $$('exclude-').map((e) =>
      e.getAttribute('data-testid')!.slice('exclude-'.length),
    )
    await click(`use-leadInstruments-${x}`)
    await click(`exclude-${y}`)
    expect(req().axes.leadInstruments!.choices).toEqual({ [x!]: 'use', [y!]: 'exclude' })
    expect(req().axes.accompanimentInstruments!.choices).toEqual({ [y!]: 'exclude' })
    expect(req().axes.rhythmInstruments).toBeUndefined()
    expect($<HTMLButtonElement>(`use-accompanimentInstruments-${y}`)!.disabled).toBe(true)
    expect($('summary-instruments')!.textContent).toContain('除外:')
    await click(`exclude-${y}`)
    expect(req().axes.leadInstruments!.choices).toEqual({ [x!]: 'use' })
    expect(req().axes.accompanimentInstruments!.choices).toEqual({})
  })

  it('②の役割を①にすると、除外が写る', async () => {
    await mountApp()
    await click('edit-sound')
    await click('state-leadInstruments-specified')
    ;($$('tree-instruments-cat-')[0] as HTMLElement).click()
    await flushPromises()
    const y = $$('exclude-')[0]!.getAttribute('data-testid')!.slice('exclude-'.length)
    await click(`exclude-${y}`)
    await click('state-rhythmInstruments-specified')
    expect(req().axes.rhythmInstruments!.choices).toEqual({ [y]: 'exclude' })
  })
})

describe('UI 設定の反映（L3）', () => {
  it('UI 設定で非表示にした語は、テーブルに出ない', async () => {
    const id = firstCat.itemOrder[0]!
    localStorage.setItem(
      STORAGE_KEYS.uiSettings,
      JSON.stringify({ schemaVersion: 1, termVisibility: { genre: { [id]: false } } }),
    )
    await mountApp()
    await click('edit-basic')
    await click('fold-mainGenre')
    await click('fold-subGenres')
    await click(`tree-mainGenre-cat-${firstCat.id}`)
    expect($(`pick-mainGenre-${id}`)).toBeNull()
    expect($(`pick-mainGenre-${firstCat.itemOrder[1]}`)).not.toBeNull()
  })
})
