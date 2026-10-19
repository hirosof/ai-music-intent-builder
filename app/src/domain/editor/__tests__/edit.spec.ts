// 入力の操作（U4b）: 状態の切り替えと一時保持（K8）、単一選択の疑似選択肢（K1・K2）、3値、長さ・BPM・数の検査、構成の並び
import { describe, it, expect } from 'vitest'

import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import {
  formatLength,
  moveSection,
  parseBpm,
  parseBpmRange,
  parseCount,
  parseLength,
  removeSection,
  selectOptions,
  selectValue,
  setChoice,
  setFreeText,
  setSelect,
  setSpecifiedValue,
  setState,
  setText,
  stateOptions,
  SELECT_DEFAULTED,
  SELECT_DELEGATED,
  SELECT_NONE,
} from '@/domain/editor/edit'
import { createInitialSong } from '@/domain/editor/initial'
import { normalizeForSave } from '@/domain/storage/normalize'
import type { SongRequest } from '@/domain/types/song'

const field = (id: string) => spec.fieldById.get(id)!
const fresh = (): SongRequest => createInitialSong(spec).requests[0]!
const savedOf = (req: SongRequest) =>
  normalizeForSave({ schemaVersion: 1, requests: [req] }).requests[0]!

describe('状態の切り替えと一時保持（判断ポイント30・K8）', () => {
  it('①以外にしても値は残り、①に戻すと復元する。保存する形では落ちる', () => {
    const req = fresh()
    setSelect(req, field('intensity'), 'high')
    setState(req, field('intensity'), 'delegated')
    expect(req.axes.intensity).toEqual({ state: 'delegated', value: 'high' })
    expect(savedOf(req).axes.intensity).toEqual({ state: 'delegated' })
    setState(req, field('intensity'), 'specified')
    expect(req.axes.intensity).toEqual({ state: 'specified', value: 'high' })
  })

  it('取れない状態にはできない', () => {
    expect(() => setState(fresh(), field('purpose'), 'defaulted')).toThrow('取れない状態')
  })

  it('状態の選択肢は項目が取れるものだけ。長さの④は「（Auto）」を添える', () => {
    expect(stateOptions(spec, field('bpm')).map((o) => o.label)).toEqual(['指定', 'お任せ'])
    expect(stateOptions(spec, field('length')).map((o) => o.label)).toEqual([
      '指定',
      'ツール任せ（Auto）',
    ])
    expect(stateOptions(spec, field('intensity')).map((o) => o.value)).toEqual([
      'specified',
      'delegated',
      'defaulted',
    ])
  })
})

describe('単一選択（A1・K1・K2）', () => {
  it('先頭に状態の疑似選択肢。③を持つ項目は「既定値（○○）」を強調し、本物の語も選べる', () => {
    const opts = selectOptions(spec, field('intensity'))
    expect(opts.slice(0, 2)).toEqual([
      { value: SELECT_DELEGATED, label: 'お任せ', pseudo: true },
      {
        value: SELECT_DEFAULTED,
        label: expect.stringMatching(/^既定値（.+）$/),
        pseudo: true,
        highlight: true,
      },
    ])
    const d = field('intensity').states.defaulted!.value
    expect(opts.some((o) => o.value === d && !o.pseudo)).toBe(true)
  })

  it('③を持たない項目に「既定値」はなく、自由記述を持つ項目には「（一覧から選ばない）」がある', () => {
    const purpose = selectOptions(spec, field('purpose'))
      .filter((o) => o.pseudo)
      .map((o) => o.value)
    expect(purpose).toEqual([SELECT_DELEGATED, SELECT_NONE])
    const era = selectOptions(spec, field('era'))
      .filter((o) => o.pseudo)
      .map((o) => o.value)
    expect(era).toEqual([SELECT_DELEGATED])
  })

  it('固定の選択肢（歌詞本文の言語）も出す', () => {
    const opts = selectOptions(spec, field('lyricsLanguage')).filter((o) => !o.pseudo)
    expect(opts.map((o) => o.label)).toEqual(['日本語', '英語', '混在'])
  })

  it('今の値が非表示の語なら、それも選択肢に出す（presets.md §11-3 の 4）', () => {
    const hidden = spec.vocabularyById.get('genre')!.items.find((i) => i.defaultVisible === false)!
    expect(selectOptions(spec, field('mainGenre')).some((o) => o.value === hidden.id)).toBe(false)
    const opts = selectOptions(spec, field('mainGenre'), hidden.id)
    expect(opts[opts.length - 1]).toMatchObject({
      value: hidden.id,
      label: expect.stringMatching(/（非表示の語）$/),
    })
  })

  it('選ぶと状態と値が変わる。今の選択は状態から読む', () => {
    const req = fresh()
    const f = field('styleLean')
    expect(selectValue(req, f)).toBe(SELECT_DEFAULTED)
    setSelect(req, f, 'traditional')
    expect(req.axes.styleLean).toEqual({ state: 'specified', value: 'traditional' })
    expect(selectValue(req, f)).toBe('traditional')
    setSelect(req, f, SELECT_DELEGATED)
    expect(selectValue(req, f)).toBe(SELECT_DELEGATED)
    setSelect(req, f, SELECT_DEFAULTED)
    expect(req.axes.styleLean?.state).toBe('defaulted')
  })

  it('「（一覧から選ばない）」は①指定で値なし。自由記述だけで指定できる', () => {
    const req = fresh()
    const f = field('purpose')
    setSelect(req, f, 'boss-battle-theme')
    setSelect(req, f, SELECT_NONE)
    expect(req.axes.purpose).toEqual({ state: 'specified' })
    expect(selectValue(req, f)).toBe(SELECT_NONE)
    setFreeText(req, f, 'ボス戦')
    expect(checkSaved(JSON.stringify({ schemaVersion: 1, requests: [req] })).errors).toEqual([])
    setFreeText(req, f, '')
    expect(req.axes.purpose).toEqual({ state: 'specified' })
  })
})

