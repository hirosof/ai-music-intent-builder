// 辞典設定（U4e の決定 N3）、UI 設定の反映（N4）、カードの警告（N2）。jsdom で構造と操作だけ
import { afterEach, describe, it, expect } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'

import App from '../App.vue'
import EditorView from '@/views/EditorView.vue'
import DictionaryView from '@/views/DictionaryView.vue'
import { resetProfileStore } from '@/composables/useProfileStore'
import { resetSongEditor } from '@/composables/useSongEditor'
import { resetUiSettings } from '@/composables/useUiSettings'
import { STORAGE_KEYS } from '@/data/storage'
import { spec } from '@/data/spec'
import { selectOptions } from '@/domain/editor/edit'
import { createInitialSong } from '@/domain/editor/initial'
import type { UiSettings } from '@/domain/storage/ui-settings'

let wrapper: VueWrapper | undefined
let router: Router
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  resetSongEditor()
  resetProfileStore()
  resetUiSettings()
  localStorage.clear()
  document.body.innerHTML = ''
})

async function mountApp(path = '/') {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: EditorView },
      { path: '/dictionary', component: DictionaryView },
    ],
  })
  router.push(path)
  await router.isReady()
  wrapper = mount(App, { global: { plugins: [router, ui] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}
const $ = <T extends Element = HTMLElement>(testid: string) =>
  document.querySelector<T>(`[data-testid="${testid}"]`)
async function click(testid: string) {
  const el = $(testid)
  if (!el) throw new Error(`見つからない: ${testid}`)
  el.click()
  await flushPromises()
}
const ui_ = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.uiSettings) ?? 'null') as UiSettings | null
const genre = spec.vocabularyById.get('genre')!
const pop = [...genre.categories!].sort((a, b) => a.order - b.order)[0]!

describe('辞典設定（N3）', () => {
  it('サイドメニューから開ける。既定はジャンルで、件数を出す', async () => {
    await mountApp()
    expect($('side-nav')!.textContent).toContain('辞典設定')
    await router.push('/dictionary')
    await flushPromises()
    expect($('dict-count')!.textContent).toBe('385語（うち非表示 180語）')
    expect(document.querySelectorAll('[data-testid^="dict-group-"]')).toHaveLength(16)
  })

  it('語の表示を切り替えると、すぐ UI 設定に保存され、既定に戻すと設定から消える', async () => {
    await mountApp('/dictionary')
    const id = pop.itemOrder[0]!
    await click(`dict-toggle-${id}`)
    expect(ui_()!.termVisibility).toEqual({ genre: { [id]: false } })
    expect($('dict-count')!.textContent).toBe('385語（うち非表示 181語）')
    await click(`dict-toggle-${id}`)
    expect(ui_()!.termVisibility).toEqual({})
  })

  it('カテゴリごとに、すべて非表示・すべて表示・既定に戻す', async () => {
    await mountApp('/dictionary')
    await click(`dict-hide-${pop.id}`)
    const hidden = Object.keys(ui_()!.termVisibility.genre ?? {})
    expect(hidden.length).toBeGreaterThan(0)
    expect(Object.values(ui_()!.termVisibility.genre!).every((v) => v === false)).toBe(true)
    await click(`dict-show-${pop.id}`)
    expect(Object.values(ui_()!.termVisibility.genre ?? {}).every((v) => v === true)).toBe(true)
    // 切り替えられない語（軸が違う語・保留の語）は、一括でも変えない
    const fixed = genre.items
      .filter((i) => ['other-axis', 'hold'].includes(i.exclusion?.kind ?? ''))
      .map((i) => i.id)
    expect(pop.itemOrder.some((id) => fixed.includes(id))).toBe(true)
    for (const id of fixed) expect(ui_()!.termVisibility.genre?.[id]).toBeUndefined()
    await click(`dict-reset-${pop.id}`)
    expect(ui_()!.termVisibility).toEqual({})
  })

  it('軸が違う語・保留の語は切り替えられない', async () => {
    await mountApp('/dictionary')
    const other = genre.items.find((i) => i.exclusion?.kind === 'other-axis')!
    expect($(`dict-fixed-${other.id}`)).not.toBeNull()
    expect($(`dict-toggle-${other.id}`)).toBeNull()
  })
})

describe('UI 設定の反映（N4）', () => {
  it('単一選択の選択肢は、渡した表示の有無に従う（指定中の語は出す）', () => {
    const f = spec.fieldById.get('purpose')!
    const usage = spec.vocabularyById.get('usage')!
    const [a, b] = usage.items
    const opts = selectOptions(spec, f, undefined, (id) => id !== a!.id)
    expect(opts.some((o) => o.value === a!.id)).toBe(false)
    expect(opts.some((o) => o.value === b!.id)).toBe(true)
    const withCurrent = selectOptions(spec, f, a!.id, (id) => id !== a!.id)
    expect(withCurrent.some((o) => o.value === a!.id)).toBe(true)
  })

  it('辞典設定で非表示にした語は、階層のない3値の一覧にも出ない', async () => {
    const region = spec.vocabularyById.get('region-style')!.items[0]!
    localStorage.setItem(
      STORAGE_KEYS.uiSettings,
      JSON.stringify({
        schemaVersion: 1,
        termVisibility: { 'region-style': { [region.id]: false } },
      }),
    )
    await mountApp()
    await click('edit-basic')
    expect($(`term-regionStyles-${region.id}`)).toBeNull()
    expect(document.querySelectorAll('[data-testid^="term-regionStyles-"]').length).toBe(
      spec.vocabularyById.get('region-style')!.items.length - 1,
    )
  })
})

describe('カードの警告（N2）', () => {
  it('行の下に警告（黄色）・情報（淡い）を出す。生成は止めない', async () => {
    const s = createInitialSong(spec)
    const [a, b] = genre.warningPairs![0]!.ids
    s.requests[0]!.axes.subGenres = { state: 'specified', choices: { [a]: 'use', [b]: 'use' } }
    s.requests[0]!.axes.styleLean = { state: 'specified', value: 'traditional' }
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    const w = $('warning-subGenres')!
    expect(w.getAttribute('data-severity')).toBe('warning')
    expect(w.textContent).toContain('両方使用しています')
    expect($('warning-styleLean')!.getAttribute('data-severity')).toBe('info')
    expect($('request-text')).not.toBeNull()
  })
})

describe('カラーモード（判断ポイント32・N1）', () => {
  it('サイドメニューに、システム／ライト／ダークの選択がある（日本語）', async () => {
    await mountApp()
    expect($('color-mode')).not.toBeNull()
    expect(document.body.textContent).toContain('システム')
  })
})
