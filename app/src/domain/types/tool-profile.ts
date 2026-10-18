// ツールプロファイル（design/v0/docs/specifications/tool-profiles/*.json）の型。
// 仕様: tool-profile.md §2〜§8。構造の正は tool-profile.schema.json

/** 情報の確からしさ（tool-profile.md §3）。キーはすべて任意で、上位から継承する */
export interface Meta {
  source?: string
  confirmedAt?: string
  confirmedBy?: string
  targetVersion?: string
  note?: string
}

export type Plan = 'none' | 'pro' | 'premier' | null

export interface Screen {
  id: string
  label: string
  supported: boolean
  reason?: string
  note?: string
  meta?: Meta
}

/** 操作（tool-profile.md §4-3） */
export interface Operation {
  id: string
  label: string
  dropdownSection?: 'remix' | 'edit'
  plan?: Plan
  textInstruction?: 'yes' | 'no' | 'unknown'
  /** excluded 対象外／pending 保留／candidate 将来の候補／first 派生生成の第一候補 */
  scope: 'excluded' | 'pending' | 'candidate' | 'first'
  lengthHandling?: string
  note?: string
  meta?: Meta
}

/** モード（tool-profile.md §4-2） */
export interface Mode {
  id: string
  label: string
  screen: string
  generationType: 'new' | 'derived'
  operations?: Operation[]
  styleOnEnter?: { id: string; label: string }[]
  note?: string
}

/** 欄（tool-profile.md §5） */
export interface ToolField {
  id: string
  label: string
  kind: string
  modes: string[]
  limit?: { value?: number; unit?: string; status?: string }
  recommended?: {
    language: 'ja' | 'en'
    kind: 'target' | 'softUpper'
    value: number
    unit: string
    condition?: string
    meta?: Meta
  }[]
  languageNote?: string
  note?: string
}

/** パラメータの選択肢（select） */
export interface ParamValue {
  id: string
  label: string
  /** この値のとき、ツールがスタイル欄を書き換えるか（RP-06） */
  rewritesStyle?: boolean
}

/** パラメータ（tool-profile.md §6） */
export interface Param {
  id: string
  label: string
  kind: 'select' | 'slider' | 'toggle' | 'duration'
  /** R-12 の分類。input は依頼文への入力、recommend は推奨値を出させる候補、none は対象外 */
  requestRole: 'input' | 'recommend' | 'none'
  modes: string[]
  /** ツールの既定値（本ツールの既定値とは別） */
  default: unknown
  values?: ParamValue[]
  range?: { min: number; max: number; step?: number; sliderStep?: number; unit?: string }
  hasAuto?: boolean
  inputFormats?: ('seconds' | 'm:ss')[]
  note?: string
}

/** 入力項目とツールの欄・パラメータの対応（tool-profile.md §8） */
export interface Binding {
  item: { kind: 'axis' | 'output'; id: string }
  target: { kind: 'field' | 'param'; id: string } | null
  route: 'text' | 'uiSetting' | 'both'
  status?: 'pending'
  note?: string
}

export interface ToolProfile {
  toolId: string
  label: string
  version: { id: string; label: string; releasedAt: string; note?: string }
  updatedAt: string
  meta: Meta
  defaultDescriptionField: string
  screens: Screen[]
  modes: Mode[]
  fields: ToolField[]
  params: Param[]
  /** 機能（tool-profile.md §7-1）。キーは機能の id */
  features: Record<
    string,
    { supported: boolean; field?: string; method?: string; note?: string; meta?: Meta }
  >
  accountFeatures: {
    id: string
    label: string
    requestHandling: string
    note?: string
    meta?: Meta
  }[]
  models: { id: string; label: string; plan?: Plan; note?: string; meta?: Meta }[]
  bindings: Binding[]
}
