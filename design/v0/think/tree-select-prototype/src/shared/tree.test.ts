import { describe, expect, it } from 'vitest'
import genreJson from '../data/genre.json'
import { buildCategoryRows, filterRows, flatten, flatMatches, norm } from './tree'
import type { GenreFile } from './types'

const genre = genreJson as unknown as GenreFile
const visibleCount = genre.items.filter((i) => i.defaultVisible !== false).length

describe('buildCategoryRows', () => {
  const rows = buildCategoryRows(genre, { showHidden: false })

  it('カテゴリは16、order 順', () => {
    expect(rows).toHaveLength(16)
    expect(rows.map((r) => r.order)).toEqual([...rows.map((r) => r.order)].sort((a, b) => a - b))
  })

  it('各カテゴリの子は itemOrder の順で、表示語だけ', () => {
    const pop = rows.find((r) => r.id === 'pop-family')!
    expect(pop.children[0].id).toBe('pop') // 代表項目が先頭
    expect(pop.children[0].isRepresentative).toBe(true)
    expect(pop.children.every((c) => !c.hidden)).toBe(true)
  })

  it('同じ語が複数カテゴリに出て、key は一意（§4-4）', () => {
    const occurrences = rows.flatMap((r) => r.children).filter((c) => c.id === 'city-pop')
    expect(occurrences.map((o) => o.key).sort()).toEqual(['east-asian-family/city-pop', 'pop-family/city-pop'])
    const keys = rows.flatMap((r) => r.children.map((c) => c.key))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('表示語はすべてどこかのカテゴリに出る', () => {
    const ids = new Set(rows.flatMap((r) => r.children.map((c) => c.id)))
    expect(ids.size).toBe(visibleCount)
  })

  it('showHidden で非表示の語（180語）も出る', () => {
    const all = buildCategoryRows(genre, { showHidden: true })
    const ids = new Set(all.flatMap((r) => r.children.map((c) => c.id)))
    expect(ids.size).toBe(genre.items.length)
    expect(all.flatMap((r) => r.children).some((c) => c.hidden)).toBe(true)
  })
})

describe('検索', () => {
  const rows = buildCategoryRows(genre, { showHidden: false })

  it('正規化: 全角半角・大小文字・ひらがなを区別しない', () => {
    expect(norm('ＣＩＴＹ Ｐｏｐ')).toBe(norm('city pop'))
    expect(norm('していぽっぷ')).toBe(norm('シテイポップ'))
  })

  it('別名（カタカナ）で見つかり、所属する両カテゴリに残る', () => {
    const r = filterRows(rows, 'シティポップ')
    expect(r.map((c) => c.id).sort()).toEqual(['east-asian-family', 'pop-family'])
    expect(r.every((c) => c.children.some((x) => x.id === 'city-pop'))).toBe(true)
  })

  it('ひらがなでも見つかる', () => {
    expect(filterRows(rows, 'してぃぽっぷ').map((c) => c.id).sort()).toEqual(['east-asian-family', 'pop-family'])
  })

  it('カテゴリ名に一致すれば配下すべて', () => {
    const jazz = rows.find((r) => r.id === 'jazz-family')!
    const r = filterRows(rows, jazz.label)
    expect(r.find((c) => c.id === 'jazz-family')!.children).toHaveLength(jazz.children.length)
  })

  it('空の検索語は何も絞らない', () => {
    expect(filterRows(rows, '  ')).toBe(rows)
  })

  it('平らにした行の検索は階層の検索と同じ結果', () => {
    for (const q of ['シティポップ', 'jazz', 'ブルース', 'trap', 'zzzz']) {
      const tree = filterRows(rows, q).flatMap((c) => c.children.map((x) => x.key)).sort()
      const flat = flatten(rows).filter((r) => flatMatches(r, q)).map((r) => r.key).sort()
      expect(flat).toEqual(tree)
    }
  })
})
