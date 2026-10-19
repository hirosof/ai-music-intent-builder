// 階層テーブルの行と検索（presets.md §4・§11）、楽器の連動（判断ポイント31・L2）、自由記述への転記（判断ポイント49）
import { describe, it, expect } from 'vitest'

import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import {
  appendFreeText,
  isInstrumentExcluded,
  isRoleUsed,
  linkedInstrumentFields,
  setInstrumentExcluded,
  setRoleState,
  setRoleUse,
  transferToFreeText,
} from '@/domain/editor/edit'
import { createInitialSong } from '@/domain/editor/initial'
import { buildTree, filterTree, norm } from '@/domain/editor/tree'
import type { SongRequest } from '@/domain/types/song'

const genre = spec.vocabularyById.get('genre')!
const defaultVisible = (vocab: string) => (id: string) =>
  spec.vocabularyById.get(vocab)!.items.find((i) => i.id === id)?.defaultVisible !== false
const tree = (opts: Partial<Parameters<typeof buildTree>[2]> = {}) =>
  buildTree(spec, 'genre', {
    showHidden: false,
    isVisible: defaultVisible('genre'),
    keep: new Set(),
    ...opts,
  })
const ids = (rows: ReturnType<typeof tree>) =>
  new Set(rows.flatMap((c) => c.children.map((i) => i.id)))

describe('正規化', () => {
  it('全角半角・大小文字・ひらがなカタカナを区別しない', () => {
    expect(norm('ｼﾃｨﾎﾟｯﾌﾟ')).toBe(norm('シティポップ'))
    expect(norm('してぃぽっぷ')).toBe(norm('シティポップ'))
    expect(norm('ＣＩＴＹ pop')).toBe('city pop')
  })
})

describe('階層の行', () => {
  it('カテゴリは order の順、語は itemOrder の順。key はカテゴリを含む', () => {
    const rows = tree()
    const cats = [...genre.categories!].sort((a, b) => a.order - b.order)
    expect(rows.map((r) => r.id)).toEqual(
      cats.map((c) => c.id).filter((id) => rows.some((r) => r.id === id)),
    )
    const first = rows[0]!
    const order = cats.find((c) => c.id === first.id)!.itemOrder
    expect(first.children.map((c) => c.id)).toEqual(
      order.filter((id) => first.children.some((c) => c.id === id)),
    )
    expect(first.children[0]!.key).toBe(`${first.id}/${first.children[0]!.id}`)
  })

  it('カテゴリの並びはデータの順ではなく order の順', () => {
    const reversed = { ...genre, categories: [...genre.categories!].reverse() }
    const spec2 = {
      ...spec,
      vocabularyById: new Map([...spec.vocabularyById, ['genre', reversed]]),
    }
    const rows = buildTree(spec2, 'genre', {
      showHidden: false,
      isVisible: defaultVisible('genre'),
      keep: new Set(),
    })
    expect(rows.map((r) => r.id)).toEqual(tree().map((r) => r.id))
  })

  it('既定では表示の語だけ（205語）。非表示の語も表示で全語（385語）', () => {
    expect(ids(tree()).size).toBe(genre.items.filter((i) => i.defaultVisible !== false).length)
    expect(ids(tree({ showHidden: true })).size).toBe(genre.items.length)
  })

  it('非表示でも指定中の語は出し、印を付ける（§11-3 の 4）', () => {
    const hidden = genre.items.find(
      (i) => i.defaultVisible === false && i.exclusion?.kind === 'substitutable',
    )!
    const rows = tree({ keep: new Set([hidden.id]) })
    const row = rows.flatMap((c) => c.children).find((i) => i.id === hidden.id)!
    expect(row.hidden).toBe(true)
    expect(row.selectable).toBe(true)
    expect(row.exclusion?.kind).toBe('substitutable')
  })

  it('軸が違う語・保留の語は選べない（転記だけ。§11-3 の 7）', () => {
    const rows = tree({ showHidden: true }).flatMap((c) => c.children)
    const notSelectable = new Set(rows.filter((r) => !r.selectable).map((r) => r.id))
    const expected = genre.items.filter((i) =>
      ['other-axis', 'hold'].includes(i.exclusion?.kind ?? ''),
    )
    expect(notSelectable).toEqual(new Set(expected.map((i) => i.id)))
    expect(expected.length).toBe(21)
  })

  it('UI 設定で表示を変えた語に従う', () => {
    const shown = genre.items.find((i) => i.defaultVisible !== false)!
    const hidden = genre.items.find((i) => i.defaultVisible === false)!
    const flip = (id: string) =>
      id === shown.id ? false : id === hidden.id ? true : defaultVisible('genre')(id)
    const r = ids(tree({ isVisible: flip }))
    expect(r.has(shown.id)).toBe(false)
    expect(r.has(hidden.id)).toBe(true)
  })

  it('カテゴリを持たない語彙は扱わない', () => {
    expect(() =>
      buildTree(spec, 'emotion', { showHidden: false, isVisible: () => true, keep: new Set() }),
    ).toThrow('カテゴリを持たない語彙')
  })
})

