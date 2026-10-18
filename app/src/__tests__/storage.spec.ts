// 保存の接続部（localStorage）と、ファクトリープロファイル。
// 判断ポイント43（自動保存は寛容・保存は厳格）、44（拒否したストアに書き込まない）、45（正規化）、46（ファイルはエクスポートファイルだけ）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, it, expect, vi } from 'vitest'

import { copyFactoryData, factoryProfiles } from '@/data/factory'
import {
  STORAGE_KEYS,
  commitProfileStore,
  loadAutosaveFromStorage,
  loadImportFile,
  loadUiSettingsFromStorage,
  openProfileStore,
  prepareForSave,
  readStorage,
  saveAutosave,
  saveUiSettings,
  writeStorage,
} from '@/data/storage'
import { checkSaved } from '@/data/validation'
import {
  buildExportFile,
  deleteProfile,
  emptyStore,
  importAdd,
  importReplace,
  makeProfile,
  saveProfile,
  toJsonText,
} from '@/domain/storage/profiles'
import { defaultUiSettings, setTermVisibility } from '@/domain/storage/ui-settings'
import type { SongData } from '@/domain/types/song'
import factoryJson from '@spec/factory-profiles.json'

const INPUTS = resolve(process.cwd(), '../design/v0/docs/examples/inputs')
const vocalSong = JSON.parse(readFileSync(resolve(INPUTS, 'rendered-07.json'), 'utf8')) as SongData
// 例の入力は、歌ありでも structure（無効な項目）を②お任せで持つ。正規化（判断ポイント45 の (2)）で省略される形
const vocalClean = structuredClone(vocalSong)
delete vocalClean.requests[0]!.axes.structure
const instSong = factoryProfiles[0]!.data
const NOW = new Date('2026-10-19T01:23:45Z')

/** ①指定なのに値が空（S5）の項目を持つ、未完成の楽曲データ */
const s5Song = (): SongData => {
  const s = structuredClone(instSong)
  s.requests[0]!.axes.purpose = { state: 'specified' }
  return s
}
/** 歌ありで作詞の主体が未選択（F12）の、未完成の楽曲データ */
const f12Song = (): SongData => {
  const s = structuredClone(vocalClean)
  s.requests[0]!.lyricsAuthor = null
  return s
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('ファクトリープロファイル', () => {
  it('同梱のファイルは、エラー0・警告0（判断ポイント40）', () => {
    const r = checkSaved(JSON.stringify(factoryJson))
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
    expect(factoryProfiles).toHaveLength(6)
  })

  it('読み込みは複製で、同梱のデータを書き換えない', () => {
    const name = factoryProfiles[0]!.name
    const d = copyFactoryData(name)!
    expect(d).toEqual(factoryProfiles[0]!.data)
    d.requests[0]!.toolVersion = 'changed'
    expect(factoryProfiles[0]!.data.requests[0]!.toolVersion).toBe('v6')
    expect(copyFactoryData('ない名前')).toBeUndefined()
  })
})

describe('localStorage のキー', () => {
  it('キーは3つで、接頭辞を持つ（song-file.md §8）', () => {
    const keys = Object.values(STORAGE_KEYS)
    expect(new Set(keys).size).toBe(3)
    for (const k of keys) expect(k.startsWith('ai-music-intent-builder/')).toBe(true)
  })

  it('使えない・容量を超えたときは、例外ではなく結果で返す', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(readStorage(STORAGE_KEYS.song)).toEqual({ ok: false, error: 'denied' })
    expect(writeStorage(STORAGE_KEYS.song, '{}')).toEqual({ ok: false, error: 'quota' })
    expect(openProfileStore().status).toBe('rejected')
    expect(loadAutosaveFromStorage().status).toBe('discarded')
    expect(loadUiSettingsFromStorage().status).toBe('empty')
  })
})

