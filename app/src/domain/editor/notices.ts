// 依頼文の下の注意書き（ui-and-nonfunctional.md §3-2・§3-3、判断ポイント41・42）。
// 依頼文は変えず、UI で案内する。文面・閾値・一言は、初版は UI の定数（ツールプロファイルに属性を足さない）
import type { Spec } from '../spec'
import type { SongRequest } from '../types/song'
import { INSTRUMENTAL_ONLY_FIELDS, VOCAL_ONLY_FIELDS } from '../validation/check-saved'
import { isOutOfScope, requestScopeOf } from './cards'
import { currentState } from './edit'

/** 注意書きを出す対象ツール（どちらも Suno 固有の案内） */
const SUNO = 'suno'

export interface LengthNotice {
  /** スタイル欄の上限（ツールプロファイルの limit.value） */
  limit: number
  /** 粒度に基本プロンプトが含まれるとき、「基本プロンプトを使えます」を添える */
  basicHint: boolean
}

/** §3-3 文字数超過の注意書き。条件: Suno・依頼文の範囲が combined／style（スタイル欄が出る） */
export function lengthNotice(spec: Spec, req: SongRequest): LengthNotice | null {
  if (req.toolId !== SUNO) return null
  const scope = requestScopeOf(req)
  if (scope !== 'combined' && scope !== 'style') return null
  const profile = spec.toolProfileById.get(req.toolId)
  const field = profile?.fields.find((f) => f.id === profile.defaultDescriptionField)
  const limit = field?.limit?.value
  if (typeof limit !== 'number') return null
  const granularity = (req.output.granularity ??
    spec.outputById.get('granularity')?.default) as unknown
  return { limit, basicHint: Array.isArray(granularity) && granularity.includes('basic') }
}

/** §3-3 の文面（利用者向け。`{上限}` は limit.value） */
export const lengthNoticeText = (n: LengthNotice) => ({
  title: `Suno のスタイル欄は${n.limit}文字までです。`,
  lines: [
    'AI の回答が上限を超えていると、貼り付けたときに末尾が切れます。貼る前に文字数を確認してください。',
    ...(n.basicHint ? ['詳細プロンプトが長すぎるときは、基本プロンプトを使えます。'] : []),
  ],
})

/**
 * §3-2 作詞AIへの指示のチップ化の案内。条件（すべて）: Suno・歌あり・作詞の主体が chat-ai-instruction・
 * 依頼文の範囲が combined／lyrics（依頼文に「作詞AIへの指示」の欄が出る条件と同じ）
 */
export function chipNotice(req: SongRequest): boolean {
  const scope = requestScopeOf(req)
  return (
    req.toolId === SUNO &&
    req.vocalMode === 'vocal' &&
    req.lyricsAuthor === 'chat-ai-instruction' &&
    (scope === 'combined' || scope === 'lyrics')
  )
}

/** §3-2 の文面（利用者向け。241文字は 2026-10-17 の1回の観察。閾値が変わったらここを直す） */
export const CHIP_NOTICE = {
  title: 'Suno の「作詞AIへの指示」欄に貼るとき',
  before: [
    'チャットAIが書いた指示文が241文字以上だと、Suno の入力欄では本文ではなく添付（チップ）になり、そのままでは送信できません。',
    'チップになったときは、入力欄に次の一言を添えて送信してください。',
  ],
  phrase: '添付のテーマ・指示に従い歌詞を作成してください',
  after:
    '240文字までなら、そのまま貼って送信できます。この一言で指示がどの程度歌詞に反映されるかは、まだ確認できていません。',
} as const

// 解釈の幅（対象のグループを持たず、「お任せ」の項目すべてが対象。UI 判断ポイント63）
const DIFF_AXIS_INTERPRETATION = 'interpretation'

/**
 * UI 判断ポイント63 (B) 案ごとの差の付け方の案内。選んだ軸で変えられる項目（「お任せ」の項目）がないとき、文を返す（止めない）。
 * 出す条件: 依頼文に案ごとの差の付け方が出るとき（案の数が2以上、依頼文の範囲で外れていない）。
 * 対象は今の vocalMode で有効な項目。「既定値」「ツール任せ」は「お任せ」でない側に数える。
 * ②で何も足させない項目（rule が leave。除外・補足）は、差の付けようがないため数えない。
 * scopeReq は依頼文の範囲を見る依頼（isOutOfScope と同じ）
 */
export function diffAxisNotice(
  spec: Spec,
  req: SongRequest,
  scopeReq: SongRequest = req,
): string | null {
  const out = (id: string) => (id in req.output ? req.output[id] : spec.outputById.get(id)?.default)
  if (isOutOfScope(spec, scopeReq, 'diffAxis')) return null
  const count = out('variantCount')
  if (typeof count !== 'number' || count < 2) return null
  const option = spec.outputById.get('diffAxis')?.options?.find((o) => o.id === out('diffAxis'))
  const targets = option?.targetGroups
  if (!targets && option?.id !== DIFF_AXIS_INTERPRETATION) return null
  const invalid = new Set(req.vocalMode === 'vocal' ? INSTRUMENTAL_ONLY_FIELDS : VOCAL_ONLY_FIELDS)
  const fields = spec.fieldsDef.fields.filter(
    (f) =>
      !invalid.has(f.id) &&
      !isOutOfScope(spec, scopeReq, f.id) &&
      f.states.delegated?.rule !== 'leave' &&
      (!targets || targets.includes(f.group)),
  )
  if (fields.length === 0 || fields.some((f) => currentState(req, f) === 'delegated')) return null
  return targets
    ? `この軸の項目（${fields.map((f) => f.label).join('・')}）は、どれも「お任せ」でないため、案ごとの差が付きにくくなります`
    : '「お任せ」の項目がないため、案ごとの差が付きにくくなります'
}
