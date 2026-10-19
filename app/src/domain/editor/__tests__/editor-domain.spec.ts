// U4a の純関数: 初期状態（判断ポイント52）、カードの構成と淡い表示（判断ポイント48・53）、値の表示、未完成（判断ポイント43）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { factoryProfiles } from '@/data/factory'
import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import { cardSections, CARDS, isOutOfScope, visibleCards } from '@/domain/editor/cards'
import { displayAxis, displayOutput, outputCardItems, stateCounts } from '@/domain/editor/display'
import { createInitialSong } from '@/domain/editor/initial'
import { findIncomplete, isIncomplete } from '@/domain/editor/incomplete'
import { generateRequestText } from '@/domain/request/generate'
import type { SongData, SongRequest } from '@/domain/types/song'

const INPUTS = resolve(process.cwd(), '../design/v0/docs/examples/inputs')
const vocalSong = JSON.parse(readFileSync(resolve(INPUTS, 'rendered-11.json'), 'utf8')) as SongData
const vocalReq = vocalSong.requests[0]!
const instReq = factoryProfiles[0]!.data.requests[0]!
const field = (id: string) => spec.fieldById.get(id)!
const withScope = (req: SongRequest, scope: string): SongRequest => ({
  ...req,
  output: { ...req.output, requestScope: scope },
})

describe('初期状態（判断ポイント52）', () => {
  const song = createInitialSong(spec)
  const req = song.requests[0]!

  it('インスト・新規生成・項目はすべて省略・版はツールプロファイルの版', () => {
    expect(req).toMatchObject({
      toolId: 'suno',
      toolVersion: spec.toolProfileById.get('suno')!.version.id,
      generationType: 'new',
      vocalMode: 'instrumental',
      lyricsAuthor: null,
      derivedFrom: null,
      axes: {},
    })
  })

  it('出力は fields.json の既定値。曲名案の言語は持たない（判断ポイント50）', () => {
    expect(req.output).toEqual({
      variantCount: 3,
      diffAxis: 'auto',
      granularity: ['basic', 'detailed'],
      variation: 'standard',
      outputLanguage: 'mixed',
      titleSuggestions: false,
      titleCount: 3,
      recommendParams: {},
      requestScope: 'combined',
    })
  })

  it('検証でエラー0・警告0で、依頼文を作れる', () => {
    const r = checkSaved(JSON.stringify(song))
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
    expect(generateRequestText({ spec, req }).length).toBeGreaterThan(0)
  })

  it('呼ぶたびに別のオブジェクト（既定値を共有しない）', () => {
    const a = createInitialSong(spec)
    ;(a.requests[0]!.output.granularity as string[]).push('x')
    expect(createInitialSong(spec).requests[0]!.output.granularity).toEqual(['basic', 'detailed'])
  })
})

