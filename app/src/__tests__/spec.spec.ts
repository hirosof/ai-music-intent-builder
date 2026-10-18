import { describe, it, expect } from 'vitest'

import presetIndex from '@spec/presets/index.json'
import { fields, specSummary, toolProfiles, vocabularies } from '@/data/spec'

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
    expect(vocabularies.map((v) => v.id)).toEqual(presetIndex.vocabularies.map((e) => e.id))
  })

  it('ツールプロファイル suno と、項目 length が読める', () => {
    expect(toolProfiles.map((p) => p.toolId)).toEqual(['suno'])
    expect(fields.fields.some((f) => f.id === 'length')).toBe(true)
  })
})
