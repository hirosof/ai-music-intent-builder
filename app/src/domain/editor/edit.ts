// 入力の操作（U4b）。編集中の依頼（画面上の形）を直接書き換える。
// 状態を変えても値は消さない（一時保持。判断ポイント30・U4b の決定 K8）。保存するときの正規化（判断ポイント45）で、①以外の値は落ちる
import type { Spec } from '../spec'
import type { FieldDef, StateId } from '../types/fields'
import type { AxisValue, Choice, SongRequest } from '../types/song'
import { stateLabel, termLabel } from './display'

/** 項目の値（なければ初期状態で作る） */
export function axisOf(req: SongRequest, field: FieldDef): AxisValue {
  req.axes[field.id] ??= { state: field.initialState }
  return req.axes[field.id]!
}

export const currentState = (req: SongRequest, field: FieldDef): StateId =>
  req.axes[field.id]?.state ?? field.initialState

/** 状態だけを変える。値は残す（①に戻すと復元される） */
export function setState(req: SongRequest, field: FieldDef, state: StateId): void {
  if (!field.states[state]) throw new Error(`取れない状態: ${field.id}.${state}`)
  axisOf(req, field).state = state
}

/** 項目が取れる状態（fields.json の順。①②③④） */
export function stateOptions(spec: Spec, field: FieldDef): { value: StateId; label: string }[] {
  return spec.fieldsDef.states
    .filter((s) => field.states[s.id])
    .map((s) => ({
      value: s.id,
      label: field.kind === 'length' && s.id === 'toolManaged' ? `${s.label}（Auto）` : s.label,
    }))
}

// ---------------------------------------------------------------------------
// 単一選択（A1: 状態を選択肢に混ぜ込む。B1 は疑似選択肢「既定値（○○）」の強調で表す。K1・K2）
// ---------------------------------------------------------------------------

export const SELECT_DELEGATED = '__delegated'
export const SELECT_DEFAULTED = '__defaulted'
/** 自由記述を持つ項目で、一覧から選ばずに①指定にする（自由記述だけで指定する） */
export const SELECT_NONE = '__none'

export interface SelectOption {
  value: string
  label: string
  /** 状態を表す疑似選択肢 */
  pseudo: boolean
  /** 既定値（B1。強調表示する） */
  highlight?: boolean
}

/**
 * 単一選択の選択肢。語は既定で表示の語だけ。ただし、今の値が非表示の語なら、それも出す（presets.md §11-3 の 4）。
 * 語ごとの表示の切り替え（UI 設定）は isVisible で反映する（U4e の決定 N4）
 */
export function selectOptions(
  spec: Spec,
  field: FieldDef,
  current?: string,
  /** 語の表示の有無（UI 設定を反映したもの。省略は語彙の既定値） */
  isVisible: (id: string) => boolean = (id) =>
    spec.vocabularyById.get(field.vocabulary ?? '')?.items.find((i) => i.id === id)
      ?.defaultVisible !== false,
): SelectOption[] {
  const out: SelectOption[] = []
  if (field.states.delegated)
    out.push({ value: SELECT_DELEGATED, label: stateLabel(spec, 'delegated'), pseudo: true })
  const d = field.states.defaulted?.value
  if (d)
    out.push({
      value: SELECT_DEFAULTED,
      label: `${stateLabel(spec, 'defaulted')}（${termLabel(spec, field, d)}）`,
      pseudo: true,
      highlight: true,
    })
  if (field.freeText) out.push({ value: SELECT_NONE, label: '（一覧から選ばない）', pseudo: true })
  const ids = field.options
    ? field.options.map((o) => o.id)
    : (spec.vocabularyById.get(field.vocabulary!)?.items ?? [])
        .filter((i) => isVisible(i.id))
        .map((i) => i.id)
  for (const id of ids) out.push({ value: id, label: termLabel(spec, field, id), pseudo: false })
  if (current && !current.startsWith('__') && !ids.includes(current))
    out.push({
      value: current,
      label: `${termLabel(spec, field, current)}（非表示の語）`,
      pseudo: false,
    })
  return out
}