describe('カードの構成（判断ポイント48）', () => {
  it('インストは7枚、歌ありは8枚。順序は固定', () => {
    expect(visibleCards(instReq).map((c) => c.label)).toEqual([
      '曲の種類',
      '基本',
      '表現',
      '音の構成',
      '構造',
      '除外・補足',
      '出力設定',
    ])
    expect(visibleCards(vocalReq).map((c) => c.id)).toEqual(CARDS.map((c) => c.id))
  })

  it('構成（structure）はインストのときだけ。歌詞カードは歌詞の3項目', () => {
    const structure = CARDS.find((c) => c.id === 'structure')!
    const ids = (req: SongRequest) => cardSections(spec, structure, req).flatMap((s) => s.fieldIds)
    expect(ids(instReq)).toContain('structure')
    expect(ids(vocalReq)).not.toContain('structure')
    expect(ids(vocalReq)).toEqual(['length', 'tempoFeel', 'bpm', 'developmentShape'])
    const lyrics = CARDS.find((c) => c.id === 'lyrics')!
    expect(cardSections(spec, lyrics, vocalReq).flatMap((s) => s.fieldIds)).toEqual([
      'lyricsTheme',
      'lyricsLanguage',
      'lyricsStructure',
    ])
  })

  it('カードは全項目を受け持つ（漏れ・重複がない）', () => {
    const ids = (req: SongRequest) =>
      visibleCards(req).flatMap((c) => cardSections(spec, c, req).flatMap((s) => s.fieldIds))
    const inst = ids(instReq)
    const vocal = ids(vocalReq)
    for (const xs of [inst, vocal]) expect(new Set(xs).size).toBe(xs.length)
    // インストは歌詞の3項目、歌ありは構成（structure）を除く全項目
    expect([...inst, 'lyricsTheme', 'lyricsLanguage', 'lyricsStructure'].sort()).toEqual(
      [...spec.fieldById.keys()].sort(),
    )
    expect([...vocal, 'structure'].sort()).toEqual([...spec.fieldById.keys()].sort())
  })

  it('複数のグループを持つカードだけ小見出しを出す', () => {
    const basic = CARDS.find((c) => c.id === 'basic')!
    expect(cardSections(spec, basic, instReq).map((s) => s.label)).toEqual([
      '用途・文脈',
      'ジャンル・様式',
    ])
    const sound = CARDS.find((c) => c.id === 'sound')!
    expect(cardSections(spec, sound, instReq).map((s) => s.label)).toEqual([undefined])
  })

  it('件数は、曲の種類と出力設定では出さない', () => {
    expect(CARDS.filter((c) => !c.showCounts).map((c) => c.id)).toEqual(['songType', 'output'])
  })
})

describe('依頼文の範囲で依頼文に出ない項目（淡く表示。判断ポイント53）', () => {
  const all = [...spec.fieldById.keys(), ...spec.outputById.keys(), 'lyricsAuthor']
  const outOf = (req: SongRequest) => all.filter((id) => isOutOfScope(spec, req, id))

  it('combined では何も淡くしない', () => {
    expect(outOf(withScope(vocalReq, 'combined'))).toEqual([])
    expect(outOf(vocalReq)).toEqual([])
  })

  it('style: 歌詞の3項目・作詞の主体・曲名案', () => {
    expect(outOf(withScope(vocalReq, 'style')).sort()).toEqual(
      [
        'lyricsTheme',
        'lyricsLanguage',
        'lyricsStructure',
        'lyricsAuthor',
        'titleSuggestions',
        'titleCount',
      ].sort(),
    )
  })

  it('lyrics: 音の構成・時間的な構造（長さを除く）・制作と質感・除外、案の数などの出力', () => {
    const ids = outOf(withScope(vocalReq, 'lyrics'))
    expect(ids).not.toContain('length')
    expect(ids).toContain('tempoFeel')
    expect(ids).toContain('exclusions')
    expect(ids).toContain('leadInstruments')
    expect(ids).toContain('mixDirection')
    for (const keep of [
      'purpose',
      'mainGenre',
      'mood',
      'notes',
      'lyricsTheme',
      'titleSuggestions',
      'lyricsAuthor',
    ])
      expect(ids).not.toContain(keep)
    expect(ids.filter((id) => spec.outputById.has(id)).sort()).toEqual(
      [
        'variantCount',
        'diffAxis',
        'granularity',
        'variation',
        'recommendParams',
        'outputLanguage',
      ].sort(),
    )
  })
})