describe('3値・自由記述', () => {
  it('語ごとに使用する／使用しない／未指定（キーを消す）。操作すると①指定', () => {
    const req = fresh()
    const f = field('mood')
    setChoice(req, f, 'tense', 'use')
    setChoice(req, f, 'nostalgic', 'exclude')
    expect(req.axes.mood).toEqual({
      state: 'specified',
      choices: { tense: 'use', nostalgic: 'exclude' },
    })
    setChoice(req, f, 'tense', null)
    expect(req.axes.mood!.choices).toEqual({ nostalgic: 'exclude' })
  })

  it('自由記述の項目は値を書く', () => {
    const req = fresh()
    setText(req, field('notes'), '静かに始める')
    expect(req.axes.notes).toEqual({ state: 'specified', value: '静かに始める' })
  })
})

describe('長さ・BPM・数（K4・K5・K7）', () => {
  const range = { min: 10, max: 360 }
  it.each([
    ['180', 180],
    ['3:00', 180],
    [' 2:05 ', 125],
    ['10', 10],
    ['6:00', 360],
  ])('長さ %s → %d 秒', (input, sec) => {
    expect(parseLength(input, range)).toEqual({ ok: true, value: sec })
  })
  it.each(['', 'abc', '3:5', '3:60', '9', '361', '6:01', '-5', '1.5'])(
    '長さの誤り: %s',
    (input) => {
      expect(parseLength(input, range).ok).toBe(false)
    },
  )
  it('長さの表示は m:ss', () => {
    expect(formatLength(125)).toBe('2:05')
  })

  it('BPM は正の数。範囲は下限 ≤ 上限', () => {
    expect(parseBpm('120')).toEqual({ ok: true, value: 120 })
    expect(parseBpm('92.5')).toEqual({ ok: true, value: 92.5 })
    for (const bad of ['', '0', '-1', 'x', '1e2']) expect(parseBpm(bad).ok).toBe(false)
    expect(parseBpmRange('90', '100')).toEqual({ ok: true, value: { min: 90, max: 100 } })
    expect(parseBpmRange('100', '100').ok).toBe(true)
    expect(parseBpmRange('101', '100')).toEqual({
      ok: false,
      message: '下限は上限以下にしてください',
    })
    expect(parseBpmRange('', '100').ok).toBe(false)
  })

  it('数は 1〜10 の整数', () => {
    expect(parseCount('1')).toEqual({ ok: true, value: 1 })
    expect(parseCount('10')).toEqual({ ok: true, value: 10 })
    for (const bad of ['0', '11', '2.5', '', 'a']) expect(parseCount(bad).ok).toBe(false)
  })

  it('正しい値は①指定で書く。保存データとして正しい', () => {
    const req = fresh()
    setSpecifiedValue(req, field('length'), 150)
    setSpecifiedValue(req, field('bpm'), { min: 90, max: 100 })
    setSpecifiedValue(req, field('structure'), ['intro', 'outro'])
    expect(checkSaved(JSON.stringify({ schemaVersion: 1, requests: [req] })).errors).toEqual([])
  })
})

describe('構成の並び（K6）', () => {
  it('上下の入れ替え（端では変わらない）と削除（最後の1つは消せない）', () => {
    expect(moveSection(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveSection(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
    expect(moveSection(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(moveSection(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
    expect(removeSection(['a', 'b', 'a'], 2)).toEqual(['a', 'b'])
    expect(removeSection(['a'], 0)).toEqual(['a'])
  })
})
