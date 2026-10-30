// 取り込むプロファイルのプレビュー（判断ポイント65 (2)）。表示名と値はカードの表示の関数と同じ
import { describe, it, expect } from 'vitest'

import { spec } from '@/data/spec'
import { displayAxis } from '@/domain/editor/display'
import { createInitialSong } from '@/domain/editor/initial'
import { profilePreview } from '@/domain/storage/preview'
import type { Profile } from '@/domain/types/song'

const profileOf = (edit: (p: Profile) => void = () => {}): Profile => {
  const p: Profile = {
    name: '曲A',
    updatedAt: '2026-10-01T09:30:00+09:00',
    data: createInitialSong(spec),
  }
  edit(p)
  return p
}
const req = (p: Profile) => p.data.requests[0]!
const genre = spec.vocabularyById.get('genre')!.items[0]!

describe('プロファイルのプレビュー', () => {
  it('要約: 名前、更新日時、ツールと版、用途・主ジャンル（初期状態はお任せ）、警告の有無', () => {
    const pv = profilePreview(spec, profileOf(), [])
    expect(pv.name).toBe('曲A')
    expect(pv.updatedAt).toContain('2026')
    expect(pv.tool).toBe(`Suno ${req(profileOf()).toolVersion}`)
    expect(pv.summary).toEqual([
      { label: '用途', text: 'お任せ' },
      { label: '主ジャンル', text: 'お任せ' },
    ])
    expect(pv.hasWarnings).toBe(false)
    expect(profilePreview(spec, profileOf(), ['S3 …']).hasWarnings).toBe(true)
  })

  it('「指定」の項目は表示名と値の一覧（fields.json の並び）、ほかは状態ごとの件数', () => {
    const p = profileOf((x) => {
      req(x).axes.mainGenre = { state: 'specified', value: genre.id }
      req(x).axes.purpose = { state: 'specified', value: 'battle-theme' }
    })
    const pv = profilePreview(spec, p, [])
    expect(pv.specified).toEqual([
      { label: '用途', text: '戦闘BGM' },
      { label: '主ジャンル', text: genre.label },
    ])
    expect(pv.summary[1]).toEqual({ label: '主ジャンル', text: genre.label })
    // 件数は displayAxis の状態と同じ数え方
    const fid = (vocal: boolean) =>
      spec.fieldsDef.fields.filter((f) =>
        vocal
          ? f.id !== 'structure'
          : !['lyricsTheme', 'lyricsLanguage', 'lyricsStructure'].includes(f.id),
      )
    const count = (state: string) =>
      fid(false).filter((f) => displayAxis(spec, f, req(p).axes[f.id]).state === state).length
    expect(pv.others).toBe(
      [
        ['お任せ', count('delegated')],
        ['既定値', count('defaulted')],
        ['ツール任せ', count('toolManaged')],
      ]
        .filter(([, n]) => n)
        .map(([l, n]) => `${l} ${n}`)
        .join(' / '),
    )
  })

  it('今の vocalMode で無効な項目は数えない（インストの歌詞、歌ありの構成）', () => {
    const inst = profilePreview(spec, profileOf(), [])
    const vocal = profilePreview(
      spec,
      profileOf((x) => {
        req(x).vocalMode = 'vocal'
        req(x).lyricsAuthor = 'chat-ai'
        req(x).axes.lyricsTheme = { state: 'specified', value: '海' }
      }),
      [],
    )
    const total = (pv: typeof inst) =>
      pv.specified.length + pv.others.split(' / ').reduce((n, s) => n + Number(s.split(' ')[1]), 0)
    expect(total(inst)).toBe(spec.fieldsDef.fields.length - 3)
    expect(total(vocal)).toBe(spec.fieldsDef.fields.length - 1)
    expect(vocal.specified).toContainEqual({ label: '歌詞のテーマ・内容', text: '海' })
  })

  it('知らないツールは id のまま出す', () => {
    const p = profileOf((x) => (req(x).toolId = 'other'))
    expect(profilePreview(spec, p, []).tool).toBe(`other ${req(p).toolVersion}`)
  })
})
