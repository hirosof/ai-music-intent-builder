// 画面の構造（jsdom。見た目は目視）: 枠、カード、依頼文、新規の確認（判断ポイント48・52）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, it, expect } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'

import App from '../App.vue'
import EditorView from '@/views/EditorView.vue'
import { resetSongEditor, useSongEditor } from '@/composables/useSongEditor'
import { STORAGE_KEYS } from '@/data/storage'
import { spec } from '@/data/spec'
import { createInitialSong } from '@/domain/editor/initial'
import type { SongData } from '@/domain/types/song'

const INPUTS = resolve(process.cwd(), '../design/v0/docs/examples/inputs')
const vocalSong = JSON.parse(readFileSync(resolve(INPUTS, 'rendered-11.json'), 'utf8')) as SongData

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  resetSongEditor()
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

const cardIds = (w: VueWrapper) =>
  w.findAll('[data-testid^="card-"]').map((c) => c.attributes('data-testid'))

describe('主画面', () => {
  it('初期状態は7枚のカードと依頼文', async () => {
    const w = await mountApp()
    expect(cardIds(w)).toEqual([
      'card-songType',
      'card-basic',
      'card-expression',
      'card-sound',
      'card-structure',
      'card-exclusionNotes',
      'card-output',
    ])
    expect(w.get('[data-testid="request-text"]').text()).toMatch(/^# /)
    expect(w.get('[data-testid="copy-request"]').attributes('disabled')).toBeUndefined()
    expect(w.get('[data-testid="row-vocalMode"]').text()).toContain('インスト')
  })

  it('歌ありは8枚。依頼文の範囲で依頼文に出ない項目に印が付く', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.output.requestScope = 'lyrics'
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    const w = await mountApp()
    expect(cardIds(w)).toContain('card-lyrics')
    expect(cardIds(w)).toHaveLength(8)
    expect(w.find('[data-testid="row-structure"]').exists()).toBe(false)
    expect(w.get('[data-testid="row-tempoFeel"]').attributes('data-out-of-scope')).toBe('true')
    expect(w.get('[data-testid="row-length"]').attributes('data-out-of-scope')).toBeUndefined()
    expect(w.get('[data-testid="card-sound"]').find('[data-testid="scope-note"]').exists()).toBe(
      true,
    )
    expect(
      w.get('[data-testid="card-structure"]').find('[data-testid="scope-note"]').exists(),
    ).toBe(false)
  })

  it('未完成は、カードに赤字で示し、依頼文の代わりに理由を出してコピーできない', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.lyricsAuthor = null
    s.requests[0]!.axes.purposeDetail = { state: 'specified' }
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    const w = await mountApp()
    expect(w.get('[data-testid="problem-lyricsAuthor"]').text()).toBe(
      '歌ありで作詞の主体が未選択です',
    )
    expect(w.get('[data-testid="problem-purposeDetail"]').text()).toBe(
      '指定されていますが値が空です',
    )
    expect(w.find('[data-testid="request-text"]').exists()).toBe(false)
    expect(w.find('[data-testid="request-incomplete"]').exists()).toBe(true)
    expect(w.get('[data-testid="copy-request"]').attributes('disabled')).toBeDefined()
  })
})

describe('新規（判断ポイント52）', () => {
  it('確認ダイアログで「破棄して新規」を押すと初期状態に戻り、キャンセルでは変わらない', async () => {
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(vocalSong))
    const w = await mountApp()
    expect(cardIds(w)).toHaveLength(8)

    await w.get('[data-testid="new-song"]').trigger('click')
    await flushPromises()
    const cancel = document.querySelector<HTMLButtonElement>('[data-testid="confirm-cancel"]')!
    expect(document.body.textContent).toContain('編集中の内容は破棄されます')
    cancel.click()
    await flushPromises()
    expect(cardIds(w)).toHaveLength(8)

    await w.get('[data-testid="new-song"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[data-testid="confirm-ok"]')!.click()
    await flushPromises()
    expect(cardIds(w)).toHaveLength(7)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.song)!)).toEqual(createInitialSong(spec))
  })
})

describe('依頼文の下の注意書き（U5。§3-2・§3-3）', () => {
  const order = () =>
    [...document.querySelectorAll('[data-testid="request-area"] [data-testid]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((t) => t === 'request-text' || t === 'notice-length' || t === 'notice-chip')

  it('インスト（初期状態）は文字数の注意書きだけ', async () => {
    await mountApp()
    expect(order()).toEqual(['request-text', 'notice-length'])
    expect(document.querySelector('[data-testid="notice-length"]')!.textContent).toContain(
      'Suno のスタイル欄は1000文字までです。',
    )
  })

  it('歌あり・作詞AIへの指示・combined は、文字数の注意書きを先に、チップ化の案内をその下に', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.lyricsAuthor = 'chat-ai-instruction'
    s.requests[0]!.output.requestScope = 'combined'
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    expect(order()).toEqual(['request-text', 'notice-length', 'notice-chip'])
    expect(document.querySelector('[data-testid="chip-phrase"]')!.textContent).toBe(
      '添付のテーマ・指示に従い歌詞を作成してください',
    )
    expect(document.querySelector('[data-testid="copy-chip-phrase"]')).not.toBeNull()
    // 閉じるボタンは付けない
    expect(document.querySelector('[data-testid="notice-chip"] button[aria-label]')).toBeNull()
  })

  it('歌詞のみ（lyrics）はチップ化の案内だけ。依頼文を作れないときはどちらも出さない', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.lyricsAuthor = 'chat-ai-instruction'
    s.requests[0]!.output.requestScope = 'lyrics'
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    expect(order()).toEqual(['request-text', 'notice-chip'])
    useSongEditor().song.value.requests[0]!.axes.purpose = { state: 'specified' }
    await flushPromises()
    expect(order()).toEqual([])
  })
})
