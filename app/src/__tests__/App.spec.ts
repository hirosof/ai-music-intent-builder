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
import { toCurrentSong } from '@/domain/request/__tests__/helpers'
import {
  COMPARE_CHART_NOTE,
  compareChartSummary,
  compareChartText,
} from '@/domain/request/follow-up'

const INPUTS = resolve(process.cwd(), '../design/v0/docs/examples/inputs')
const vocalSong = toCurrentSong(
  JSON.parse(readFileSync(resolve(INPUTS, 'rendered-11.json'), 'utf8')),
)

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
    expect(
      w.get('[data-testid="card-lyrics"]').find('[data-testid="row-structure"]').exists(),
    ).toBe(true)
    expect(
      w.get('[data-testid="card-structure"]').find('[data-testid="row-structure"]').exists(),
    ).toBe(false)
    // 依頼文の範囲 lyrics でも、歌ありの曲の構成は依頼文に出る
    expect(w.get('[data-testid="row-structure"]').attributes('data-out-of-scope')).toBeUndefined()
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

describe('依頼文のカード（判断ポイント55）', () => {
  it('表示のボタンはなく、依頼文は他と同じ形のカード（見出し行に「依頼文」と「コピー」）で、少し広く空ける', async () => {
    await mountApp()
    expect(document.querySelector('[data-testid="show-request"]')).toBeNull()
    expect(document.body.textContent).not.toContain('以上の設定を元に')
    const card = document.querySelector('[data-testid="request-area"]')!
    const header = card.querySelector('[data-slot="header"]')!
    expect(header.textContent).toContain('依頼文')
    expect(header.querySelector('[data-testid="copy-request"]')).not.toBeNull()
    expect(card.querySelector('[data-testid="request-text"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="request-gap"]')!.className).toContain('pt-4')
  })

  it('未完成のときは、カードの中に項目ごとの理由を出し、コピーを無効にする', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.lyricsAuthor = null
    s.requests[0]!.axes.purposeDetail = { state: 'specified' }
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    const reasons = [...document.querySelectorAll('[data-testid="request-incomplete-reason"]')].map(
      (e) => e.textContent,
    )
    expect(reasons).toEqual([
      '用途の詳細: 指定されていますが値が空です',
      '歌ありで作詞の主体が未選択です',
    ])
    expect(
      document.querySelector('[data-testid="request-area"] [data-testid="request-incomplete"]'),
    ).not.toBeNull()
    expect(document.querySelector('[data-testid="copy-request"]')!.hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('注意書きは依頼文のカードの中', async () => {
    await mountApp()
    expect(
      document.querySelector('[data-testid="request-area"] [data-testid="notice-length"]'),
    ).not.toBeNull()
  })
})

describe('依頼文のカードのタブ「比較図を頼む文」（UI 判断ポイント83。文面の判断ポイント51 の B-FC）', () => {
  const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`)
  const order = () =>
    [...document.querySelectorAll('[data-testid="request-area"] [data-testid]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((t) =>
        [
          'request-tabs',
          'request-text',
          'request-incomplete',
          'compare-chart',
          'notice-length',
          'notice-chip',
        ].includes(t!),
      )
  const copyButton = () => $('copy-request') as HTMLButtonElement
  const tabButtons = () => [
    ...document.querySelectorAll<HTMLElement>('[data-testid="request-area"] [role="tab"]'),
  ]
  const activeTab = () =>
    tabButtons()
      .find((b) => b.getAttribute('aria-selected') === 'true')
      ?.textContent?.trim()
  async function openTab(label: string) {
    const b = tabButtons().find((x) => x.textContent?.trim() === label)!
    b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    await flushPromises()
  }
  const req = () => useSongEditor().song.value.requests[0]!
  // jsdom には Clipboard API がないため、useClipboard（legacy: true）は textarea と execCommand('copy') で写す。
  // execCommand を差し替えて、そのときの textarea の中身を写した文とみなす
  const stubCopy = () => {
    const copied: string[] = []
    Object.defineProperty(document, 'execCommand', {
      value: () => {
        copied.push(document.querySelector('textarea')!.value)
        return true
      },
      configurable: true,
    })
    return copied
  }
  const unstubCopy = () => delete (document as { execCommand?: unknown }).execCommand

  it('初期状態（案の数3）はタブを出し、「依頼文」を開く。コピーの文言は「依頼文をコピー」', async () => {
    await mountApp()
    expect(tabButtons().map((b) => b.textContent?.trim())).toEqual(['依頼文', '比較図を頼む文'])
    expect(activeTab()).toBe('依頼文')
    expect(order()).toEqual(['request-tabs', 'request-text', 'notice-length'])
    expect(copyButton().textContent?.trim()).toBe('依頼文をコピー')
    // 依頼文の下の別のボタンはない（見出しの1つだけ）
    expect($('request-area')!.querySelectorAll('button:not([role="tab"])')).toHaveLength(1)
  })

  it('比較図のタブ: 要約の一言・控え方の注意・文の本体。見出しのコピーが B-FC の文を写す。注意書きはどちらのタブでも出す', async () => {
    const copied = stubCopy()
    try {
      await mountApp()
      await openTab('比較図を頼む文')
      expect(activeTab()).toBe('比較図を頼む文')
      expect(order()).toEqual(['request-tabs', 'compare-chart', 'notice-length'])
      expect($('compare-summary')!.textContent).toBe(compareChartSummary(spec, req()))
      expect($('compare-note')!.textContent).toBe(COMPARE_CHART_NOTE)
      expect($('compare-text')!.textContent).toBe(compareChartText(spec, req()))
      expect(copyButton().textContent?.trim()).toBe('比較図の文をコピー')
      copyButton().click()
      await flushPromises()
      expect(copied).toEqual([compareChartText(spec, req())])
      expect(copyButton().textContent?.trim()).toBe('コピーしました')
      // 「依頼文」に戻すと、依頼文のコピー（まだ押していない）
      await openTab('依頼文')
      expect(order()).toEqual(['request-tabs', 'request-text', 'notice-length'])
      expect(copyButton().textContent?.trim()).toBe('依頼文をコピー')
      copyButton().click()
      await flushPromises()
      expect(copied[1]).toBe($('request-text')!.textContent)
      expect(copied[1]).not.toBe(copied[0])
    } finally {
      unstubCopy()
    }
  })

  it('案の数・差の付け方を変えると、要約と文が変わる（情緒の幅・案の数5）', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.output.variantCount = 5
    s.requests[0]!.output.diffAxis = 'mood'
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    await openTab('比較図を頼む文')
    expect($('compare-summary')!.textContent).toMatch(/^案5件を、明暗×強度の図/)
    expect($('compare-text')!.textContent).toContain('（案1〜案5）')
    expect($('compare-text')!.textContent).toContain('横軸は明暗')
  })

  it('案の数が1のときはタブを出さない（1枚の表示）', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.output.variantCount = 1
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    expect($('request-tabs')).toBeNull()
    expect(order()).toEqual(['request-text', 'notice-length', 'notice-chip'])
    expect(copyButton().textContent?.trim()).toBe('依頼文をコピー')
  })

  it('依頼文の範囲が歌詞のみのときはタブを出さない。スタイルのみでは出す', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.output.variantCount = 3
    s.requests[0]!.output.requestScope = 'lyrics'
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    expect($('request-tabs')).toBeNull()
    req().output.requestScope = 'style'
    await flushPromises()
    expect($('request-tabs')).not.toBeNull()
    expect(activeTab()).toBe('依頼文')
  })

  it('比較図のタブを開いたまま、そのタブが消えたら「依頼文」に戻る。また出たときも「依頼文」から', async () => {
    await mountApp()
    await openTab('比較図を頼む文')
    expect($('compare-chart')).not.toBeNull()
    req().output.variantCount = 1
    await flushPromises()
    expect($('request-tabs')).toBeNull()
    expect($('compare-chart')).toBeNull()
    expect($('request-text')).not.toBeNull()
    expect(copyButton().textContent?.trim()).toBe('依頼文をコピー')
    req().output.variantCount = 3
    await flushPromises()
    expect(activeTab()).toBe('依頼文')
    expect($('request-text')).not.toBeNull()
  })

  it('未完成のときは、どちらのタブでもコピーを押せない', async () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.output.variantCount = 3
    s.requests[0]!.axes.purposeDetail = { state: 'specified' }
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    await mountApp()
    expect(order()).toEqual(['request-tabs', 'request-incomplete'])
    expect(copyButton().disabled).toBe(true)
    await openTab('比較図を頼む文')
    expect(order()).toEqual(['request-tabs', 'compare-chart'])
    expect(copyButton().disabled).toBe(true)
    expect(copyButton().textContent?.trim()).toBe('比較図の文をコピー')
  })
})