describe('検索（階層を保つ）', () => {
  it('別名（カタカナ・ひらがな）で英語表記の語が見つかる', () => {
    const city = genre.items.find((i) => i.id === 'city-pop')!
    expect(city.aliases?.length).toBeGreaterThan(0)
    const found = filterTree(tree(), 'してぃぽっぷ')
    expect(ids(found).has('city-pop')).toBe(true)
  })

  it('カテゴリ名に一致すると、配下がすべて残る', () => {
    const rows = tree()
    const cat = rows[0]!
    const found = filterTree(rows, cat.label)
    expect(found.find((c) => c.id === cat.id)?.children.length).toBe(cat.children.length)
  })

  it('一致しないカテゴリは落ちる。空の検索は全部', () => {
    expect(filterTree(tree(), 'zzzzzz')).toEqual([])
    expect(filterTree(tree(), '  ')).toHaveLength(tree().length)
  })
})

describe('楽器の連動（L2）', () => {
  const [lead, acc, rhythm] = linkedInstrumentFields(spec).map((id) => spec.fieldById.get(id)!)
  const fresh = (): SongRequest => createInitialSong(spec).requests[0]!
  const valid = (req: SongRequest) => {
    const r = checkSaved(JSON.stringify({ schemaVersion: 1, requests: [req] }))
    return [...r.errors, ...r.warnings]
  }

  it('3項目は主旋律・伴奏・リズム', () => {
    expect(linkedInstrumentFields(spec)).toEqual([
      'leadInstruments',
      'accompanimentInstruments',
      'rhythmInstruments',
    ])
  })

  it('除外は①の役割すべてに書き、②の役割には書かない。検証の警告が出ない', () => {
    const req = fresh()
    setRoleState(spec, req, lead!, 'specified')
    setRoleState(spec, req, acc!, 'specified')
    setRoleUse(req, lead!, 'shakuhachi', true)
    setInstrumentExcluded(spec, req, 'guitar', true)
    expect(req.axes.leadInstruments!.choices).toEqual({ shakuhachi: 'use', guitar: 'exclude' })
    expect(req.axes.accompanimentInstruments!.choices).toEqual({ guitar: 'exclude' })
    expect(req.axes.rhythmInstruments).toBeUndefined()
    expect(isInstrumentExcluded(spec, req, 'guitar')).toBe(true)
    expect(valid(req)).toEqual([])
  })

  it('②の役割を①にすると、ほかの役割の除外を写す（使用するより除外を優先）', () => {
    const req = fresh()
    setRoleState(spec, req, lead!, 'specified')
    setInstrumentExcluded(spec, req, 'guitar', true)
    req.axes.rhythmInstruments = { state: 'delegated', choices: { guitar: 'use', taiko: 'use' } }
    setRoleState(spec, req, rhythm!, 'specified')
    expect(req.axes.rhythmInstruments.choices).toEqual({ guitar: 'exclude', taiko: 'use' })
    expect(valid(req)).toEqual([])
  })

  it('除外を外すと、すべての役割から消す（使用するは戻さない）', () => {
    const req = fresh()
    setRoleState(spec, req, lead!, 'specified')
    setRoleState(spec, req, acc!, 'specified')
    setInstrumentExcluded(spec, req, 'guitar', true)
    setInstrumentExcluded(spec, req, 'guitar', false)
    expect(req.axes.leadInstruments!.choices).toEqual({})
    expect(req.axes.accompanimentInstruments!.choices).toEqual({})
    expect(isInstrumentExcluded(spec, req, 'guitar')).toBe(false)
  })

  it('①の役割がなければ除外は書かれない。②の役割の「使用する」は使っていない扱い', () => {
    const req = fresh()
    setInstrumentExcluded(spec, req, 'guitar', true)
    expect(req.axes.leadInstruments).toBeUndefined()
    req.axes.leadInstruments = { state: 'delegated', choices: { guitar: 'use' } }
    expect(isRoleUsed(req, 'leadInstruments', 'guitar')).toBe(false)
  })
})

describe('自由記述への転記（判断ポイント49）', () => {
  it('末尾に「, 」区切りで追記し、同じ語は足さない', () => {
    expect(appendFreeText('', 'Lo-fi')).toBe('Lo-fi')
    expect(appendFreeText('静か', 'Lo-fi')).toBe('静か, Lo-fi')
    expect(appendFreeText('静か, ', 'Lo-fi')).toBe('静か, Lo-fi')
    expect(appendFreeText('静か, Lo-fi', 'Lo-fi')).toBe('静か, Lo-fi')
    expect(appendFreeText('静か,Lo-fi', 'Lo-fi')).toBe('静か,Lo-fi')
  })

  it('転記すると①指定になる', () => {
    const req = createInitialSong(spec).requests[0]!
    transferToFreeText(req, spec.fieldById.get('subGenres')!, 'Lo-fi')
    expect(req.axes.subGenres).toEqual({ state: 'specified', freeText: 'Lo-fi' })
  })
})