/** 単一選択の今の選択（疑似選択肢を含む） */
export function selectValue(req: SongRequest, field: FieldDef): string {
  const a = req.axes[field.id]
  const state = a?.state ?? field.initialState
  if (state === 'delegated') return SELECT_DELEGATED
  if (state === 'defaulted') return SELECT_DEFAULTED
  return typeof a?.value === 'string' ? a.value : SELECT_NONE
}

export function setSelect(req: SongRequest, field: FieldDef, choice: string): void {
  if (choice === SELECT_DELEGATED) return setState(req, field, 'delegated')
  if (choice === SELECT_DEFAULTED) return setState(req, field, 'defaulted')
  const a = axisOf(req, field)
  a.state = 'specified'
  if (choice === SELECT_NONE) delete a.value
  else a.value = choice
}

// ---------------------------------------------------------------------------
// 3値選択・自由記述
// ---------------------------------------------------------------------------

/** 語の3値を変える。null は未指定（キーを持たない）。操作したら①指定にする */
export function setChoice(
  req: SongRequest,
  field: FieldDef,
  termId: string,
  choice: Choice | null,
) {
  const a = axisOf(req, field)
  a.state = 'specified'
  const choices = { ...a.choices }
  if (choice === null) delete choices[termId]
  else choices[termId] = choice
  a.choices = choices
}

/** 項目内の自由記述（select・triSelect）。入力したら①指定にする */
export function setFreeText(req: SongRequest, field: FieldDef, text: string): void {
  const a = axisOf(req, field)
  a.state = 'specified'
  if (text === '') delete a.freeText
  else a.freeText = text
}

/** 自由記述の項目（text）の値 */
export function setText(req: SongRequest, field: FieldDef, text: string): void {
  const a = axisOf(req, field)
  a.state = 'specified'
  a.value = text
}

// ---------------------------------------------------------------------------
// 長さ（判断ポイント57）。よく使う長さのチップと、「分」「秒」の2つの数値入力。保存は秒の整数（データの形は変えない）
// ---------------------------------------------------------------------------

/** よく使う長さ（秒）。1:00〜5:00 */
export const LENGTH_CHIPS = [60, 120, 180, 240, 300] as const

export const formatLength = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

export interface LengthRange {
  min: number
  max: number
}

/** 秒を分・秒に分ける */
export const lengthParts = (sec: number) => ({ minutes: Math.floor(sec / 60), seconds: sec % 60 })

/** 分の範囲（0〜6。範囲の上限から） */
export const minuteBounds = (range: LengthRange) => ({
  min: Math.floor(range.min / 60),
  max: Math.floor(range.max / 60),
})

/** その分での秒の範囲（0分のとき最小は10、6分のとき最大は0） */
export function secondBounds(minutes: number, range: LengthRange) {
  const base = minutes * 60
  return { min: Math.max(0, range.min - base), max: Math.min(59, range.max - base) }
}

/** 分・秒を秒にして、範囲（0:10〜6:00）に収める */
export function clampLength(minutes: number, seconds: number, range: LengthRange): number {
  const total = Math.round(minutes) * 60 + Math.round(seconds)
  return Math.min(range.max, Math.max(range.min, total))
}

// ---------------------------------------------------------------------------
// BPM（判断ポイント56。数値は UInputNumber。範囲は最小 ≤ 最大）
// ---------------------------------------------------------------------------

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string }

/** BPM の範囲の検査（最小 ≤ 最大） */
export function checkBpmRange(min: number, max: number): Checked<{ min: number; max: number }> {
  if (min > max) return { ok: false, message: '下限は上限以下にしてください' }
  return { ok: true, value: { min, max } }
}

/** 正しい値を①指定で書き込む（長さ・BPM・構成） */
export function setSpecifiedValue(req: SongRequest, field: FieldDef, value: AxisValue['value']) {
  const a = axisOf(req, field)
  a.state = 'specified'
  a.value = value
}

// ---------------------------------------------------------------------------
// 構成（セクションの並び。K6）。空の並びは書き込まない（最後の1つは消せない）
// ---------------------------------------------------------------------------

export function moveSection(list: readonly string[], index: number, delta: -1 | 1): string[] {
  const j = index + delta
  if (j < 0 || j >= list.length) return [...list]
  const out = [...list]
  ;[out[index], out[j]] = [out[j]!, out[index]!]
  return out
}

