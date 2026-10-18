// 保存データの読み込み（song-file.md §6-2・§7）。検証は check-saved.ts（check_fields.py の移植）に任せ、
// ここでは「期待する形か」と「エラーが1件でもあれば全体を拒否する」を足す。
// 警告（F7 の toolVersion の差など）は、読み込みを止めずに返す（§7）
import type { ExportFile, ProfileStore, SongData } from '../types/song'
import { detectSavedKind, type CheckResult, type SavedKind } from '../validation/check-saved'

export type { SavedKind }

export interface SavedValue {
  song: SongData
  store: ProfileStore
  file: ExportFile
}

const KIND_LABEL: Record<SavedKind, string> = {
  song: '楽曲データ',
  store: 'プロファイルのストア',
  file: 'エクスポートファイル',
}

export type LoadResult<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] }

const parseObject = (text: string): Record<string, unknown> | undefined => {
  try {
    const v: unknown = JSON.parse(text)
    return typeof v === 'object' && v !== null && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

/**
 * 保存データの文字列を、期待する形として読み込む。
 * 形が違う、またはエラーが1件でもあれば拒否する（§6-2 の 5。部分的に読まない）。
 * check は検証（data/validation.ts の checkSaved）
 */
export function loadSaved<K extends SavedKind>(
  text: string,
  expected: K,
  check: (text: string) => CheckResult,
): LoadResult<SavedValue[K]> {
  const obj = parseObject(text)
  const kind = obj && detectSavedKind(obj)
  if (kind !== undefined && kind !== expected) {
    // ファイルの読み込みは、エクスポートファイルだけを受け付ける（判断ポイント46）
    const hint = expected === 'file' ? '。エクスポートファイルを使ってください' : ''
    return {
      ok: false,
      errors: [`形が違う: ${KIND_LABEL[expected]}を期待したが、${KIND_LABEL[kind]}だった${hint}`],
      warnings: [],
    }
  }
  const result = check(text)
  if (result.errors.length > 0 || obj === undefined)
    return { ok: false, errors: result.errors, warnings: result.warnings }
  return { ok: true, value: obj as unknown as SavedValue[K], warnings: result.warnings }
}
