// カードの構成（ui-and-nonfunctional.md §1・§1-2。判断ポイント48）と、依頼文の範囲による「淡い表示」（判断ポイント53）
import type { Spec } from '../spec'
import type { FieldDef } from '../types/fields'
import type { RequestScope, SongRequest } from '../types/song'

export type CardId =
  | 'songType'
  | 'basic'
  | 'expression'
  | 'sound'
  | 'structure'
  | 'lyrics'
  | 'exclusionNotes'
  | 'output'

export interface CardSection {
  /** 小見出し（fields.json のグループの表示名）。曲の種類・出力設定は持たない */
  label?: string
  fieldIds: string[]
}

export interface CardDef {
  id: CardId
  /** 「曲の種類」「歌詞」は仮の名前（判断ポイント48 の補完・仮定①） */
  label: string
  /** 件数（指定 n / お任せ n）を出すか。状態を持つ項目のカードだけ */
  showCounts: boolean
  /** 歌ありのときだけ出すカード */
  vocalOnly?: boolean
  /** 楽曲の項目（axes）のグループ。曲の種類・出力設定は持たない */
  groups: string[]
}

/** カードの並び（固定。ui-and-nonfunctional.md §9） */
export const CARDS: readonly CardDef[] = [
  { id: 'songType', label: '曲の種類', showCounts: false, groups: [] },
  { id: 'basic', label: '基本', showCounts: true, groups: ['purpose-context', 'genre-style'] },
  { id: 'expression', label: '表現', showCounts: true, groups: ['mood-tone', 'production'] },
  { id: 'sound', label: '音の構成', showCounts: true, groups: ['sound'] },
  { id: 'structure', label: '構造', showCounts: true, groups: ['time'] },
  { id: 'lyrics', label: '歌詞', showCounts: true, vocalOnly: true, groups: ['lyrics'] },
  { id: 'exclusionNotes', label: '除外・補足', showCounts: true, groups: ['exclusion', 'notes'] },
  { id: 'output', label: '出力設定', showCounts: false, groups: [] },
]

// vocalMode によって画面から外す項目（判断ポイント48。S6 と同じ組）
const INSTRUMENTAL_ONLY = new Set(['structure'])

/** 今の依頼で表示するカード（インストは7枚、歌ありは8枚） */
export function visibleCards(req: SongRequest): CardDef[] {
  return CARDS.filter((c) => !c.vocalOnly || req.vocalMode === 'vocal')
}

/** カードの項目を、グループごとの小見出しに分けて返す（fields.json の並び順） */
export function cardSections(spec: Spec, card: CardDef, req: SongRequest): CardSection[] {
  const vocal = req.vocalMode === 'vocal'
  return card.groups.map((g) => {
    const group = spec.fieldsDef.groups.find((x) => x.id === g)
    const fieldIds = spec.fieldsDef.fields
      .filter((f) => f.group === g)
      .filter((f) => !(vocal && INSTRUMENTAL_ONLY.has(f.id)))
      .map((f) => f.id)
    return { label: card.groups.length > 1 ? group?.label : undefined, fieldIds }
  })
}

export const requestScopeOf = (req: SongRequest): RequestScope => {
  const s = req.output.requestScope
  return s === 'style' || s === 'lyrics' ? s : 'combined'
}

// 依頼文の範囲で、依頼文に出ないもの（request-blocks.md §3-4 の表から）
//   style:  歌詞のブロック（B-LY 系）、作詞の主体、曲名案（B-07-6）
//   lyrics: B-06 の D・E・F（音の構成・時間的な構造・制作と質感）。ただし長さは 5-2 に出る。
//           除外（B-06x）。案の数・案ごとの差・粒度・バリエーション・推奨値・出力言語
const HIDDEN_BY_SCOPE: Record<
  Exclude<RequestScope, 'combined'>,
  { groups: string[]; outputs: string[] }
> = {
  style: {
    groups: ['lyrics'],
    outputs: ['titleSuggestions', 'titleCount', 'lyricsAuthor'],
  },
  lyrics: {
    groups: ['sound', 'time', 'production', 'exclusion'],
    outputs: [
      'variantCount',
      'diffAxis',
      'granularity',
      'variation',
      'recommendParams',
      'outputLanguage',
    ],
  },
}
// lyrics でも依頼文に出る項目（5-2 の長さの行）
const SHOWN_IN_LYRICS = new Set(['length'])

/**
 * 依頼文の範囲によって依頼文に出ない項目か（淡く表示する。編集は妨げず、値は保持する。判断ポイント48・53）。
 * id は楽曲の項目の id、出力項目の id、または 'lyricsAuthor'
 */
export function isOutOfScope(spec: Spec, req: SongRequest, id: string): boolean {
  const scope = requestScopeOf(req)
  if (scope === 'combined') return false
  const hidden = HIDDEN_BY_SCOPE[scope]
  if (hidden.outputs.includes(id)) return true
  const field: FieldDef | undefined = spec.fieldById.get(id)
  if (!field) return false
  if (scope === 'lyrics' && SHOWN_IN_LYRICS.has(id)) return false
  return hidden.groups.includes(field.group)
}

/** 依頼文の範囲の表示名（fields.json の requestScope の選択肢） */
export function requestScopeLabel(spec: Spec, scope: RequestScope): string {
  return spec.outputById.get('requestScope')?.options?.find((o) => o.id === scope)?.label ?? scope
}