export function removeSection(list: readonly string[], index: number): string[] {
  if (list.length <= 1) return [...list]
  return list.filter((_, i) => i !== index)
}

// ---------------------------------------------------------------------------
// 出力の数値（案の数・曲名案の数。K7。入力は UInputNumber。判断ポイント56）
// ---------------------------------------------------------------------------

/** 案の数・曲名案の数の範囲（fields.json は上限未定。後で直しやすい定数。K7） */
export const COUNT_RANGE = { min: 1, max: 10 } as const

// ---------------------------------------------------------------------------
// 楽器の統合テーブル（判断ポイント31・D1、U4c の決定 L2）。3項目は crossFieldRules の linked-exclusion が持つ
// ---------------------------------------------------------------------------

/** 除外が連動する楽器の3項目（主旋律・伴奏・リズム） */
export function linkedInstrumentFields(spec: Spec): string[] {
  const r = spec.fieldsDef.crossFieldRules.find((x) => x.type === 'linked-exclusion')
  return r && r.type === 'linked-exclusion' ? r.fields : []
}

const specifiedRoles = (spec: Spec, req: SongRequest) =>
  linkedInstrumentFields(spec).filter((id) => req.axes[id]?.state === 'specified')

/** 語が除外されているか（①の役割のどれかで「使用しない」） */
export function isInstrumentExcluded(spec: Spec, req: SongRequest, termId: string): boolean {
  return specifiedRoles(spec, req).some((id) => req.axes[id]?.choices?.[termId] === 'exclude')
}

/** 役割で使うか（その役割が①で「使用する」） */
export function isRoleUsed(req: SongRequest, roleId: string, termId: string): boolean {
  const a = req.axes[roleId]
  return a?.state === 'specified' && a.choices?.[termId] === 'use'
}

/** 役割のチェック。その役割が①のときだけ（呼び出し側で押せなくする） */
export function setRoleUse(req: SongRequest, role: FieldDef, termId: string, on: boolean): void {
  setChoice(req, role, termId, on ? 'use' : null)
}

/** 除外。①の役割すべてに「使用しない」を書く（②の役割には書かない）。外すと、すべての役割から「使用しない」を消す */
export function setInstrumentExcluded(
  spec: Spec,
  req: SongRequest,
  termId: string,
  on: boolean,
): void {
  if (on) {
    for (const id of specifiedRoles(spec, req))
      setChoice(req, spec.fieldById.get(id)!, termId, 'exclude')
    return
  }
  for (const id of linkedInstrumentFields(spec)) {
    const a = req.axes[id]
    if (a?.choices?.[termId] === 'exclude') {
      const choices = { ...a.choices }
      delete choices[termId]
      a.choices = choices
    }
  }
}

/** 役割の状態。①にしたら、ほかの①の役割の除外を写す（連動。R の「連動で補う」を出さない） */
export function setRoleState(spec: Spec, req: SongRequest, role: FieldDef, state: StateId): void {
  if (state === 'specified') {
    const excluded = new Set<string>()
    for (const id of specifiedRoles(spec, req)) {
      if (id === role.id) continue
      for (const [t, c] of Object.entries(req.axes[id]?.choices ?? {}))
        if (c === 'exclude') excluded.add(t)
    }
    setState(req, role, 'specified')
    if (excluded.size) {
      const a = axisOf(req, role)
      a.choices = {
        ...a.choices,
        ...Object.fromEntries([...excluded].map((t) => [t, 'exclude' as Choice])),
      }
    }
    return
  }
  setState(req, role, state)
}

// ---------------------------------------------------------------------------
// 自由記述への転記（判断ポイント49。軸が違う語・保留の語）。末尾に「, 」区切りで追記し、同じ語があれば足さない
// ---------------------------------------------------------------------------

export function appendFreeText(current: string, text: string): string {
  const parts = current
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
  if (parts.includes(text)) return current
  return current.trim() === '' ? text : `${current.replace(/[\s,]+$/, '')}, ${text}`
}

/** 転記して①指定にする */
export function transferToFreeText(req: SongRequest, field: FieldDef, text: string): void {
  setFreeText(req, field, appendFreeText(req.axes[field.id]?.freeText ?? '', text))
}
