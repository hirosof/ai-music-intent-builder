// 矛盾の警告（判断ポイント51、U4e の決定 N2）
import { describe, it, expect } from 'vitest'

import { factoryProfiles } from '@/data/factory'
import { spec } from '@/data/spec'
import { createInitialSong } from '@/domain/editor/initial'
import { findWarnings } from '@/domain/editor/warnings'
import type { SongRequest } from '@/domain/types/song'

const withAxes = (axes: SongRequest['axes']): SongRequest => ({
  ...createInitialSong(spec).requests[0]!,
  axes,
})
const genre = spec.vocabularyById.get('genre')!
const label = (id: string) => genre.items.find((i) => i.id === id)!.label

describe('警告', () => {
  it('ファクトリーと初期状態には警告がない', () => {
    expect(findWarnings(spec, createInitialSong(spec).requests[0]!)).toEqual([])
    for (const p of factoryProfiles) expect(findWarnings(spec, p.data.requests[0]!)).toEqual([])
  })

  it('用途がお任せで用途の詳細が指定（警告）', () => {
    const w = findWarnings(spec, withAxes({ purposeDetail: { state: 'specified', value: 'x' } }))
    expect(w).toEqual([
      {
        fieldId: 'purposeDetail',
        severity: 'warning',
        message: '用途がお任せのため、用途の詳細はお任せとして扱われます',
      },
    ])
    const ok = withAxes({
      purpose: { state: 'specified', value: 'boss-battle-theme' },
      purposeDetail: { state: 'specified', value: 'x' },
    })
    expect(findWarnings(spec, ok)).toEqual([])
  })

  it('様式の寄せ方が指定で、地域・文化の様式に「使用する」がない（情報）', () => {
    const w = findWarnings(
      spec,
      withAxes({ styleLean: { state: 'specified', value: 'traditional' } }),
    )
    expect(w).toEqual([
      {
        fieldId: 'styleLean',
        severity: 'info',
        message: '地域・文化の様式に「使用する」がないため、様式の寄せ方は依頼文に出ません',
      },
    ])
    const ok = withAxes({
      styleLean: { state: 'specified', value: 'traditional' },
      regionStyles: { state: 'specified', choices: { japanese: 'use' } },
    })
    expect(findWarnings(spec, ok)).toEqual([])
  })

  it('主ジャンルを副ジャンルで「使用しない」', () => {
    const w = findWarnings(
      spec,
      withAxes({
        mainGenre: { state: 'specified', value: 'orchestral' },
        subGenres: { state: 'specified', choices: { orchestral: 'exclude' } },
      }),
    )
    expect(w).toEqual([
      {
        fieldId: 'mainGenre',
        severity: 'warning',
        message: `主ジャンルの「${label('orchestral')}」が、副ジャンルで「使用しない」になっています`,
      },
    ])
  })

  it('近い系統のペアを両方「使用する」（理由を添える）。片方だけ・②なら出さない', () => {
    const pair = genre.warningPairs![0]!
    const [a, b] = pair.ids
    const w = findWarnings(
      spec,
      withAxes({ subGenres: { state: 'specified', choices: { [a]: 'use', [b]: 'use' } } }),
    )
    expect(w).toEqual([
      {
        fieldId: 'subGenres',
        severity: 'warning',
        message: `「${label(a)}」と「${label(b)}」を両方使用しています（${pair.reason}）`,
      },
    ])
    expect(
      findWarnings(spec, withAxes({ subGenres: { state: 'specified', choices: { [a]: 'use' } } })),
    ).toEqual([])
    expect(
      findWarnings(
        spec,
        withAxes({ subGenres: { state: 'delegated', choices: { [a]: 'use', [b]: 'use' } } }),
      ),
    ).toEqual([])
  })

  it('代表と兄弟の相反（両方向）。同じ向きは出さない', () => {
    const rep = genre.items.find((i) => i.represents)!
    const cat = genre.categories!.find((c) => c.id === rep.represents)!
    const sib = cat.itemOrder.find((id) => id !== rep.id)!
    const msg = `「${label(rep.id)}」（${cat.label}の代表）と「${label(sib)}」を、逆の指定にしています`
    for (const [r, s] of [
      ['exclude', 'use'],
      ['use', 'exclude'],
    ] as const) {
      const w = findWarnings(
        spec,
        withAxes({ subGenres: { state: 'specified', choices: { [rep.id]: r, [sib]: s } } }),
      )
      expect(w).toEqual([{ fieldId: 'subGenres', severity: 'warning', message: msg }])
    }
    expect(
      findWarnings(
        spec,
        withAxes({ subGenres: { state: 'specified', choices: { [rep.id]: 'use', [sib]: 'use' } } }),
      ),
    ).toEqual([])
  })

  it('楽器の代表と兄弟の相反も出す（役割ごと）', () => {
    const inst = spec.vocabularyById.get('instrument')!
    const rep = inst.items.find((i) => i.represents)!
    const sib = inst
      .categories!.find((c) => c.id === rep.represents)!
      .itemOrder.find((id) => id !== rep.id)!
    const w = findWarnings(
      spec,
      withAxes({
        leadInstruments: { state: 'specified', choices: { [rep.id]: 'use', [sib]: 'exclude' } },
      }),
    )
    expect(w.map((x) => x.fieldId)).toEqual(['leadInstruments'])
  })
})
