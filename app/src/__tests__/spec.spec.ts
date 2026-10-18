import { describe, it, expect } from 'vitest'

import presetIndex from '@spec/presets/index.json'
import { spec, specSummary } from '@/data/spec'
import { buildSpec, fieldItemIds, profileParam } from '@/domain/spec'

// 期待値は check_fields.py の出力（項目 29＋10、語彙 19、ツールプロファイル 1）と同じ
describe('仕様の JSON の読み込み', () => {
  it('件数が check_fields.py と一致する', () => {
    expect(specSummary).toEqual({
      songFields: 29,
      outputFields: 10,
      vocabularies: 19,
      toolProfiles: 1,
    })
  })

  it('語彙は index.json の順序と id のとおりに読める', () => {
    expect([...spec.vocabularyById.keys()]).toEqual(presetIndex.vocabularies.map((e) => e.id))
  })

  it('索引にあってファイルがない語彙は、例外にする', () => {
    expect(() =>
      buildSpec({
        fields: spec.fieldsDef,
        presetIndex: { schemaVersion: 1, vocabularies: [{ id: 'x', file: 'x.json' }] },
        presetFiles: {},
        toolProfiles: [],
      }),
    ).toThrow('語彙のファイルがない: x.json')
  })

  it('ツールプロファイル suno と、そのパラメータ length の範囲が読める', () => {
    const suno = spec.toolProfileById.get('suno')
    expect(suno?.version.id).toBe('v6')
    expect(profileParam(suno, 'length')?.range).toMatchObject({ min: 10, max: 360 })
    expect(profileParam(suno, 'no-such-param')).toBeUndefined()
  })

  it('項目が取れる値は、語彙から（mainGenre）、または inline の options から（lyricsLanguage）', () => {
    const mainGenre = spec.fieldById.get('mainGenre')!
    const lyricsLanguage = spec.fieldById.get('lyricsLanguage')!
    expect(fieldItemIds(spec, mainGenre).has('city-pop')).toBe(true)
    expect([...fieldItemIds(spec, lyricsLanguage)]).toEqual(['japanese', 'english', 'mixed'])
  })
})
