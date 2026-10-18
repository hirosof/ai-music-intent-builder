// 保存データの読み込み（song-file.md §6-2・§7）と、書き出し→読み込みの往復（U3 の受け入れ基準）
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { factoryProfiles } from '@/data/factory'
import { checkSaved } from '@/data/validation'
import { isIncompleteFinding } from '@/domain/storage/autosave'
import { loadSaved } from '@/domain/storage/load'
import { buildExportFile, emptyStore, saveProfile, toJsonText } from '@/domain/storage/profiles'
import type { ExportFile, SongData } from '@/domain/types/song'

// テストの実行ディレクトリは app/（vitest.config.ts の root）
const SPEC = resolve(process.cwd(), '../design/v0/docs/specifications')
const INPUTS = resolve(process.cwd(), '../design/v0/docs/examples/inputs')
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

const songExample = readJson<SongData>(resolve(SPEC, 'song.example.json'))
const exportExample = readJson<ExportFile>(resolve(SPEC, 'song-export.example.json'))
const exampleInputs = readdirSync(INPUTS)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ name: f, data: readJson<SongData>(resolve(INPUTS, f)) }))

const NOW = new Date('2026-10-19T01:23:45Z')
const fileWith = (mutate: (f: ExportFile) => void): string => {
  const f = structuredClone(exportExample)
  mutate(f)
  return JSON.stringify(f)
}

describe('書き出し→読み込みの往復', () => {
  it('入力の例（歌あり・インスト）は、すべて検証を通る（往復の前提）', () => {
    expect(exampleInputs.length).toBeGreaterThanOrEqual(10)
    for (const { data } of exampleInputs)
      expect(checkSaved(JSON.stringify(data)).errors).toEqual([])
  })

  it('ストアに保存して書き出したファイルを読み込むと、楽曲データが一致する', () => {
    let store = emptyStore()
    const songs = [
      ...factoryProfiles.map((p) => ({ name: p.name, data: p.data })),
      { name: 'song.example', data: songExample },
      ...exampleInputs,
    ]
    for (const s of songs) store = saveProfile(store, s.name, s.data, NOW)
    const text = toJsonText(buildExportFile(store.profiles, NOW))
    const r = loadSaved(text, 'file', checkSaved)
    if (!r.ok) throw new Error(r.errors.join('\n'))
    expect(r.value.profiles.map((p) => p.name)).toEqual(songs.map((s) => s.name))
    r.value.profiles.forEach((p, i) => expect(p.data).toEqual(songs[i]!.data))
    expect(r.value).toEqual(JSON.parse(text))
  })

  it('1件の書き出しも、同じ読み込みで扱える', () => {
    const store = saveProfile(emptyStore(), '単一', songExample, NOW)
    const r = loadSaved(toJsonText(buildExportFile(store.profiles, NOW)), 'file', checkSaved)
    expect(r.ok && r.value.profiles.length).toBe(1)
    expect(r.ok && r.value.profiles[0]!.data).toEqual(songExample)
  })

  it('ストアそのもの（localStorage の値）も往復する', () => {
    const store = saveProfile(emptyStore(), 'a', songExample, NOW)
    const r = loadSaved(toJsonText(store), 'store', checkSaved)
    expect(r.ok && r.value).toEqual(store)
  })

  it('空のストアは有効（補完・仮定9）', () => {
    const r = loadSaved(toJsonText(emptyStore()), 'store', checkSaved)
    expect(r.ok).toBe(true)
  })
})

