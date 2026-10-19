// カードに出す値の表示（ui-and-nonfunctional.md §1「カードに表示する内容」）。
// ②お任せも省略せずに出し、①指定以外は淡く表示する（RP-02）。表示名は語彙・fields.json・ツールプロファイルから取る
import type { Spec } from '../spec'
import type { FieldDef, OutputDef, StateId } from '../types/fields'
import type { AxisValue, LyricsAuthor, SongRequest, VocalMode } from '../types/song'

export interface DisplayValue {
  state: StateId
  /** 表示する文字列 */
  text: string
  /** ①指定以外は淡く表示する */
  muted: boolean
}

/** 曲の種類カードの表示名（仕様に表示名の定めがないため、U4a の補完） */
export const VOCAL_MODE_LABELS: Record<VocalMode, string> = {
  instrumental: 'インスト（歌なし）',
  vocal: '歌あり',
}
export const LYRICS_AUTHOR_LABELS: Record<LyricsAuthor, string> = {
  'chat-ai': 'チャットAIが歌詞を書く',
  'chat-ai-instruction': 'チャットAIが Suno の作詞AIへの指示を書く',
}

export function stateLabel(spec: Spec, state: StateId): string {
  return spec.fieldsDef.states.find((s) => s.id === state)?.label ?? state
}

/** 語（または固定の選択肢）の表示名。見つからなければ id */
export function termLabel(spec: Spec, field: FieldDef, id: string): string {
  if (field.options) return field.options.find((o) => o.id === id)?.label ?? id
  const vocab = field.vocabulary ? spec.vocabularyById.get(field.vocabulary) : undefined
  return vocab?.items.find((i) => i.id === id)?.label ?? id
}

const SEP = ' ／ '

const formatSeconds = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

function formatSpecified(spec: Spec, field: FieldDef, a: AxisValue): string {
  const parts: string[] = []
  const v = a.value
  switch (field.kind) {
    case 'select':
      if (typeof v === 'string') parts.push(termLabel(spec, field, v))
      break
    case 'triSelect': {
      const entries = Object.entries(a.choices ?? {})
      const use = entries.filter(([, c]) => c === 'use').map(([id]) => termLabel(spec, field, id))
      const exclude = entries
        .filter(([, c]) => c === 'exclude')
        .map(([id]) => termLabel(spec, field, id))
      if (use.length) parts.push(`使用する: ${use.join(', ')}`)
      if (exclude.length) parts.push(`使用しない: ${exclude.join(', ')}`)
      break
    }
    case 'text':
      if (typeof v === 'string') parts.push(v)
      break
    case 'bpm':
      if (typeof v === 'number') parts.push(String(v))
      else if (v && typeof v === 'object' && !Array.isArray(v)) parts.push(`${v.min}〜${v.max}`)
      break
    case 'length':
      if (typeof v === 'number') parts.push(formatSeconds(v))
      break
    case 'sectionList':
      if (Array.isArray(v)) parts.push(v.map((id) => termLabel(spec, field, id)).join(' → '))
      break
  }
  if (field.freeText && a.freeText?.trim()) parts.push(`自由記述: ${a.freeText.trim()}`)
  return parts.join(SEP)
}

/** 項目の値の表示。省略された項目は初期状態として表示する（input-items.md §5） */
export function displayAxis(spec: Spec, field: FieldDef, a: AxisValue | undefined): DisplayValue {
  const state = a?.state ?? field.initialState
  const label = stateLabel(spec, state)
  let text: string
  if (state === 'specified') {
    text = formatSpecified(spec, field, a ?? { state })
  } else if (state === 'delegated') {
    // 「足させない」項目の②は、AI が追加しないことを添える（議論ログ17 §2 の D）
    text = field.states.delegated?.rule === 'leave' ? `${label}（追加しない）` : label
  } else if (state === 'defaulted') {
    const d = field.states.defaulted?.value
    text = d ? `${label}（${termLabel(spec, field, d)}）` : label
  } else {
    text = label
  }
  return { state, text, muted: state !== 'specified' }
}

/** カードの件数（指定 n / お任せ n。0 件の状態は出さない） */
export function stateCounts(spec: Spec, req: SongRequest, fieldIds: string[]): string {
  const counts = new Map<StateId, number>()
  for (const id of fieldIds) {
    const f = spec.fieldById.get(id)
    if (!f) continue
    const s = req.axes[id]?.state ?? f.initialState
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return spec.fieldsDef.states
    .filter((s) => counts.get(s.id))
    .map((s) => `${s.label} ${counts.get(s.id)}`)
    .join(' / ')
}

/** 出力項目の値の表示。省略は既定値 */
export function displayOutput(spec: Spec, req: SongRequest, o: OutputDef): string {
  const has = Object.prototype.hasOwnProperty.call(req.output, o.id)
  const v = has ? req.output[o.id] : o.default
  const profile = spec.toolProfileById.get(req.toolId)
  const optionLabel = (id: unknown): string => {
    if (o.optionsFrom) {
      const p = profile?.params.find((x) => x.id === o.optionsFrom!.param)
      return p?.values?.find((x) => x.id === id)?.label ?? String(id)
    }
    return o.options?.find((x) => x.id === id)?.label ?? String(id)
  }
  switch (o.kind) {
    case 'number':
      return String(v)
    case 'select':
      return optionLabel(v)
    case 'multiSelect':
      return Array.isArray(v) && v.length ? v.map(optionLabel).join('・') : 'なし'
    case 'boolean':
      return v === true ? '出す' : '出さない'
    case 'perItemBoolean': {
      const on = v && typeof v === 'object' ? Object.entries(v).filter(([, b]) => b === true) : []
      const label = (id: string) => profile?.params.find((p) => p.id === id)?.label ?? id
      return on.length ? on.map(([id]) => label(id)).join('・') : 'なし'
    }
  }
}

/** 出力設定カードに出す出力項目（依頼文の範囲は曲の種類カード、曲名案の言語は出さない。判断ポイント48・50） */
export function outputCardItems(spec: Spec): OutputDef[] {
  return spec.fieldsDef.output.filter((o) => o.id !== 'requestScope' && o.id !== 'titleLanguage')
}
