// 書き出すファイルの名前（U3 の決定 I5）。1件はプロファイル名、一括は日時入りの固定名
import type { Profile } from '../types/song'

const pad = (n: number) => String(n).padStart(2, '0')

// Windows のファイル名に使えない文字と制御文字
// oxlint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f]/g

/** ファイル名に使えない文字を _ に置き換え、末尾の点と空白を除く（Windows は末尾の点・空白を落とすため） */
export function sanitizeFileName(name: string): string {
  return name.replace(FORBIDDEN, '_').replace(/[. ]+$/, '')
}

/** 一括の書き出しの名前。日時は端末のタイムゾーン */
export function bulkExportFileName(now: Date): string {
  const d = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const t = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `ai-music-intent-builder-profiles-${d}-${t}.json`
}

/** 書き出すファイルの名前。1件ならプロファイル名（使える文字が残らなければ一括と同じ名前） */
export function exportFileName(profiles: readonly Profile[], now: Date): string {
  if (profiles.length === 1) {
    const base = sanitizeFileName(profiles[0]!.name)
    if (base !== '') return `${base}.json`
  }
  return bulkExportFileName(now)
}