describe('自動保存（判断ポイント43・45）', () => {
  it('値がなければ空。保存したものを読める（往復）', () => {
    expect(loadAutosaveFromStorage()).toEqual({ status: 'empty' })
    for (const song of [instSong, vocalClean]) {
      expect(saveAutosave(song)).toEqual({ ok: true })
      expect(loadAutosaveFromStorage()).toEqual({
        status: 'ok',
        song,
        incomplete: [],
        warnings: [],
      })
    }
  })

  it('未完成（S5・F12）は拒否せず、未完成として読み込む', () => {
    for (const [song, code] of [
      [s5Song(), 'S5'],
      [f12Song(), 'F12'],
    ] as const) {
      saveAutosave(song)
      const r = loadAutosaveFromStorage()
      expect(r.status).toBe('ok')
      expect(r.status === 'ok' && r.song).toEqual(song)
      expect(r.status === 'ok' && r.incomplete.length === 1 && r.incomplete[0]).toContain(
        `${code} `,
      )
    }
  })

  it('未完成の2つ以外のエラーは破棄する（読み込まない）', () => {
    const cases: [string, (s: SongData) => void][] = [
      ['新しい版', (s) => (s.schemaVersion = 2)],
      [
        '不明な語 id',
        (s) => (s.requests[0]!.axes.mainGenre = { state: 'specified', value: 'no-such' }),
      ],
      ['F12 インストで lyricsAuthor がある', (s) => (s.requests[0]!.lyricsAuthor = 'chat-ai')],
      ['F13', (s) => (s.requests[0]!.output.requestScope = 'style')],
    ]
    for (const [, mutate] of cases) {
      const s = structuredClone(instSong)
      mutate(s)
      // 正規化を通さずに書く（アプリの不具合・版の変更で起こる状態）
      localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
      const r = loadAutosaveFromStorage()
      expect(r.status).toBe('discarded')
      // キーは消さない（次の自動保存で上書きされる）
      expect(localStorage.getItem(STORAGE_KEYS.song)).not.toBeNull()
    }
    for (const text of ['{', JSON.stringify(buildExportFile([factoryProfiles[0]!], NOW))]) {
      localStorage.setItem(STORAGE_KEYS.song, text)
      expect(loadAutosaveFromStorage().status).toBe('discarded')
    }
  })

  it('自動保存は正規化してから書く', () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.axes.structure = { state: 'specified', value: ['intro'] }
    s.requests[0]!.axes.mood = { state: 'delegated', choices: { tense: 'use' } }
    saveAutosave(s)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.song)!) as SongData
    expect(saved.requests[0]!.axes.structure).toBeUndefined()
    expect(saved.requests[0]!.axes.mood).toEqual({ state: 'delegated' })
  })
})

describe('保存の前の検査（判断ポイント43「保存は厳格」）', () => {
  it('未完成のデータはエラーになり、正しいデータは通る', () => {
    expect(prepareForSave(s5Song()).errors.some((e) => e.includes('S5 '))).toBe(true)
    expect(prepareForSave(f12Song()).errors.some((e) => e.includes('F12 '))).toBe(true)
    expect(prepareForSave(vocalClean)).toEqual({ song: vocalClean, errors: [], warnings: [] })
  })

  it('正規化で直るもの（①以外に残った値・無効な項目）はエラーにならない', () => {
    const s = structuredClone(instSong)
    s.requests[0]!.axes.lyricsTheme = { state: 'specified', value: 'x' }
    s.requests[0]!.axes.mood = { state: 'delegated', choices: { tense: 'use' } }
    expect(checkSaved(JSON.stringify(s)).errors.length).toBeGreaterThan(0)
    const r = prepareForSave(s)
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })
})

