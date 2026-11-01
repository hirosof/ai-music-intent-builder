// 保存時の正規化（判断ポイント45）と、未完成のデータで生成器が失敗すること（判断ポイント43）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { factoryProfiles } from '@/data/factory'
import { spec } from '@/data/spec'
import { GenerationError } from '@/domain/request/errors'
import { generateRequestText } from '@/domain/request/generate'
import { normalizeForSave } from '@/domain/storage/normalize'
import { toCurrentSong } from '@/domain/request/__tests__/helpers'

const INPUTS = resolve(process.cwd(), '../design/v0/docs/examples/inputs')
const vocalSong = toCurrentSong(
  JSON.parse(readFileSync(resolve(INPUTS, 'rendered-07.json'), 'utf8')),
)
const instSong = factoryProfiles[0]!.data

describe('保存時の正規化', () => {
  it('正規化済みのデータは変わらない（ファクトリー・歌あり）', () => {
    for (const p of factoryProfiles) expect(normalizeForSave(p.data)).toEqual(p.data)
    expect(normalizeForSave(vocalSong)).toEqual(vocalSong)
  })

  it('(4) インストのとき曲の構成の要素から sung を外す。歌ありでは残す。引数は書き換えない', () => {
    const value = [{ id: 'intro', sung: false }, { id: 'theme' }]
    const inst = structuredClone(instSong)
    inst.requests[0]!.axes.structure = { state: 'specified', value }
    expect(normalizeForSave(inst).requests[0]!.axes.structure!.value).toEqual([
      { id: 'intro' },
      { id: 'theme' },
    ])
    expect(inst.requests[0]!.axes.structure!.value).toEqual(value)
    const vocal = structuredClone(vocalSong)
    const sung = [{ id: 'intro', sung: false }]
    vocal.requests[0]!.axes.structure = { state: 'specified', value: sung }
    expect(normalizeForSave(vocal).requests[0]!.axes.structure!.value).toEqual(sung)
  })

  it('(1) ①指定以外の項目は、state だけを持つ', () => {
    const s = structuredClone(instSong)
    const axes = s.requests[0]!.axes
    axes.mood = { state: 'delegated', choices: { tense: 'use' }, freeText: 'x' }
    axes.purpose = { state: 'defaulted', value: 'loop' }
    const n = normalizeForSave(s).requests[0]!.axes
    expect(n.mood).toEqual({ state: 'delegated' })
    expect(n.purpose).toEqual({ state: 'defaulted' })
    expect(n.mainGenre).toEqual(axes.mainGenre)
  })

  it('(2) 今の vocalMode で無効な項目は、状態に関わらず省略する', () => {
    const inst = structuredClone(instSong)
    inst.requests[0]!.axes.lyricsTheme = { state: 'specified', value: 'x' }
    inst.requests[0]!.axes.lyricsLanguage = { state: 'delegated' }
    const ni = normalizeForSave(inst).requests[0]!.axes
    expect('lyricsTheme' in ni).toBe(false)
    expect('lyricsLanguage' in ni).toBe(false)
    expect(ni.structure).toEqual(inst.requests[0]!.axes.structure)

    // 曲の構成はどちらのモードでも有効（入力項目の判断ポイント30）
    const vocal = structuredClone(vocalSong)
    vocal.requests[0]!.axes.structure = { state: 'delegated' }
    const nv = normalizeForSave(vocal).requests[0]!.axes
    expect(nv.structure).toEqual({ state: 'delegated' })
    expect(nv.lyricsTheme).toEqual(vocal.requests[0]!.axes.lyricsTheme)
  })

  it('(3) インストのとき requestScope は combined、lyricsAuthor は null。歌ありでは触らない', () => {
    const inst = structuredClone(instSong)
    inst.requests[0]!.lyricsAuthor = 'chat-ai'
    inst.requests[0]!.output.requestScope = 'lyrics'
    const ni = normalizeForSave(inst).requests[0]!
    expect(ni.lyricsAuthor).toBeNull()
    expect(ni.output.requestScope).toBe('combined')

    const noScope = normalizeForSave(instSong).requests[0]!.output
    expect('requestScope' in noScope).toBe(false)

    const vocal = structuredClone(vocalSong)
    vocal.requests[0]!.output.requestScope = 'style'
    const nv = normalizeForSave(vocal).requests[0]!
    expect(nv.output.requestScope).toBe('style')
    expect(nv.lyricsAuthor).toBe(vocal.requests[0]!.lyricsAuthor)
  })

  it('output のその他の値は触らない。引数は書き換えない', () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.output.requestScope = 'lyrics'
    s.requests[0]!.output.variantCount = 3
    s.requests[0]!.axes.mood = { state: 'delegated', choices: { tense: 'use' } }
    const before = structuredClone(s)
    const n = normalizeForSave(s)
    expect(n.requests[0]!.output).toEqual(s.requests[0]!.output)
    expect(s).toEqual(before)

    // インストで requestScope を直すときも、引数の output は書き換えない
    const inst = structuredClone(instSong)
    inst.requests[0]!.output.requestScope = 'lyrics'
    inst.requests[0]!.lyricsAuthor = 'chat-ai'
    const instBefore = structuredClone(inst)
    normalizeForSave(inst)
    expect(inst).toEqual(instBefore)
  })
})

describe('未完成のデータでは、依頼文を生成しない', () => {
  it.each(['select', 'triSelect', 'text'])('S5（%s）', (kind) => {
    const f = [...spec.fieldById.values()].find(
      (x) => x.kind === kind && !['lyricsTheme', 'lyricsLanguage'].includes(x.id),
    )!
    const s = structuredClone(instSong)
    s.requests[0]!.axes[f.id] = { state: 'specified' }
    expect(() => generateRequestText({ spec, req: s.requests[0]! })).toThrow(GenerationError)
    expect(() => generateRequestText({ spec, req: s.requests[0]! })).toThrow(/S5/)
  })

  it('F12（歌ありで作詞の主体が未選択）', () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.lyricsAuthor = null
    expect(() => generateRequestText({ spec, req: s.requests[0]! })).toThrow(GenerationError)
  })

  it('値があれば生成する（正例）', () => {
    expect(generateRequestText({ spec, req: instSong.requests[0]! }).length).toBeGreaterThan(0)
  })
})