describe('読み込みの拒否（§6-2）', () => {
  it('正例: エクスポートファイルの例はエラー0・警告0で読める', () => {
    const r = loadSaved(JSON.stringify(exportExample), 'file', checkSaved)
    expect(r).toMatchObject({ ok: true, warnings: [] })
  })

  it('1. 新しい版は拒否する（外側・data のそれぞれ）', () => {
    for (const text of [
      fileWith((f) => (f.schemaVersion = 2)),
      fileWith((f) => (f.profiles[0]!.data.schemaVersion = 2)),
    ]) {
      const r = loadSaved(text, 'file', checkSaved)
      expect(r.ok).toBe(false)
      expect(!r.ok && r.errors.some((e) => e.includes('F8 新しい版'))).toBe(true)
    }
  })

  it('2. 古い版は、移行が未定義のため拒否する', () => {
    const r = loadSaved(
      fileWith((f) => (f.schemaVersion = 0)),
      'file',
      checkSaved,
    )
    expect(!r.ok && r.errors.some((e) => e.includes('F8 古い版'))).toBe(true)
  })

  it('3. 版がない・整数でないものは拒否する', () => {
    for (const v of [undefined, '1', 1.5]) {
      const text = fileWith((f) => {
        if (v === undefined) delete (f as Partial<ExportFile>).schemaVersion
        else (f as unknown as Record<string, unknown>).schemaVersion = v
      })
      const r = loadSaved(text, 'file', checkSaved)
      expect(r.ok).toBe(false)
      expect(!r.ok && r.errors.some((e) => e.includes('F8 schemaVersion がない'))).toBe(true)
    }
  })

  it('4. 不明な項目 id・語 id は拒否し、id を挙げる', () => {
    const unknownField = fileWith((f) => {
      ;(f.profiles[0]!.data.requests[0]!.axes as Record<string, unknown>).noSuchField = {
        state: 'delegated',
      }
    })
    const r1 = loadSaved(unknownField, 'file', checkSaved)
    expect(!r1.ok && r1.errors.some((e) => e.includes('noSuchField'))).toBe(true)

    const unknownTerm = fileWith((f) => {
      f.profiles[0]!.data.requests[0]!.axes.mainGenre = {
        state: 'specified',
        value: 'no-such-genre',
      }
    })
    const r2 = loadSaved(unknownTerm, 'file', checkSaved)
    expect(!r2.ok && r2.errors.some((e) => e.includes('no-such-genre'))).toBe(true)
  })

  it('5. 1件でも拒否になれば、ファイル全体を拒否する', () => {
    const text = fileWith((f) => {
      const bad = structuredClone(f.profiles[0]!)
      bad.name = '壊れた2件目'
      bad.data.schemaVersion = 99
      f.profiles.push(bad)
    })
    const r = loadSaved(text, 'file', checkSaved)
    expect(r.ok).toBe(false)
    expect('value' in r).toBe(false)
  })

  it('警告（toolVersion の差）では止めず、警告を返す（§7）', () => {
    const r = loadSaved(
      fileWith((f) => (f.profiles[0]!.data.requests[0]!.toolVersion = 'v5')),
      'file',
      checkSaved,
    )
    expect(r.ok).toBe(true)
    expect(r.warnings.some((w) => w.includes('F7'))).toBe(true)
    expect(r.ok && r.value.profiles[0]!.data.requests[0]!.toolVersion).toBe('v5')
  })

  it('JSON として読めないものは拒否する', () => {
    const r = loadSaved('{', 'file', checkSaved)
    expect(!r.ok && r.errors[0]).toMatch(/^F0 JSON として読めない/)
  })

  it('期待と違う形は拒否する', () => {
    const store = toJsonText(saveProfile(emptyStore(), 'a', songExample, NOW))
    const cases: [string, 'song' | 'store' | 'file'][] = [
      [JSON.stringify(songExample), 'file'],
      [store, 'file'],
      [JSON.stringify(exportExample), 'store'],
      [JSON.stringify(exportExample), 'song'],
      [store, 'song'],
      [JSON.stringify(songExample), 'store'],
    ]
    for (const [text, expected] of cases) {
      const r = loadSaved(text, expected, checkSaved)
      expect(r.ok).toBe(false)
      expect(!r.ok && r.errors[0]).toMatch(/^形が違う: /)
    }
  })
})

describe('自動保存で許す「未完成」の指摘', () => {
  it('S5 と、F12 のうち lyricsAuthor が null のものだけ', () => {
    const p = '[楽曲データ] 依頼 r1: '
    expect(isIncompleteFinding(`${p}S5 ①指定なのに値が空: purpose`)).toBe(true)
    expect(
      isIncompleteFinding(
        `${p}F12 vocalMode が vocal のとき、lyricsAuthor は chat-ai／chat-ai-instruction のいずれかが必須: None`,
      ),
    ).toBe(true)
    expect(
      isIncompleteFinding(
        `${p}F12 vocalMode が vocal のとき、lyricsAuthor は chat-ai／chat-ai-instruction のいずれかが必須: 'foo'`,
      ),
    ).toBe(false)
    expect(
      isIncompleteFinding(
        `${p}F12 vocalMode が instrumental のとき、lyricsAuthor は null: 'chat-ai'`,
      ),
    ).toBe(false)
    expect(
      isIncompleteFinding(`${p}S6 vocalMode vocal では無効な項目に①指定がある: structure`),
    ).toBe(false)
  })
})
