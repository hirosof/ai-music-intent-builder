// 保存データの日時（updatedAt・exportedAt）。タイムゾーン付きの ISO 8601（song-file.md §4-1、補完・仮定5）。
// 端末のタイムゾーンの時差付きで書く（例 2026-10-19T10:00:00+09:00。仕様の例と同じ形。U3 の決定 I4）
const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** offsetMinutes は UTC からの時差（分。東へ正）。省略時は端末のタイムゾーン */
export function formatTimestamp(date: Date, offsetMinutes = -date.getTimezoneOffset()): string {
  const local = new Date(date.getTime() + offsetMinutes * 60_000)
  const sign = offsetMinutes < 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  return (
    `${pad(local.getUTCFullYear(), 4)}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}
