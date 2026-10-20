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
import { factoryProfiles } from '@/data/factory'
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
/** UInputNumber に値を入れて確定する（入力 → change → 入力欄を離れる。jsdom では change/blur で確定する） */
async function setNumber(testid: string, value: string) {
  const el = $<HTMLInputElement>(testid)
  if (!el) throw new Error(`入力欄が見つからない: ${testid}`)
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new FocusEvent('blur'))
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

  it('階層のある語彙の項目は階層テーブル、ほかは U4b の部品（大きい入力はお任せのあいだ畳む）', async () => {
    await mountApp()
    await click('edit-basic')
    // 畳んでいる（判断ポイント54）
    expect($('tree-mainGenre')).toBeNull()
    expect($('tree-subGenres')).toBeNull()
    expect($('fold-mainGenre')!.textContent).toBe('一覧を開く')
    await click('fold-mainGenre')
    await click('fold-subGenres')
    expect($('editor-mainGenre')?.querySelector('[data-testid="tree-mainGenre"]')).not.toBeNull()
    expect($('editor-subGenres')?.querySelector('[data-testid="tree-subGenres"]')).not.toBeNull()
    expect($('editor-regionStyles')?.querySelector('[data-testid^="tree-"]')).toBeNull()
    expect($('select-purpose')).not.toBeNull()
  })
})

describe('大きい入力の畳み方（判断ポイント54）', () => {
  it('3値: お任せでは畳み、「指定」で開く。お任せに戻すと畳む（値は残り、指定に戻すと戻る）', async () => {
    await mountApp()
    await click('edit-expression')
    expect($('term-mood-tense')).toBeNull()
    expect($('free-mood')).toBeNull()
    await click('state-mood-specified')
    expect($('term-mood-tense')).not.toBeNull()
    await click('choice-mood-tense-use')
    await click('state-mood-delegated')
    expect($('term-mood-tense')).toBeNull()
    expect(req().axes.mood).toEqual({ state: 'delegated', choices: { tense: 'use' } })
    await click('state-mood-specified')
    expect($<HTMLElement>('choice-mood-tense-use')!.getAttribute('aria-pressed')).toBe('true')
  })

  it('「一覧を開く」は状態とは独立に開閉する。開いて選ぶと①指定になり、開いたまま', async () => {
    await mountApp()
    await click('edit-expression')
    await click('fold-mood')
    expect($('term-mood-tense')).not.toBeNull()
    expect(req().axes.mood).toBeUndefined()
    await click('fold-mood')
    expect($('term-mood-tense')).toBeNull()
    expect(req().axes.mood).toBeUndefined()
    await click('fold-mood')
    await click('choice-mood-tense-use')
    expect(req().axes.mood).toEqual({ state: 'specified', choices: { tense: 'use' } })
    expect($('term-mood-tense')).not.toBeNull()
  })

  it('値が空の①（未完成）も開く。保存されている①は開いた状態で始まる', async () => {
    await mountApp(songWith((r) => (r.axes.regionStyles = { state: 'specified' })))
    await click('edit-basic')
    expect($('free-regionStyles')).not.toBeNull()
    expect($('fold-regionStyles')!.textContent).toBe('一覧を閉じる')
  })

  it('小さい入力（ボタン群・1行の入力）は、従来どおり無効化する（畳まない）', async () => {
    await mountApp()
    await click('edit-exclusionNotes')
    expect($<HTMLTextAreaElement>('text-notes')!.disabled).toBe(true)
    expect($('fold-notes')).toBeNull()
  })
})