describe('プロファイルのストア（判断ポイント44）', () => {
  it('値がなければ空のストア。書き込んだものを読める', () => {
    const st = openProfileStore()
    expect(st).toEqual({ status: 'ok', store: emptyStore(), warnings: [] })
    const next = saveProfile(emptyStore(), 'a', instSong, NOW)
    const c = commitProfileStore(st, next)
    expect(c.ok).toBe(true)
    expect(openProfileStore()).toEqual({ status: 'ok', store: next, warnings: [] })
    const c2 = commitProfileStore(c.ok ? c.state : st, deleteProfile(next, 'a'))
    expect(c2.ok).toBe(true)
    expect(openProfileStore()).toEqual({ status: 'ok', store: emptyStore(), warnings: [] })
  })

  it('拒否したストアには、保存・削除・取り込み（追加・置換）のどれでも書き込まない（中身を保つ）', () => {
    const base = saveProfile(emptyStore(), 'a', instSong, NOW)
    const original = JSON.stringify({ ...base, schemaVersion: 2 })
    localStorage.setItem(STORAGE_KEYS.profiles, original)
    const st = openProfileStore()
    expect(st.status).toBe('rejected')
    expect(st.status === 'rejected' && st.errors.some((e) => e.includes('F8 新しい版'))).toBe(true)
    const file = buildExportFile([makeProfile('b', instSong, NOW)], NOW)
    const attempts = {
      保存: saveProfile(base, 'c', instSong, NOW),
      削除: deleteProfile(base, 'a'),
      取り込みの追加: importAdd(base, file, () => ({ action: 'overwrite' })).store,
      取り込みの置換: importReplace(file),
    }
    for (const next of Object.values(attempts)) {
      const c = commitProfileStore(st, next)
      expect(c).toMatchObject({ ok: false, reason: 'rejected' })
      expect(!c.ok && c.errors.some((e) => e.includes('F8 新しい版'))).toBe(true)
      expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe(original)
    }
  })

  it('エラーのあるストアは書き込まない', () => {
    const st = openProfileStore()
    const bad = saveProfile(emptyStore(), 'a', s5Song(), NOW)
    expect(commitProfileStore(st, bad)).toMatchObject({ ok: false, reason: 'invalid' })
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBeNull()
  })

  it('拒否しているあいだも、名前を付けてファイルにだけ書き出せる', () => {
    localStorage.setItem(STORAGE_KEYS.profiles, '{')
    expect(openProfileStore().status).toBe('rejected')
    const prepared = prepareForSave(instSong)
    const file = buildExportFile([makeProfile('逃がす', prepared.song, NOW)], NOW)
    expect(loadImportFile(toJsonText(file)).ok).toBe(true)
  })
})

describe('ファイルの読み込み（判断ポイント46）', () => {
  it('エクスポートファイルだけを受け付け、他の形は理由つきで拒否する', () => {
    const file = toJsonText(buildExportFile([factoryProfiles[0]!], NOW))
    expect(loadImportFile(file).ok).toBe(true)
    for (const text of [
      JSON.stringify(instSong),
      toJsonText(saveProfile(emptyStore(), 'a', instSong, NOW)),
    ]) {
      const r = loadImportFile(text)
      expect(r.ok).toBe(false)
      expect(!r.ok && r.errors[0]).toMatch(/エクスポートファイルを使ってください$/)
    }
  })

  it('自動保存で許す未完成（S5・F12）も、ファイル・ストアの読み込みでは拒否する', () => {
    for (const [song, code] of [
      [s5Song(), 'S5'],
      [f12Song(), 'F12'],
    ] as const) {
      // 自動保存では読める
      localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(song))
      expect(loadAutosaveFromStorage().status).toBe('ok')
      // ファイル
      const file = buildExportFile([makeProfile('a', song, NOW)], NOW)
      const r = loadImportFile(toJsonText(file))
      expect(r.ok).toBe(false)
      expect(!r.ok && r.errors.some((e) => e.includes(`${code} `))).toBe(true)
      // ストア
      localStorage.setItem(
        STORAGE_KEYS.profiles,
        toJsonText(saveProfile(emptyStore(), 'a', song, NOW)),
      )
      const st = openProfileStore()
      expect(st.status).toBe('rejected')
      expect(st.status === 'rejected' && st.errors.some((e) => e.includes(`${code} `))).toBe(true)
    }
  })
})

describe('UI 設定', () => {
  it('保存したものを読め、壊れた値は破棄する', () => {
    expect(loadUiSettingsFromStorage().status).toBe('empty')
    const s = setTermVisibility(defaultUiSettings(), 'genre', 'edm', false, true)
    saveUiSettings(s)
    expect(loadUiSettingsFromStorage()).toEqual({ status: 'ok', settings: s })
    localStorage.setItem(STORAGE_KEYS.uiSettings, 'x')
    expect(loadUiSettingsFromStorage().status).toBe('discarded')
  })
})
