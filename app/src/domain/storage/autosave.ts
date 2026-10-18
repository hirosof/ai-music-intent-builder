// 自動保存の読み込み（song-file.md §6-3、判断ポイント43「保存は厳格、復元は寛容」）。
// 自動保存の読み込みに限り、編集途中に自然に起こる次の2つを拒否の理由にしない（未完成として読み込む）:
//   S5（①指定なのに値が空）、F12（vocalMode = vocal で lyricsAuthor が null）
// 他のエラーは拒否し、破棄する（初版は移行がないため、版の不一致も破棄）。
// 破棄は「読み込まない」こと。キーは消さず、次の自動保存で上書きされる（U3 の解釈）
import type { SongData } from '../types/song'
import type { CheckResult } from '../validation/check-saved'
import { loadSaved } from './load'

// 指摘の文言は参照実装と同じ（check-saved.ts）。接頭辞（[楽曲データ] 依頼 r1: など）のあとに続く
const INCOMPLETE_PATTERNS = [
  /(?:^|[\]:] )S5 ①指定なのに値が空: /,
  /(?:^|[\]:] )F12 vocalMode が vocal のとき、lyricsAuthor は [^:]+のいずれかが必須: None$/,
]

/** 自動保存で許す「未完成」の指摘か */
export const isIncompleteFinding = (m: string) => INCOMPLETE_PATTERNS.some((p) => p.test(m))

export type AutosaveLoad =
  | { status: 'empty' }
  | { status: 'ok'; song: SongData; incomplete: string[]; warnings: string[] }
  | { status: 'discarded'; errors: string[]; warnings: string[] }

/** text は localStorage の値（ない場合は null） */
export function loadAutosave(
  text: string | null,
  check: (text: string) => CheckResult,
): AutosaveLoad {
  if (text === null) return { status: 'empty' }
  let incomplete: string[] = []
  const r = loadSaved(text, 'song', (t) => {
    const c = check(t)
    incomplete = c.errors.filter(isIncompleteFinding)
    return { ...c, errors: c.errors.filter((e) => !isIncompleteFinding(e)) }
  })
  if (!r.ok) return { status: 'discarded', errors: r.errors, warnings: r.warnings }
  return { status: 'ok', song: r.value, incomplete, warnings: r.warnings }
}
