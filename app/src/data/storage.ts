// 保存の接続部（localStorage・ダウンロード）。規則は domain/storage/ の純関数に任せ、ここでは読み書きだけを行う。
// localStorage は使えない（プライベートブラウズ・無効化）ことや、容量を超えることがあるため、例外を結果として返す
import uiSettingsSchema from '@spec/ui-settings.schema.json'
import { loadAutosave, type AutosaveLoad } from '@/domain/storage/autosave'
import { loadSaved, type LoadResult } from '@/domain/storage/load'
import { normalizeForSave } from '@/domain/storage/normalize'
import { emptyStore, toJsonText } from '@/domain/storage/profiles'
import {
  createUiSettingsValidator,
  loadUiSettings,
  type UiSettings,
  type UiSettingsLoad,
} from '@/domain/storage/ui-settings'
import type { ExportFile, ProfileStore, SongData } from '@/domain/types/song'
import { checkSaved } from './validation'

/** localStorage のキー（song-file.md §8。接頭辞はアプリ名。U3 の決定 I3） */
export const STORAGE_KEYS = {
  song: 'ai-music-intent-builder/song',
  profiles: 'ai-music-intent-builder/profiles',
  uiSettings: 'ai-music-intent-builder/ui-settings',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export type StorageRead = { ok: true; text: string | null } | { ok: false; error: string }
export type StorageWrite = { ok: true } | { ok: false; error: string }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function readStorage(key: StorageKey): StorageRead {
  try {
    return { ok: true, text: window.localStorage.getItem(key) }
  } catch (e) {
    return { ok: false, error: message(e) }
  }
}

export function writeStorage(key: StorageKey, text: string): StorageWrite {
  try {
    window.localStorage.setItem(key, text)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: message(e) }
  }
}

// ---------------------------------------------------------------------------
// 自動保存（song-file.md §6-3。判断ポイント43・45）
// ---------------------------------------------------------------------------

/** 自動保存を読む。読めない・拒否したときは破棄（読み込まない）。未完成（S5・F12）は許す */
export function loadAutosaveFromStorage(): AutosaveLoad {
  const r = readStorage(STORAGE_KEYS.song)
  if (!r.ok)
    return { status: 'discarded', errors: [`localStorage を読めない: ${r.error}`], warnings: [] }
  return loadAutosave(r.text, checkSaved)
}

/** 自動保存する（正規化してから。未完成でも保存する） */
export function saveAutosave(song: SongData): StorageWrite {
  return writeStorage(STORAGE_KEYS.song, toJsonText(normalizeForSave(song)))
}

// ---------------------------------------------------------------------------
// 保存の前の検査（判断ポイント43「保存は厳格」）
// ---------------------------------------------------------------------------

export interface PreparedSong {
  /** 正規化した楽曲データ（判断ポイント45） */
  song: SongData
  /** 1件でもあれば、プロファイルへの保存とファイルへの書き出しをしない */
  errors: string[]
  warnings: string[]
}

/** 保存・書き出しの前に、正規化して検証する。警告は許す */
export function prepareForSave(song: SongData): PreparedSong {
  const normalized = normalizeForSave(song)
  const r = checkSaved(JSON.stringify(normalized))
  return { song: normalized, errors: r.errors, warnings: r.warnings }
}

// ---------------------------------------------------------------------------
// プロファイルのストア（判断ポイント44: 拒否したストアには書き込まない）
// ---------------------------------------------------------------------------

export type ProfileStoreState =
  | { status: 'ok'; store: ProfileStore; warnings: string[] }
  | { status: 'rejected'; errors: string[] }

/** プロファイルのストアを開く。値がなければ空のストア。拒否したら、そのストアには書き込めない状態になる */
export function openProfileStore(): ProfileStoreState {
  const r = readStorage(STORAGE_KEYS.profiles)
  if (!r.ok) return { status: 'rejected', errors: [`localStorage を読めない: ${r.error}`] }
  if (r.text === null) return { status: 'ok', store: emptyStore(), warnings: [] }
  const loaded = loadSaved(r.text, 'store', checkSaved)
  return loaded.ok
    ? { status: 'ok', store: loaded.value, warnings: loaded.warnings }
    : { status: 'rejected', errors: loaded.errors }
}

export type StoreCommit =
  | { ok: true; state: ProfileStoreState }
  | { ok: false; reason: 'rejected' | 'invalid' | 'storage'; errors: string[] }

/**
 * ストアに書き込む（保存・削除・取り込みの結果）。拒否したストアには書き込まない（判断ポイント44）。
 * 書き込む前に検証し、エラーが1件でもあれば書き込まない（ストア全体が読めなくなるのを防ぐ。判断ポイント43）
 */
export function commitProfileStore(state: ProfileStoreState, next: ProfileStore): StoreCommit {
  if (state.status === 'rejected')
    return {
      ok: false,
      reason: 'rejected',
      errors: ['プロファイルのストアを読み込めなかったため、書き込まない', ...state.errors],
    }
  const text = toJsonText(next)
  const check = checkSaved(text)
  if (check.errors.length > 0) return { ok: false, reason: 'invalid', errors: check.errors }
  const w = writeStorage(STORAGE_KEYS.profiles, text)
  if (!w.ok)
    return { ok: false, reason: 'storage', errors: [`localStorage に書けない: ${w.error}`] }
  return { ok: true, state: { status: 'ok', store: next, warnings: check.warnings } }
}

// ---------------------------------------------------------------------------
// ファイルの読み込み（判断ポイント46: エクスポートファイルだけ）
// ---------------------------------------------------------------------------

export function loadImportFile(text: string): LoadResult<ExportFile> {
  return loadSaved(text, 'file', checkSaved)
}

const validateUiSettings = createUiSettingsValidator(uiSettingsSchema)

/** UI 設定を読む。読めない・版が違う・スキーマ違反なら既定値（破棄。§5） */
export function loadUiSettingsFromStorage(): UiSettingsLoad {
  const r = readStorage(STORAGE_KEYS.uiSettings)
  return loadUiSettings(r.ok ? r.text : null, validateUiSettings)
}

export function saveUiSettings(settings: UiSettings): StorageWrite {
  return writeStorage(STORAGE_KEYS.uiSettings, toJsonText(settings))
}

/** JSON をファイルとしてダウンロードさせる（書き出しは常にダウンロード。判断ポイント34） */
export function downloadJson(fileName: string, value: unknown): void {
  const blob = new Blob([toJsonText(value)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  // ダウンロードの開始より先に URL を無効にしないよう、次の機会に回す
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
