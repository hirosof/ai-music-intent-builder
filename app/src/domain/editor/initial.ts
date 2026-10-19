// 初期状態の楽曲データ（判断ポイント52。ui-and-nonfunctional.md §4-8）。「新規」と、自動保存がないときの起点
import { cloneJson } from '../clone'
import type { Spec } from '../spec'
import type { SongData } from '../types/song'
import { SUPPORTED_SCHEMA_VERSION } from '../validation/check-saved'

/** 初版の対象ツール（初版は Suno のみ） */
export const DEFAULT_TOOL_ID = 'suno'

/** 依頼の id。初版は依頼が1件のため固定（U3 の決定 I11） */
export const FIRST_REQUEST_ID = 'r1'

/**
 * 初期状態。インスト・新規生成、axes は空（各項目の初期状態）、output は fields.json の既定値。
 * 曲名案の言語（titleLanguage）は、選択肢が未定のため持たない（判断ポイント50）。
 * 推奨値を出させるか（recommendParams）は、既定がすべてオフで、省略した項目はオフのため空のオブジェクト
 */
export function createInitialSong(spec: Spec, toolId = DEFAULT_TOOL_ID): SongData {
  const profile = spec.toolProfileById.get(toolId)
  if (!profile) throw new Error(`未知の toolId: ${toolId}`)
  const output: Record<string, unknown> = {}
  for (const o of spec.fieldsDef.output) {
    if (o.id === 'titleLanguage') continue
    output[o.id] = o.kind === 'perItemBoolean' ? {} : cloneJson(o.default)
  }
  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    requests: [
      {
        id: FIRST_REQUEST_ID,
        toolId,
        toolVersion: profile.version.id,
        generationType: 'new',
        vocalMode: 'instrumental',
        lyricsAuthor: null,
        derivedFrom: null,
        axes: {},
        output,
      },
    ],
  }
}
