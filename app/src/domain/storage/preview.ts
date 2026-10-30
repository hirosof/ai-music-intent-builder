// 取り込むプロファイルのプレビュー（ui-and-nonfunctional.md 判断ポイント65 (2)）。
// 要約（名前、更新日時、ツールと版、用途、主ジャンル、警告の有無）と、展開したときの「指定」の項目の一覧・ほかの状態の件数。
// 表示名と値は、カードと同じ表示の関数（display.ts）から作る
import { displayAxis, stateCounts } from '../editor/display'
import type { Spec } from '../spec'
import type { Profile } from '../types/song'
import { INSTRUMENTAL_ONLY_FIELDS, VOCAL_ONLY_FIELDS } from '../validation/check-saved'
import { formatDisplayTimestamp } from './timestamp'

export interface ProfilePreview {
  name: string
  /** 更新日時（表示の形） */
  updatedAt: string
  /** ツールと版（例: Suno v6） */
  tool: string
  /** 用途・主ジャンルの表示（要約に出す2項目） */
  summary: { label: string; text: string }[]
  hasWarnings: boolean
  /** 「指定」の項目（表示名と値。fields.json の並び） */
  specified: { label: string; text: string }[]
  /** ほかの状態の項目の件数（例: お任せ 20 / 既定値 2）。なければ空 */
  others: string
}

/** 要約に出す項目（判断ポイント65 (2) の「用途、主ジャンル」） */
const SUMMARY_FIELDS = ['purpose', 'mainGenre']

/** プロファイルのプレビュー。依頼は1件目（初版は1件）。今の vocalMode で無効な項目は数えない */
export function profilePreview(
  spec: Spec,
  profile: Profile,
  warnings: readonly string[],
): ProfilePreview {
  const req = profile.data.requests[0]!
  const tool = spec.toolProfileById.get(req.toolId)
  const invalid = new Set(req.vocalMode === 'vocal' ? INSTRUMENTAL_ONLY_FIELDS : VOCAL_ONLY_FIELDS)
  const fields = spec.fieldsDef.fields.filter((f) => !invalid.has(f.id))
  const shown = fields.map((f) => ({ f, d: displayAxis(spec, f, req.axes[f.id]) }))
  return {
    name: profile.name,
    updatedAt: formatDisplayTimestamp(profile.updatedAt),
    tool: `${tool?.label ?? req.toolId} ${req.toolVersion}`,
    summary: SUMMARY_FIELDS.flatMap((id) => {
      const x = shown.find((s) => s.f.id === id)
      return x ? [{ label: x.f.label, text: x.d.text }] : []
    }),
    hasWarnings: warnings.length > 0,
    specified: shown
      .filter((s) => s.d.state === 'specified')
      .map((s) => ({ label: s.f.label, text: s.d.text })),
    others: stateCounts(
      spec,
      req,
      shown.filter((s) => s.d.state !== 'specified').map((s) => s.f.id),
    ),
  }
}
