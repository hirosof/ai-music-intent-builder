// 項目定義（design/v0/docs/specifications/fields.json）の型。
// 仕様: input-items.md §2（項目のキー・種類・状態）、§3（出力の制御）、§4（項目をまたぐ規則）。構造の正は fields.schema.json

/** 値の状態（input-items.md §1）。①指定 ②お任せ ③既定値 ④ツール任せ */
export type StateId = 'specified' | 'delegated' | 'defaulted' | 'toolManaged'

/** 項目の種類（input-items.md §2-2） */
export type FieldKind = 'select' | 'triSelect' | 'text' | 'bpm' | 'length' | 'sectionList'

/** ①指定のときの具体化の許容度 */
export type Specificity = 'expand' | 'adapt' | 'keep' | 'uiSetting'

/** ②お任せで、使える手がかりがないときの扱い（input-items.md §2-3） */
export type Fallback =
  | { type: 'omit' }
  | { type: 'choose' }
  | { type: 'value'; value: string }
  | { type: 'text'; text: string }

/** ②お任せの定義。derive は手がかりから導く、leave は足さない */
export type DelegatedDef =
  | { rule: 'derive'; cues: string[]; fallback: Fallback }
  | { rule: 'leave' }

export interface FieldStates {
  specified: Record<string, never>
  delegated?: DelegatedDef
  /** ③既定値。既定値を持つ単一選択の項目だけ（値は語彙の id） */
  defaulted?: { value: string }
  toolManaged?: { note?: string }
}

/** 語彙ファイルを持たない項目の、固定の選択肢（例: lyricsLanguage） */
export interface InlineOption {
  id: string
  label: string
}

export interface FieldDef {
  id: string
  label: string
  group: string
  kind: FieldKind
  /** 語彙 id（presets/）。select・triSelect・sectionList で使う。inline の options を持つ項目は持たない */
  vocabulary?: string
  options?: InlineOption[]
  /** 「足させない」値の語彙 id（単一選択の項目だけ。判断ポイント19） */
  leaveValues?: string[]
  freeText: boolean
  specificity: Specificity
  initialState: StateId
  states: FieldStates
  /** 範囲をツールプロファイルのパラメータから取る（length） */
  rangeFrom?: { param: string }
  note?: string
}

export interface GroupDef {
  id: string
  /** 軸（A〜G）。除外・自由記述のグループは null */
  axis: string | null
  label: string
  order: number
}

export type Severity = 'info' | 'warning' | 'error'

/** 項目をまたぐ規則（input-items.md §4） */
export type CrossFieldRule =
  | {
      id: string
      type: 'follows-delegated'
      field: string
      source: string
      severity: Severity
      note?: string
    }
  | {
      id: string
      type: 'active-when'
      field: string
      when: { field: string; choice: 'use' | 'exclude' }
      severity: Severity
      note?: string
    }
  | { id: string; type: 'linked-exclusion'; fields: string[]; severity: Severity; note?: string }
  | {
      id: string
      type: 'single-not-excluded'
      field: string
      against: string
      severity: Severity
      note?: string
    }

export type OutputKind = 'number' | 'select' | 'multiSelect' | 'boolean' | 'perItemBoolean'

/** 出力の制御（input-items.md §3）。状態は持たず、既定値を持つ */
export interface OutputDef {
  id: string
  label: string
  kind: OutputKind
  default: unknown
  /** 固定の選択肢。null は未定（titleLanguage） */
  options?: InlineOption[] | null
  /** 選択肢をツールプロファイルのパラメータから取る（variation） */
  optionsFrom?: { param: string }
  /** 項目の一覧を、ツールプロファイルの requestRole から取る（recommendParams） */
  itemsFrom?: { requestRole: string }
  note?: string
}

export interface FieldsDef {
  schemaVersion: number
  states: { id: StateId; label: string; number: number }[]
  groups: GroupDef[]
  fields: FieldDef[]
  crossFieldRules: CrossFieldRule[]
  output: OutputDef[]
}
