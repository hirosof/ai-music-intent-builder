// カードの「変更」のポップアップ（U4b。jsdom で構造と操作だけ。見た目は目視）
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
import type { SongData, SongRequest } from '@/domain/types/song'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  resetSongEditor()
  localStorage.clear()
  document.body.innerHTML = ''
})

async function mountApp(song?: SongData) {
  if (song) localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(song))
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
async function click(testid: string) {
  const el = $(testid)
  if (!el) throw new Error(`見つからない: ${testid}`)
  el.click()
  await flushPromises()
}
async function type(testid: string, value: string) {
  const root = $(testid)
  const el =
    root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement
      ? root
      : root?.querySelector('input, textarea')
  if (!el) throw new Error(`入力欄が見つからない: ${testid}`)
  ;(el as HTMLInputElement).value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}
const rowText = (id: string) => $(`row-${id}`)?.textContent ?? ''
const songWith = (mutate: (r: SongRequest) => void): SongData => {
  const s = createInitialSong(spec)
  mutate(s.requests[0]!)
  return s
}

describe('ポップアップを開く', () => {
  it('カードの「変更」で、そのカードの項目の入力が開く。閉じるで閉じる', async () => {
    await mountApp()
    await click('edit-structure')
    const ids = [...document.querySelectorAll('[data-testid^="editor-"]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((t) => t !== 'editor-close' && t !== 'editor-card-structure')
    expect(ids).toEqual([
      'editor-length',
      'editor-tempoFeel',
      'editor-bpm',
      'editor-developmentShape',
      'editor-structure',
    ])
    await click('editor-close')
    expect($('editor-card-structure')).toBeNull()
  })

  it('階層のある語彙の項目は階層テーブル、ほかは U4b の部品', async () => {
    await mountApp()
    await click('edit-basic')
    expect($('editor-mainGenre')?.querySelector('[data-testid="tree-mainGenre"]')).not.toBeNull()
    expect($('editor-subGenres')?.querySelector('[data-testid="tree-subGenres"]')).not.toBeNull()
    expect($('editor-regionStyles')?.querySelector('[data-testid^="tree-"]')).toBeNull()
    expect($('select-purpose')).not.toBeNull()
  })
})

describe('長さ（K4）と、①指定の仮置き', () => {
  it('「指定」を押しただけではデータを変えず、正しい値が入ったら①指定で書く。誤りはデータに入れない', async () => {
    await mountApp()
    await click('edit-structure')
    await click('state-length-specified')
    expect(req().axes.length).toBeUndefined()
    expect($<HTMLInputElement>('length-length')!.disabled).toBe(false)
    await type('length-length', '999')
    expect($('error-length')?.textContent).toContain('10〜360秒')
    expect(req().axes.length).toBeUndefined()
    await type('length-length', '2:30')
    expect($('error-length')).toBeNull()
    expect(req().axes.length).toEqual({ state: 'specified', value: 150 })
    expect(rowText('length')).toBe('2:30')
  })

  it('値が残っていれば、「指定」に戻すとすぐに①指定になる（一時保持）', async () => {
    await mountApp(songWith((r) => (r.axes.length = { state: 'specified', value: 200 })))
    await click('edit-structure')
    await click('state-length-toolManaged')
    expect(req().axes.length).toEqual({ state: 'toolManaged', value: 200 })
    expect(rowText('length')).toBe('ツール任せ')
    await click('state-length-specified')
    expect(req().axes.length).toEqual({ state: 'specified', value: 200 })
    expect(rowText('length')).toBe('3:20')
  })
})

describe('BPM（K5）', () => {
  it('単一の値。範囲は下限 ≤ 上限', async () => {
    await mountApp()
    await click('edit-structure')
    await click('state-bpm-specified')
    await type('bpm-bpm', '120')
    expect(req().axes.bpm).toEqual({ state: 'specified', value: 120 })
    const range = $('bpm-mode-bpm')!.querySelectorAll<HTMLElement>('button[role="radio"]')[1]
    range!.click()
    await flushPromises()
    await type('bpm-min-bpm', '130')
    await type('bpm-max-bpm', '110')
    expect($('error-bpm')?.textContent).toContain('下限は上限以下')
    expect(req().axes.bpm).toEqual({ state: 'specified', value: 120 })
    await type('bpm-max-bpm', '140')
    expect(req().axes.bpm).toEqual({ state: 'specified', value: { min: 130, max: 140 } })
    expect(rowText('bpm')).toBe('130〜140')
  })
})

describe('構成（K6）', () => {
  it('上へ・下へ・削除。最後の1つは消せない', async () => {
    await mountApp(
      songWith((r) => (r.axes.structure = { state: 'specified', value: ['intro', 'outro'] })),
    )
    await click('edit-structure')
    await click('down-structure-0')
    expect(req().axes.structure!.value).toEqual(['outro', 'intro'])
    expect($<HTMLButtonElement>('up-structure-0')!.disabled).toBe(true)
    await click('remove-structure-1')
    expect(req().axes.structure!.value).toEqual(['outro'])
    expect($<HTMLButtonElement>('remove-structure-0')!.disabled).toBe(true)
  })

  it('歌ありでは構成は出ない（歌詞カードの歌詞の構成を使う）', async () => {
    await mountApp(songWith((r) => (r.vocalMode = 'vocal')))
    await click('edit-structure')
    expect($('editor-structure')).toBeNull()
    await click('editor-close')
    await click('edit-lyrics')
    expect($('editor-lyricsStructure')).not.toBeNull()
  })
})

describe('3値選択（K3）と一時保持', () => {
  it('①にして語を選ぶ。②にすると一覧は押せず、①に戻すと選択が戻る', async () => {
    await mountApp()
    await click('edit-expression')
    expect($<HTMLButtonElement>('choice-mood-tense-use')!.disabled).toBe(true)
    await click('state-mood-specified')
    await click('choice-mood-tense-use')
    await click('choice-mood-nostalgic-exclude')
    expect(req().axes.mood).toEqual({
      state: 'specified',
      choices: { tense: 'use', nostalgic: 'exclude' },
    })
    expect(rowText('mood')).toMatch(/^使用する: .+ ／ 使用しない: .+$/)
    await click('state-mood-delegated')
    expect(rowText('mood')).toBe('お任せ')
    await click('state-mood-specified')
    expect(req().axes.mood!.choices).toEqual({ tense: 'use', nostalgic: 'exclude' })
    await click('choice-mood-tense-none')
    expect(req().axes.mood!.choices).toEqual({ nostalgic: 'exclude' })
  })

  it('①で何も選ばないと未完成として示す', async () => {
    await mountApp()
    await click('edit-expression')
    await click('state-mood-specified')
    expect($('problem-mood')?.textContent).toBe('指定されていますが値が空です')
    expect($('request-incomplete')).not.toBeNull()
  })

  it('自由記述には「使用する」側の一言を添える（判断ポイント49）', async () => {
    await mountApp()
    await click('edit-basic')
    expect($('editor-regionStyles')!.textContent).toContain('「使用する」ものとして追加されます')
  })
})

describe('自由記述の項目', () => {
  it('①にして書く', async () => {
    await mountApp()
    await click('edit-exclusionNotes')
    expect($<HTMLTextAreaElement>('text-notes')!.disabled).toBe(true)
    await click('state-notes-specified')
    await type('text-notes', '静かに始める')
    expect(req().axes.notes).toEqual({ state: 'specified', value: '静かに始める' })
    expect(rowText('notes')).toBe('静かに始める')
  })
})

describe('曲の種類（判断ポイント48）', () => {
  it('歌ありにすると8枚になり、作詞の主体は未選択（未完成）。選ぶと消える', async () => {
    const w = await mountApp()
    await click('edit-songType')
    $('input-vocalMode')!.querySelectorAll<HTMLElement>('button[role="radio"]')[1]!.click()
    await flushPromises()
    expect(req().vocalMode).toBe('vocal')
    expect(w.findAll('[data-testid^="card-"]')).toHaveLength(8)
    expect($('input-lyricsAuthor')).not.toBeNull()
    expect($('problem-lyricsAuthor')?.textContent).toBe('歌ありで作詞の主体が未選択です')
    $('input-lyricsAuthor')!.querySelectorAll<HTMLElement>('button[role="radio"]')[0]!.click()
    await flushPromises()
    expect(req().lyricsAuthor).toBe('chat-ai')
    expect($('problem-lyricsAuthor')).toBeNull()
  })

  it('スタイルのみにしてからインストに戻すと、淡い表示は出ない（正規化した形で表示。K9）', async () => {
    await mountApp(
      songWith((r) => {
        r.vocalMode = 'vocal'
        r.lyricsAuthor = 'chat-ai'
        r.output.requestScope = 'lyrics'
      }),
    )
    expect($('row-tempoFeel')!.getAttribute('data-out-of-scope')).toBe('true')
    await click('edit-songType')
    $('input-vocalMode')!.querySelectorAll<HTMLElement>('button[role="radio"]')[0]!.click()
    await flushPromises()
    expect(req().output.requestScope).toBe('lyrics') // 編集中のデータには残る（一時保持）
    expect($('row-tempoFeel')!.getAttribute('data-out-of-scope')).toBeNull()
  })
})

describe('出力設定', () => {
  it('案の数は 1〜10。誤りはデータに入れない', async () => {
    await mountApp()
    await click('edit-output')
    await type('input-variantCount', '11')
    expect(req().output.variantCount).toBe(3)
    expect(document.body.textContent).toContain('1〜10の範囲で入力してください')
    await type('input-variantCount', '5')
    expect(req().output.variantCount).toBe(5)
    expect(rowText('variantCount')).toBe('5')
  })

  it('粒度・曲名案・推奨値', async () => {
    await mountApp()
    await click('edit-output')
    $('granularity-basic')!.click()
    await flushPromises()
    expect(req().output.granularity).toEqual(['detailed'])
    expect($<HTMLInputElement>('input-titleCount')!.disabled).toBe(true)
    $('input-titleSuggestions')!.click()
    await flushPromises()
    expect(req().output.titleSuggestions).toBe(true)
    expect($<HTMLInputElement>('input-titleCount')!.disabled).toBe(false)
    expect(document.body.textContent).toContain('曲名案は日本語で出します')
    $('recommend-weirdness')!.click()
    await flushPromises()
    expect(req().output.recommendParams).toEqual({ weirdness: true })
    $('recommend-weirdness')!.click()
    await flushPromises()
    expect(req().output.recommendParams).toEqual({})
  })

  it('粒度を両方外すと、依頼文の代わりに理由を出す', async () => {
    await mountApp()
    await click('edit-output')
    $('granularity-basic')!.click()
    $('granularity-detailed')!.click()
    await flushPromises()
    expect(req().output.granularity).toEqual([])
    expect($('request-error')?.textContent).toContain('出力する粒度が空')
  })
})
