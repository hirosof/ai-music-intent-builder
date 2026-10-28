// 入力の操作（U4b）: 状態の切り替えと一時保持（K8）、単一選択の疑似選択肢（K1・K2）、3値、長さ（判断ポイント57）・BPM・数（判断ポイント56）、構成の並び
import { describe, it, expect } from 'vitest'

import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import {
  formatLength,
  moveSection,
  checkBpmRange,
  clampLength,
  COUNT_RANGE,
  LENGTH_CHIPS,
  lengthParts,
  minuteBounds,
  secondBounds,
  removeSection,
  selectMenu,
  selectOptions,
  type SelectMenuEntry,
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
    // 年代・時代感は 2026-10-28 から自由記述を持つ（入力項目の判断ポイント29）。持たない例はテンポ感
    const tempo = selectOptions(spec, field('tempoFeel'))
      .filter((o) => o.pseudo)
      .map((o) => o.value)
    expect(tempo).toEqual([SELECT_DELEGATED])
    const era = selectOptions(spec, field('era'))
      .filter((o) => o.pseudo)
      .map((o) => o.value)
    expect(era).toEqual([SELECT_DELEGATED, SELECT_NONE])
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

describe('ドロップダウンのグループ（UI 判断ポイント62。presets.md §6-2）', () => {
  /** 並びを、見出しは「# 見出し」、区切り線は「---」、選択肢は表示名で表す */
  const view = (es: SelectMenuEntry[]) =>
    es.map((e) =>
      e.type === 'item' ? e.option.label : e.type === 'label' ? `# ${e.label}` : '---',
    )

  it('年代・時代感: 疑似選択肢 → グループなしの語 → 西暦 → 和暦（各グループの前に区切り線と見出し）', () => {
    const f = field('era')
    expect(view(selectMenu(spec, f, selectOptions(spec, f)))).toEqual([
      'お任せ',
      '（一覧から選ばない）',
      '年代を特定しない',
      '---',
      '# 西暦',
      '1950年代以前',
      '1960年代',
      '1970年代',
      '1980年代',
      '1990年代',
      '2000年代',
      '2010年代',
      '2020年代',
      '---',
      '# 和暦',
      '明治',
      '大正',
      '昭和',
      '平成',
      '令和',
    ])
  })

  it('グループを持たない語彙は、selectOptions の並びのまま（区切り線・見出しなし）', () => {
    const f = field('intensity')
    const opts = selectOptions(spec, f)
    const menu = selectMenu(spec, f, opts)
    expect(menu.every((e) => e.type === 'item')).toBe(true)
    expect(menu.map((e) => (e.type === 'item' ? e.option : null))).toEqual(opts)
  })

  it('固定の選択肢（語彙を持たない項目）も、そのまま', () => {
    const f = field('lyricsLanguage')
    expect(selectMenu(spec, f, selectOptions(spec, f)).every((e) => e.type === 'item')).toBe(true)
  })

  it('表示の切り替えで語が1つも出ないグループは、見出しも区切り線も出さない', () => {
    const f = field('era')
    const groupOf = new Map(spec.vocabularyById.get('era')!.items.map((i) => [i.id, i.group]))
    const opts = selectOptions(spec, f, undefined, (id) => groupOf.get(id) !== 'japanese-era')
    const v = view(selectMenu(spec, f, opts))
    expect(v).not.toContain('# 和暦')
    expect(v.filter((x) => x === '---')).toHaveLength(1)
  })

  it('今の値が非表示の語なら、その語のグループの中に出す', () => {
    const f = field('era')
    const opts = selectOptions(spec, f, 'showa', (id) => id !== 'showa')
    const v = view(selectMenu(spec, f, opts))
    // selectOptions は非表示の今の値を末尾に足す。グループの中では、表示の語のあとに来る
    expect(v.slice(v.indexOf('# 和暦'))).toEqual([
      '# 和暦',
      '明治',
      '大正',
      '平成',
      '令和',
      '昭和（非表示の語）',
    ])
  })

  it('グループの id・見出しは語彙のデータだけから読む（画面のコードに決め打ちしない）', () => {
    const era = spec.vocabularyById.get('era')!
    const renamed = {
      ...era,
      groups: [{ id: 'g1', label: '区分A' }],
      items: era.items.map((i) => (i.group ? { ...i, group: 'g1' } : i)),
    }
    const altered = { ...spec, vocabularyById: new Map(spec.vocabularyById).set('era', renamed) }
    const f = field('era')
    const v = view(selectMenu(altered, f, selectOptions(altered, f)))
    expect(v).toContain('# 区分A')
    expect(v).not.toContain('# 西暦')
    expect(v.filter((x) => x === '---')).toHaveLength(1)
  })

  it('グループの定義にない group を持つ語は、グループなしとして出す（データでは S14 が防ぐ。落とさない）', () => {
    const era = spec.vocabularyById.get('era')!
    const broken = {
      ...era,
      items: era.items.map((i) => (i.id === 'showa' ? { ...i, group: 'unknown' } : i)),
    }
    const altered = { ...spec, vocabularyById: new Map(spec.vocabularyById).set('era', broken) }
    const f = field('era')
    const v = view(selectMenu(altered, f, selectOptions(altered, f)))
    expect(v.slice(0, v.indexOf('---'))).toContain('昭和')
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

describe('長さ（判断ポイント57）', () => {
  const range = { min: 10, max: 360 }

  it('チップは 1:00〜5:00', () => {
    expect(LENGTH_CHIPS.map(formatLength)).toEqual(['1:00', '2:00', '3:00', '4:00', '5:00'])
  })

  it('分・秒と秒の換算、表示は m:ss', () => {
    expect(lengthParts(125)).toEqual({ minutes: 2, seconds: 5 })
    expect(lengthParts(360)).toEqual({ minutes: 6, seconds: 0 })
    expect(formatLength(125)).toBe('2:05')
    expect(clampLength(2, 5, range)).toBe(125)
    expect(clampLength(3, 0, range)).toBe(180)
  })

  it('範囲は 0:10〜6:00 に収める（境界）', () => {
    expect(clampLength(0, 10, range)).toBe(10)
    expect(clampLength(0, 9, range)).toBe(10)
    expect(clampLength(0, 0, range)).toBe(10)
    expect(clampLength(6, 0, range)).toBe(360)
    expect(clampLength(6, 1, range)).toBe(360)
    expect(clampLength(5, 59, range)).toBe(359)
    expect(clampLength(9, 0, range)).toBe(360)
  })

  it('分の範囲は 0〜6。秒の範囲は 0分のとき 10〜59、6分のとき 0〜0、ほかは 0〜59', () => {
    expect(minuteBounds(range)).toEqual({ min: 0, max: 6 })
    expect(secondBounds(0, range)).toEqual({ min: 10, max: 59 })
    expect(secondBounds(3, range)).toEqual({ min: 0, max: 59 })
    expect(secondBounds(6, range)).toEqual({ min: 0, max: 0 })
  })
})

describe('BPM・数（判断ポイント56）', () => {
  it('BPM の範囲は下限 ≤ 上限', () => {
    expect(checkBpmRange(90, 100)).toEqual({ ok: true, value: { min: 90, max: 100 } })
    expect(checkBpmRange(100, 100).ok).toBe(true)
    expect(checkBpmRange(101, 100)).toEqual({ ok: false, message: '下限は上限以下にしてください' })
  })

  it('案の数・曲名案の数の範囲は 1〜10', () => {
    expect(COUNT_RANGE).toEqual({ min: 1, max: 10 })
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
