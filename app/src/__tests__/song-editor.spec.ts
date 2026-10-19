// 編集中の状態（J1）: 自動保存（変更から 500ms 後。J4）、復元（判断ポイント43）、置き換え（判断ポイント52）、依頼文（J6）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'

import { AUTOSAVE_DELAY_MS, createSongEditor, type SongEditor } from '@/composables/useSongEditor'
import { factoryProfiles } from '@/data/factory'
import { spec } from '@/data/spec'
import { STORAGE_KEYS } from '@/data/storage'
import { createInitialSong } from '@/domain/editor/initial'
import type { SongData } from '@/domain/types/song'

const INPUTS = resolve(process.cwd(), '../design/v0/docs/examples/inputs')
const vocalSong = JSON.parse(readFileSync(resolve(INPUTS, 'rendered-11.json'), 'utf8')) as SongData
const factory = factoryProfiles[0]!.data
const stored = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.song) ?? 'null') as SongData | null

let editor: SongEditor
beforeEach(() => {
  vi.useFakeTimers()
  editor = createSongEditor()
})
afterEach(() => {
  editor.stop()
  vi.useRealTimers()
  localStorage.clear()
})

describe('起動と復元', () => {
  it('自動保存がなければ初期状態', () => {
    editor.start()
    expect(editor.restored.value).toEqual({ status: 'empty' })
    expect(editor.song.value).toEqual(createInitialSong(spec))
  })

  it('自動保存があれば復元する。未完成も読み込む', () => {
    const s = structuredClone(vocalSong)
    s.requests[0]!.lyricsAuthor = null
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(s))
    editor.start()
    expect(editor.restored.value?.status).toBe('ok')
    expect(editor.request.value.vocalMode).toBe('vocal')
    expect(editor.incomplete.value.lyricsAuthorMissing).toBe(true)
    expect(editor.generated.value).toEqual({ ok: false, reason: 'incomplete' })
  })

  it('読めない自動保存は破棄し、初期状態で始める（キーは消さない）', () => {
    localStorage.setItem(STORAGE_KEYS.song, '{')
    editor.start()
    expect(editor.restored.value?.status).toBe('discarded')
    expect(editor.song.value).toEqual(createInitialSong(spec))
    expect(localStorage.getItem(STORAGE_KEYS.song)).toBe('{')
  })

  it('start は2回呼んでも1回だけ動く', () => {
    editor.start()
    localStorage.setItem(STORAGE_KEYS.song, JSON.stringify(factory))
    editor.start()
    expect(editor.song.value).toEqual(createInitialSong(spec))
  })
})

describe('自動保存（J4）', () => {
  it('変更から 500ms 後に、正規化して保存する', async () => {
    editor.start()
    editor.song.value.requests[0]!.axes.mood = { state: 'delegated', choices: { tense: 'use' } }
    await nextTick()
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1)
    expect(stored()).toBeNull()
    vi.advanceTimersByTime(1)
    expect(stored()!.requests[0]!.axes.mood).toEqual({ state: 'delegated' })
  })

  it('起動しただけでは保存しない', async () => {
    editor.start()
    await nextTick()
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2)
    expect(stored()).toBeNull()
  })
})

describe('置き換え（判断ポイント52）', () => {
  it('置き換えると、一時保持を消し、すぐに自動保存する（複製を持つ）', () => {
    editor.start()
    editor.held.value.set('purpose', { state: 'specified', value: 'x' })
    const data = structuredClone(factory)
    editor.replaceSong(data)
    expect(editor.held.value.size).toBe(0)
    expect(stored()).toEqual(factory)
    data.requests[0]!.toolVersion = 'changed'
    expect(editor.request.value.toolVersion).toBe('v6')
  })

  it('新規は初期状態に置き換える', () => {
    editor.start()
    editor.replaceSong(vocalSong)
    editor.resetToInitial()
    expect(editor.song.value).toEqual(createInitialSong(spec))
    expect(stored()).toEqual(createInitialSong(spec))
  })
})

describe('依頼文（J6）', () => {
  it('入力に応じて作り直す', () => {
    editor.start()
    const first = editor.generated.value
    expect(first.ok).toBe(true)
    editor.replaceSong(factory)
    const second = editor.generated.value
    expect(second.ok && first.ok && second.text !== first.text).toBe(true)
  })

  it('未完成なら作らない。作れない組み合わせは理由を返す', () => {
    editor.start()
    editor.song.value.requests[0]!.axes.purpose = { state: 'specified' }
    expect(editor.generated.value).toEqual({ ok: false, reason: 'incomplete' })
    editor.song.value.requests[0]!.axes.purpose = { state: 'delegated' }
    editor.song.value.requests[0]!.generationType = 'derived'
    const g = editor.generated.value
    expect(g.ok === false && g.reason === 'error' && g.message).toMatch(/派生生成/)
  })

  it('リアクティブな状態からでも作れる（Proxy の複製で落ちない）', () => {
    editor.start()
    editor.replaceSong(vocalSong)
    expect(editor.savedSong.value.requests[0]!.axes.structure).toBeUndefined()
    expect(editor.generated.value.ok).toBe(true)
  })
})
