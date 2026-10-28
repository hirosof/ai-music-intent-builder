// 語彙（design/v0/docs/specifications/presets/）の型。
// 仕様: presets.md §2。構造の正は presets.schema.json・presets-index.schema.json

export interface PresetIndex {
  schemaVersion: number
  vocabularies: { id: string; file: string }[]
}

/** 除外情報の種類（presets.md §2-5） */
export type ExclusionKind =
  | 'substitutable'
  | 'not-instrumental'
  | 'vocal'
  | 'contained'
  | 'count'
  | 'other-axis'
  | 'hold'

export interface Exclusion {
  kind: ExclusionKind
  note?: string
  /** 代替の組み合わせ（テキスト） */
  substitute?: string
  /** 行き先の軸（テキスト）。other-axis のときだけ持つ */
  targetAxis?: string | null
}

/** 語（presets.md §2-4） */
export interface VocabularyItem {
  id: string
  label: string
  /** 所属カテゴリ（categorized 語彙のみ）。先頭は語を審査したカテゴリ */
  categories?: string[]
  /** 代表項目が指すカテゴリ（categorized 語彙のみ） */
  represents?: string
  term?: { en?: string }
  /** true のときだけ書かれる。日本語が正式表記の語 */
  jpNative?: true
  aliases?: string[]
  /** false のときだけ書かれる（省略は表示） */
  defaultVisible?: false
  exclusion?: Exclusion
  /** 所属するグループの id（flat 語彙で、語彙が groups を持つときだけ。省略はグループなし。presets.md §2-4） */
  group?: string
}

/** グループ（flat 語彙のみ。表示の上で語をまとめる。presets.md §2-2。判断ポイント214） */
export interface VocabularyGroup {
  id: string
  label: string
}

/** カテゴリ（categorized 語彙のみ。presets.md §2-3）。表示のためだけに存在する */
export interface Category {
  id: string
  label: string
  order: number
  aliases?: string[]
  /** 所属する語（非表示の語を含む）の、表示順の id */
  itemOrder: string[]
}

/** 警告ペア（presets.md §2-6） */
export interface WarningPair {
  ids: [string, string]
  basis: 'W-a' | 'W-b'
  reason: string
  source: string
}

/** 語彙（presets.md §2-2） */
export interface Vocabulary {
  schemaVersion: number
  id: string
  axis: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  label: string
  structure: 'categorized' | 'flat'
  /** flat 語彙だけが持てる。配列順がグループの表示順 */
  groups?: VocabularyGroup[]
  categories?: Category[]
  /** flat 語彙の表示順は配列順 */
  items: VocabularyItem[]
  warningPairs?: WarningPair[]
}