describe('長さ（判断ポイント57）と、①指定の仮置き', () => {
  const pressed = () =>
    [...document.querySelectorAll('[data-testid^="length-chip-"]')]
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent)

  it('「指定」を押しただけではデータを変えない。チップで1タップ、分・秒で入力（秒に換算）', async () => {
    await mountApp()
    await click('edit-structure')
    expect($<HTMLInputElement>('length-minutes-length')!.disabled).toBe(true)
    expect($<HTMLButtonElement>('length-chip-180')!.disabled).toBe(true)
    await click('state-length-specified')
    expect(req().axes.length).toBeUndefined()
    expect($('length-current-length')!.textContent).toBe('今の値: —')
    await click('length-chip-180')
    expect(req().axes.length).toEqual({ state: 'specified', value: 180 })
    expect(pressed()).toEqual(['3:00'])
    expect($<HTMLInputElement>('length-minutes-length')!.value).toBe('3')
    expect($<HTMLInputElement>('length-seconds-length')!.value).toBe('0')
    await setNumber('length-seconds-length', '30')
    expect(req().axes.length!.value).toBe(210)
    expect(pressed()).toEqual([])
    expect($('length-current-length')!.textContent).toBe('今の値: 3:30')
    expect(rowText('length')).toBe('3:30')
  })

  it('範囲に収める（0分は10秒から、6分は0秒まで）', async () => {
    await mountApp(songWith((r) => (r.axes.length = { state: 'specified', value: 150 })))
    await click('edit-structure')
    await setNumber('length-minutes-length', '0')
    expect(req().axes.length!.value).toBe(30)
    await setNumber('length-seconds-length', '5')
    expect(req().axes.length!.value).toBe(10)
    expect($<HTMLInputElement>('length-seconds-length')!.value).toBe('10')
    await setNumber('length-minutes-length', '6')
    expect(req().axes.length!.value).toBe(360)
    expect($<HTMLInputElement>('length-seconds-length')!.value).toBe('0')
    await setNumber('length-minutes-length', '9')
    expect(req().axes.length!.value).toBe(360)
  })

  it('空にしたら書き込まず、入力欄を離れたら最後の有効な値に戻す', async () => {
    await mountApp(songWith((r) => (r.axes.length = { state: 'specified', value: 200 })))
    await click('edit-structure')
    await setNumber('length-minutes-length', '')
    expect(req().axes.length!.value).toBe(200)
    expect($<HTMLInputElement>('length-minutes-length')!.value).toBe('3')
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

describe('BPM（K5・判断ポイント56）', () => {
  it('単一の値。範囲は下限 ≤ 上限', async () => {
    await mountApp()
    await click('edit-structure')
    await click('state-bpm-specified')
    await setNumber('bpm-bpm', '120')
    expect(req().axes.bpm).toEqual({ state: 'specified', value: 120 })
    const range = $('bpm-mode-bpm')!.querySelectorAll<HTMLElement>('button[role="radio"]')[1]
    range!.click()
    await flushPromises()
    await setNumber('bpm-min-bpm', '130')
    await setNumber('bpm-max-bpm', '110')
    expect($('error-bpm')?.textContent).toContain('下限は上限以下')
    expect(req().axes.bpm).toEqual({ state: 'specified', value: 120 })
    await setNumber('bpm-max-bpm', '140')
    expect(req().axes.bpm).toEqual({ state: 'specified', value: { min: 130, max: 140 } })
    expect(rowText('bpm')).toBe('130〜140')
  })

  it('最小は1。空にしたら書き込まず、入力欄を離れたら最後の有効な値に戻す', async () => {
    await mountApp(songWith((r) => (r.axes.bpm = { state: 'specified', value: 90 })))
    await click('edit-structure')
    await setNumber('bpm-bpm', '0')
    expect(req().axes.bpm!.value).toBe(1)
    await setNumber('bpm-bpm', '')
    expect(req().axes.bpm!.value).toBe(1)
    expect($<HTMLInputElement>('bpm-bpm')!.value).toBe('1')
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
  it('①にして語を選ぶ。②にすると畳み、①に戻すと選択が戻る', async () => {
    await mountApp()
    await click('edit-expression')
    expect($('choice-mood-tense-use')).toBeNull()
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
    await click('fold-regionStyles')
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
  it('案の数は 1〜10 に収める。空にしたら書き込まず、入力欄を離れたら最後の有効な値に戻す（判断ポイント56）', async () => {
    await mountApp()
    await click('edit-output')
    await setNumber('input-variantCount', '11')
    expect(req().output.variantCount).toBe(10)
    await setNumber('input-variantCount', '0')
    expect(req().output.variantCount).toBe(1)
    await setNumber('input-variantCount', '5')
    expect(req().output.variantCount).toBe(5)
    expect(rowText('variantCount')).toBe('5')
    await setNumber('input-variantCount', '')
    expect(req().output.variantCount).toBe(5)
    expect($<HTMLInputElement>('input-variantCount')!.value).toBe('5')
  })

  it('曲名案の数も同じ（1〜10、空は戻す）', async () => {
    await mountApp(songWith((r) => (r.output.titleSuggestions = true)))
    await click('edit-output')
    await setNumber('input-titleCount', '20')
    expect(req().output.titleCount).toBe(10)
    await setNumber('input-titleCount', '')
    expect(req().output.titleCount).toBe(10)
    expect($<HTMLInputElement>('input-titleCount')!.value).toBe('10')
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

describe('利用者の目視で見つかった不具合（U4 の手直し）', () => {
  it('ファクトリー（出力の項目が省略されている）を読み込んだ直後でも、曲名案と推奨値を操作できる', async () => {
    await mountApp(factoryProfiles[0]!.data)
    expect(req().output).not.toHaveProperty('titleSuggestions')
    await click('edit-output')
    $('input-titleSuggestions')!.click()
    await flushPromises()
    expect(req().output.titleSuggestions).toBe(true)
    expect($('input-titleSuggestions')!.getAttribute('aria-checked')).toBe('true')
    expect($<HTMLInputElement>('input-titleCount')!.disabled).toBe(false)
    $('recommend-weirdness')!.click()
    await flushPromises()
    expect(req().output.recommendParams).toEqual({ weirdness: true })
    expect($('recommend-weirdness')!.getAttribute('aria-checked')).toBe('true')
  })

  it('チェックの文字をクリックすると、その項目のチェックが変わる（同じ id にならない）', async () => {
    await mountApp()
    await click('edit-output')
    for (const group of ['input-recommendParams', 'input-granularity']) {
      const ids = [...$(group)!.querySelectorAll('button[role="checkbox"]')].map((b) => b.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const label of $(group)!.querySelectorAll('label')) {
        expect(ids).toContain(label.getAttribute('for'))
      }
    }
    const label = [...$('input-recommendParams')!.querySelectorAll('label')].find((l) =>
      l.textContent?.includes('奇抜さ'),
    )!
    label.click()
    await flushPromises()
    expect(req().output.recommendParams).toEqual({ weirdness: true })
  })
})

describe('①指定の仮置き（判断ポイント58）', () => {
  it('値がまだないあいだは一言を添え、カードと依頼文は元の状態のまま。値が入ると消える', async () => {
    await mountApp()
    const before = useSongEditor().generated.value
    await click('edit-structure')
    for (const id of ['length', 'bpm', 'structure']) {
      expect($(`pending-hint-${id}`)).toBeNull()
      await click(`state-${id}-specified`)
      expect($(`pending-hint-${id}`)!.textContent).toContain('値を入力すると指定になります')
    }
    expect(req().axes.length).toBeUndefined()
    expect(req().axes.bpm).toBeUndefined()
    expect(req().axes.structure).toBeUndefined()
    expect(rowText('length')).toBe('ツール任せ')
    expect(rowText('bpm')).toBe('お任せ（追加しない）')
    expect(useSongEditor().generated.value).toEqual(before)
    await click('length-chip-120')
    await setNumber('bpm-bpm', '100')
    expect($('pending-hint-length')).toBeNull()
    expect($('pending-hint-bpm')).toBeNull()
    expect($('pending-hint-structure')).not.toBeNull()
  })
})