describe('値の表示', () => {
  it('省略は初期状態。①以外は淡い', () => {
    expect(displayAxis(spec, field('purpose'), undefined)).toEqual({
      state: 'delegated',
      text: 'お任せ',
      muted: true,
    })
    expect(displayAxis(spec, field('length'), undefined).text).toBe('ツール任せ')
  })

  it('「足させない」項目の②は「（追加しない）」、③は既定値の名前を添える', () => {
    expect(displayAxis(spec, field('subGenres'), { state: 'delegated' }).text).toBe(
      'お任せ（追加しない）',
    )
    expect(displayAxis(spec, field('styleLean'), { state: 'defaulted' }).text).toMatch(
      /^既定値（.+）$/,
    )
  })

  it('①指定は種類ごとの表示（語の表示名・3値・自由記述・BPM・長さ・構成）', () => {
    const genre = spec.vocabularyById.get('genre')!.items.find((i) => i.id === 'orchestral')!
    expect(
      displayAxis(spec, field('mainGenre'), {
        state: 'specified',
        value: 'orchestral',
        freeText: ' 壮大に ',
      }),
    ).toEqual({ state: 'specified', text: `${genre.label} ／ 自由記述: 壮大に`, muted: false })
    const mood = displayAxis(spec, field('mood'), {
      state: 'specified',
      choices: { tense: 'use', nostalgic: 'exclude' },
    }).text
    expect(mood).toMatch(/^使用する: .+ ／ 使用しない: .+$/)
    expect(displayAxis(spec, field('bpm'), { state: 'specified', value: 120 }).text).toBe('120')
    expect(
      displayAxis(spec, field('bpm'), { state: 'specified', value: { min: 90, max: 100 } }).text,
    ).toBe('90〜100')
    expect(displayAxis(spec, field('length'), { state: 'specified', value: 185 }).text).toBe('3:05')
    expect(
      displayAxis(spec, field('structure'), { state: 'specified', value: ['intro', 'outro'] }).text,
    ).toMatch(/ → /)
    expect(
      displayAxis(spec, field('lyricsLanguage'), { state: 'specified', value: 'mixed' }).text,
    ).toBe('混在')
  })

  it('件数は 0 件の状態を出さない', () => {
    const req: SongRequest = {
      ...instReq,
      axes: { purpose: { state: 'specified', value: 'boss-battle-theme' } },
    }
    expect(stateCounts(spec, req, ['purpose', 'purposeDetail', 'styleLean'])).toBe(
      '指定 1 / お任せ 1 / 既定値 1',
    )
    expect(stateCounts(spec, createInitialSong(spec).requests[0]!, ['purpose'])).toBe('お任せ 1')
  })

  it('出力項目の表示（省略は既定値）。出力設定カードは依頼文の範囲と曲名案の言語を出さない', () => {
    const req = createInitialSong(spec).requests[0]!
    const o = (id: string) => displayOutput(spec, req, spec.outputById.get(id)!)
    expect(o('variantCount')).toBe('3')
    expect(o('granularity')).toBe('基本・詳細')
    expect(o('titleSuggestions')).toBe('出さない')
    expect(o('recommendParams')).toBe('なし')
    expect(o('outputLanguage')).toBe('標準')
    expect(o('variation')).not.toBe('standard') // ツールプロファイルの表示名
    const ids = outputCardItems(spec).map((x) => x.id)
    expect(ids).not.toContain('requestScope')
    expect(ids).not.toContain('titleLanguage')
    expect(ids).toHaveLength(8)
  })
})

describe('未完成（判断ポイント43）', () => {
  it('①指定なのに値が空の項目と、歌ありで作詞の主体が未選択', () => {
    expect(isIncomplete(findIncomplete(spec, instReq))).toBe(false)
    const req: SongRequest = {
      ...vocalReq,
      lyricsAuthor: null,
      axes: {
        ...vocalReq.axes,
        purpose: { state: 'specified' },
        notes: { state: 'specified', value: ' ' },
      },
    }
    const r = findIncomplete(spec, req)
    expect(r).toEqual({ emptyFields: ['purpose', 'notes'], lyricsAuthorMissing: true })
    expect(isIncomplete(r)).toBe(true)
  })

  it('②・自由記述だけの①は未完成ではない', () => {
    const req: SongRequest = {
      ...instReq,
      axes: { purpose: { state: 'delegated' }, mood: { state: 'specified', freeText: '静か' } },
    }
    expect(findIncomplete(spec, req).emptyFields).toEqual([])
  })
})
