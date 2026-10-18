// UI 設定（song-file.md §5）: 版の不一致・スキーマ違反は破棄、不明な id は無視、既定値から変えたものだけを持つ
import { describe, it, expect } from 'vitest'

import schema from '@spec/ui-settings.schema.json'
import {
  createUiSettingsValidator,
  defaultUiSettings,
  isTermVisible,
  loadUiSettings,
  setTermVisibility,
} from '@/domain/storage/ui-settings'

const validate = createUiSettingsValidator(schema)
const load = (x: unknown) => loadUiSettings(typeof x === 'string' ? x : JSON.stringify(x), validate)

describe('UI 設定の読み込み', () => {
  it('値がなければ既定値', () => {
    expect(loadUiSettings(null, validate)).toEqual({
      status: 'empty',
      settings: defaultUiSettings(),
    })
  })

  it('仕様の例は読める。不明な語彙 id・語 id も消さずに保つ', () => {
    const example = {
      schemaVersion: 1,
      termVisibility: { genre: { 'trip-hop': true, edm: false }, 'no-such-vocab': { x: true } },
    }
    expect(load(example)).toEqual({ status: 'ok', settings: example })
  })

  it.each([
    ['JSON として読めない', '{'],
    ['版が新しい', { schemaVersion: 2, termVisibility: {} }],
    ['版が古い', { schemaVersion: 0, termVisibility: {} }],
    ['版がない', { termVisibility: {} }],
    ['真偽値でない', { schemaVersion: 1, termVisibility: { genre: { edm: 'no' } } }],
    ['id の書式が違う', { schemaVersion: 1, termVisibility: { Genre: {} } }],
    ['termVisibility がない', { schemaVersion: 1 }],
    ['未知のキー', { schemaVersion: 1, termVisibility: {}, extra: 1 }],
    ['最上位が配列', [1]],
  ])('破棄する: %s', (_, x) => {
    const r = load(x)
    expect(r.status).toBe('discarded')
    expect(r.settings).toEqual(defaultUiSettings())
  })

  it('版の不一致は、スキーマより先に、版を理由として破棄する', () => {
    for (const v of [2, 0, undefined]) {
      const r = load({ schemaVersion: v, termVisibility: {} })
      expect(r.status === 'discarded' && r.reason).toMatch(/^版が違う: /)
    }
  })
})

describe('語の表示の有無', () => {
  it('設定がなければ語彙の既定値、あれば設定の値', () => {
    const s = { schemaVersion: 1, termVisibility: { genre: { edm: false } } }
    expect(isTermVisible(s, 'genre', 'edm', true)).toBe(false)
    expect(isTermVisible(s, 'genre', 'trip-hop', true)).toBe(true)
    expect(isTermVisible(s, 'genre', 'trip-hop', false)).toBe(false)
    expect(isTermVisible(s, 'mood', 'x', true)).toBe(true)
  })

  it('既定値から変えたものだけを持ち、既定値に戻すと除く（空の語彙も除く）', () => {
    const s0 = defaultUiSettings()
    const s1 = setTermVisibility(s0, 'genre', 'trip-hop', true, false)
    expect(s1.termVisibility).toEqual({ genre: { 'trip-hop': true } })
    expect(s0.termVisibility).toEqual({})
    const s2 = setTermVisibility(s1, 'genre', 'edm', true, true)
    expect(s2.termVisibility).toEqual({ genre: { 'trip-hop': true } })
    const s3 = setTermVisibility(s2, 'genre', 'trip-hop', false, false)
    expect(s3.termVisibility).toEqual({})
  })
})
