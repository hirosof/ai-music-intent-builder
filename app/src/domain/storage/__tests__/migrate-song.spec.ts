// 楽曲データの版1 → 2 の移行（UI 判断ポイント73。song-file.md §6-5）。参照実装の direct_song_migration と同じ組
import { describe, it, expect } from 'vitest'

import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import { factoryProfiles } from '@/data/factory'
import { loadSaved } from '@/domain/storage/load'
import { canMigrateSong, migrateSong } from '@/domain/storage/migrate'
import { defaultUiSettings } from '@/domain/storage/ui-settings'
import type { ExportFile, SongData } from '@/domain/types/song'
import exportExample from '@spec/song-export.example.json'
import songExample from '@spec/song.example.json'
import rawFactory from '@spec/factory-profiles.json'

const specified = { state: 'specified' }
const axesAfter = (vocalMode: string, axes: Record<string, unknown>) => {
  const src = { schemaVersion: 1, requests: [{ id: 'r', vocalMode, axes }] }
  const before = structuredClone(src)
  const out = migrateSong(src, spec) as unknown as SongData
  expect(src).toEqual(before) // 引数は書き換えない
  expect(out.schemaVersion).toBe(2)
  return out.requests[0]!.axes
}

describe('楽曲データの移行（版1 → 2）', () => {
  it('(1) structure: sung なしの要素にし、bridge を transition に付け替える', () => {
    expect(
      axesAfter('instrumental', { structure: { ...specified, value: ['intro', 'bridge'] } }),
    ).toEqual({ structure: { ...specified, value: [{ id: 'intro' }, { id: 'transition' }] } })
  })

  it('(2) lyricsStructure: defaultSung から sung を付ける。bridge は Cメロのまま', () => {
    expect(
      axesAfter('vocal', {
        lyricsStructure: { ...specified, value: ['intro', 'verse', 'bridge', 'outro'] },
      }),
    ).toEqual({
      structure: {
        ...specified,
        value: [
          { id: 'intro', sung: false },
          { id: 'verse', sung: true },
          { id: 'bridge', sung: true },
          { id: 'outro', sung: false },
        ],
      },
    })
  })

  it('(3) 両方あるときは、その vocalMode で有効だったほうを移す', () => {
    const both = {
      structure: { ...specified, value: ['bridge'] },
      lyricsStructure: { ...specified, value: ['verse'] },
    }
    expect(axesAfter('vocal', both)).toEqual({
      structure: { ...specified, value: [{ id: 'verse', sung: true }] },
    })
    expect(axesAfter('instrumental', both)).toEqual({
      structure: { ...specified, value: [{ id: 'transition' }] },
    })
  })

  it('(4) 状態はそのまま引き継ぐ（①指定の structure より、有効な側の②を残す）', () => {
    expect(
      axesAfter('vocal', {
        structure: { ...specified, value: ['theme'] },
        lyricsStructure: { state: 'delegated' },
      }),
    ).toEqual({ structure: { state: 'delegated' } })
  })

  it('(1)・(2) は、もう一方の項目がなくても当てる', () => {
    expect(axesAfter('vocal', { structure: { ...specified, value: ['bridge'] } })).toEqual({
      structure: { ...specified, value: [{ id: 'transition' }] },
    })
    expect(
      axesAfter('instrumental', { lyricsStructure: { ...specified, value: ['bridge'] } }),
    ).toEqual({ structure: { ...specified, value: [{ id: 'bridge', sung: true }] } })
  })

  it('どちらの項目もなければ足さない。形が崩れた値は検証に任せる', () => {
    expect(axesAfter('vocal', { notes: { state: 'delegated' } })).toEqual({
      notes: { state: 'delegated' },
    })
    expect(axesAfter('instrumental', { structure: { ...specified, value: 'intro' } })).toEqual({
      structure: { ...specified, value: 'intro' },
    })
    expect(axesAfter('instrumental', { structure: { ...specified, value: [1] } })).toEqual({
      structure: { ...specified, value: [1] },
    })
  })

  it('版0 は移行が未定義', () => {
    expect(canMigrateSong(1)).toBe(true)
    expect(canMigrateSong(0)).toBe(false)
  })
})

describe('読み込みの経路', () => {
  const v1Data = () => {
    const d = structuredClone(songExample) as unknown as Record<string, unknown>
    d.schemaVersion = 1
    const req = (d.requests as { axes: Record<string, unknown> }[])[0]!
    req.axes.structure = { state: 'specified', value: ['intro', 'bridge'] }
    return d
  }

  it('楽曲データの版1 を、移行して返す', () => {
    const r = loadSaved(spec, JSON.stringify(v1Data()), 'song', checkSaved)
    if (!r.ok) throw new Error(r.errors.join('\n'))
    expect(r.dataMigrated).toBe(true)
    expect(r.migratedFrom).toBeUndefined()
    expect(r.value.schemaVersion).toBe(2)
    expect(r.value.requests[0]!.axes.structure!.value).toEqual([
      { id: 'intro' },
      { id: 'transition' },
    ])
  })

  it('版2 のファイルの中の版1 の data も移行する。外側は移行していない（フォルダ構成を保てる）', () => {
    const f = structuredClone(exportExample) as unknown as ExportFile
    ;(f.profiles[0] as { data: unknown }).data = v1Data()
    const r = loadSaved(spec, JSON.stringify(f), 'file', checkSaved)
    if (!r.ok) throw new Error(r.errors.join('\n'))
    expect(r.dataMigrated).toBe(true)
    expect(r.migratedFrom).toBeUndefined()
    expect(r.value.profiles[0]!.data.schemaVersion).toBe(2)
  })

  it('今の版だけなら、移行の印は付かず、値はそのまま', () => {
    const r = loadSaved(spec, JSON.stringify(exportExample), 'file', checkSaved)
    if (!r.ok) throw new Error(r.errors.join('\n'))
    expect(r.dataMigrated).toBeUndefined()
    expect(r.value).toEqual(exportExample)
  })

  it('ファクトリーは外側を版1、楽曲データを版2 で置き、読むときに変わらない。1件目は song.example.json と同じ（UI 判断ポイント81）', () => {
    expect(rawFactory.schemaVersion).toBe(1)
    for (const p of rawFactory.profiles) expect(p.data.schemaVersion).toBe(2)
    expect(factoryProfiles.map((p) => p.data)).toEqual(rawFactory.profiles.map((p) => p.data))
    expect(rawFactory.profiles[0]!.data).toEqual(songExample)
  })

  it('UI 設定の版は 1 のまま（楽曲データの版とは独立）', () => {
    expect(defaultUiSettings().schemaVersion).toBe(1)
  })
})
