// 保存時の正規化（判断ポイント45）と、未完成のデータで生成器が失敗すること（判断ポイント43）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { factoryProfiles } from '@/data/factory'
import { spec } from '@/data/spec'
import { GenerationError } from '@/domain/request/errors'
import { generateRequestText } from '@/domain/request/generate'
import { normalizeForSave } from '@/domain/storage/normalize'
import type { SongData } from '@/domain/types/song'

const INPUTS = resolve(process.cwd(), '../design/v0/docs/examples/inputs')
const vocalSong = JSON.parse(readFileSync(resolve(INPUTS, 'rendered-07.json'), 'utf8')) as SongData
// 例の入力は、歌ありでも structure（無効な項目）を②お任せで持つ。正規化（判断ポイント45 の (2)）で省略される形
const vocalClean = structuredClone(vocalSong)
delete vocalClean.requests[0]!.axes.structure
const instSong = factoryProfiles[0]!.data

describe('保存時の正規化', () => {
  it('正規化済みのデータは変わらない（ファクトリー・歌あり）。例の入力の structure は省略される', () => {
    for (const p of factoryProfiles) expect(normalizeForSave(p.data)).toEqual(p.data)
    expect(normalizeForSave(vocalClean)).toEqual(vocalClean)
    expect(normalizeForSave(vocalSong)).toEqual(vocalClean)
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

    const vocal = structuredClone(vocalSong)
    vocal.requests[0]!.axes.structure = { state: 'delegated' }
    const nv = normalizeForSave(vocal).requests[0]!.axes
    expect('structure' in nv).toBe(false)
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
      (x) =>
        x.kind === kind && !['lyricsTheme', 'lyricsLanguage', 'lyricsStructure'].includes(x.id),
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
