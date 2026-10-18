// §6「楽曲の要件」の表と、「値」列の生成。
// 文面の正は request-text.md（B-06 系・表の生成規則）、条件は request-blocks.md §3・§3-5・§4・§5・§12（描画規則）
import { fieldItemIds, type Spec } from '../spec'
import type { FieldDef, StateId } from '../types/fields'
import type { AxisValue, SongRequest } from '../types/song'
import { GenerationError } from './errors'

export type RequestScope = 'combined' | 'style' | 'lyrics'

const SPECIFICITY_LABEL: Record<string, string> = {
  expand: '拡張可',
  adapt: '翻案可',
  keep: '保持',
}
const STATE_LABEL: Record<StateId, string> = {
  specified: '指定',
  delegated: 'お任せ',
  defaulted: '既定値',
  toolManaged: 'ツール任せ',
}
const LEAVE_SUFFIX = '（足さない。触れないまま残す）'
const LEAVE_TEXT = 'お任せ — 指定しないまま残す'

// vocalMode によって無効になる項目（song-file.md §2-3。request-blocks.md §3-3）
const INSTRUMENTAL_ONLY_FIELDS = new Set(['structure'])
const VOCAL_ONLY_FIELDS = new Set(['lyricsTheme', 'lyricsLanguage', 'lyricsStructure'])
// lyrics の範囲で出す軸（request-blocks.md §3-4。D・E・F は出さない）
const LYRICS_SCOPE_AXES = new Set(['A', 'B', 'C', 'G'])

export interface RequirementsContext {
  spec: Spec
  req: SongRequest
  scope: RequestScope
}

/** axes の値（省略は初期状態） */
export function axisOf(req: SongRequest, field: FieldDef): AxisValue {
  return req.axes[field.id] ?? { state: field.initialState }
}

/** 実効状態。follows-delegated の規則（input-items.md §4）では、元の項目が②なら①でも②として扱う */
export function effectiveState(ctx: RequirementsContext, field: FieldDef): StateId {
  const st = axisOf(ctx.req, field).state
  for (const r of ctx.spec.fieldsDef.crossFieldRules) {
    if (r.type !== 'follows-delegated' || r.field !== field.id || st !== 'specified') continue
    const source = ctx.spec.fieldById.get(r.source)
    if (source && effectiveState(ctx, source) === 'delegated') return 'delegated'
  }
  return st
}

function field(ctx: RequirementsContext, id: string): FieldDef {
  const f = ctx.spec.fieldById.get(id)
  if (!f) throw new GenerationError(`項目定義にない項目: ${id}`)
  return f
}

/** 語の表示名（語彙、または inline の options） */
function itemLabel(ctx: RequirementsContext, f: FieldDef, id: string): string {
  if (f.options) {
    const o = f.options.find((x) => x.id === id)
    if (o) return o.label
  } else if (f.vocabulary) {
    const item = ctx.spec.vocabularyById.get(f.vocabulary)?.items.find((x) => x.id === id)
    if (item) return item.label
  }
  throw new GenerationError(`語彙にない値: ${f.id} = ${id}`)
}

/** 値の表示名。「足させない」値には注記を付ける（request-blocks.md §5） */
function valueLabel(ctx: RequirementsContext, f: FieldDef, id: string): string {
  const label = itemLabel(ctx, f, id)
  return f.leaveValues?.includes(id) ? label + LEAVE_SUFFIX : label
}

/** 項目が依頼文の §6 に出るか */
export function isFieldShown(ctx: RequirementsContext, f: FieldDef): boolean {
  if (f.kind === 'length') return false // 長さは §5-2 のみ（request-text.md 判断ポイント5）
  if (ctx.req.vocalMode === 'vocal' && INSTRUMENTAL_ONLY_FIELDS.has(f.id)) return false
  if (ctx.req.vocalMode !== 'vocal' && VOCAL_ONLY_FIELDS.has(f.id)) return false
  if (ctx.scope === 'lyrics') {
    const axis = ctx.spec.fieldsDef.groups.find((g) => g.id === f.group)?.axis
    if (axis ? !LYRICS_SCOPE_AXES.has(axis) : f.id !== 'notes') return false
  }
  // active-when: 条件を満たさないとき、項目は依頼文に出さない（input-items.md §4）
  for (const r of ctx.spec.fieldsDef.crossFieldRules) {
    if (r.type !== 'active-when' || r.field !== f.id) continue
    const cond = axisOf(ctx.req, field(ctx, r.when.field))
    const active =
      cond.state === 'specified' && Object.values(cond.choices ?? {}).includes(r.when.choice)
    if (!active) return false
  }
  return true
}

/** 手がかりとして使えるか（request-blocks.md §4-1）。①指定・③既定値のとき真 */
function usable(ctx: RequirementsContext, f: FieldDef): boolean {
  const st = effectiveState(ctx, f)
  return st === 'specified' || st === 'defaulted'
}

/** ②お任せの「値」列（request-blocks.md §4-2） */
function delegatedText(ctx: RequirementsContext, f: FieldDef): string {
  const d = f.states.delegated
  if (!d) throw new GenerationError(`②お任せを持たない項目: ${f.id}`)
  if (d.rule === 'leave') return LEAVE_TEXT
  let cueName = ''
  if (d.cues.includes('*')) {
    // 用途（他のすべての項目）は、①指定の項目だけを数える（request-blocks.md §4-1 の補完）
    const any = [...ctx.spec.fieldById.values()].some(
      (x) => x.id !== f.id && effectiveState(ctx, x) === 'specified',
    )
    cueName = any ? '指定されている他の項目' : ''
  } else {
    cueName = d.cues
      .map((id) => field(ctx, id))
      .filter((x) => usable(ctx, x))
      .map((x) => x.label)
      .join('と')
  }
  const fb = d.fallback
  const fbValue = fb.type === 'value' ? valueLabel(ctx, f, fb.value) : ''
  if (cueName) {
    switch (fb.type) {
      case 'omit':
        return `お任せ — ${cueName}から導く。導けない場合は指定しない`
      case 'value':
        return `お任せ — ${cueName}から導く。導けない場合は「${fbValue}」`
      case 'choose':
        return `お任せ — ${cueName}から導く。導けない場合も、必ず決める`
      case 'text':
        return `お任せ — ${cueName}から導く。導けない場合は「${fb.text}」`
    }
  }
  switch (fb.type) {
    case 'omit':
      return LEAVE_TEXT
    case 'value':
      return `お任せ — 手がかりなし。「${fbValue}」とする`
    case 'choose':
      return 'お任せ — 手がかりなし。必ず決める'
    case 'text':
      return `お任せ — 手がかりなし。「${fb.text}」として扱う`
  }
}

/** 自由記述は §6 への出し方が未定義（設計スレッドで決める。U2 の決定 B） */
function rejectFreeText(f: FieldDef, a: AxisValue) {
  if (a.freeText !== undefined && a.freeText.trim() !== '') {
    throw new GenerationError(
      `未定義: 自由記述（freeText）の §6 への出し方が決まっていない: ${f.id}`,
    )
  }
}

type Row = { kind: 'value' | 'tri'; cells: string[] }

/** 通常項目の行（項目・状態・値・具体化） */
function valueRow(ctx: RequirementsContext, f: FieldDef): Row {
  const st = effectiveState(ctx, f)
  const a = axisOf(ctx.req, f)
  let value: string
  let specificity = '—'
  if (st === 'specified') {
    rejectFreeText(f, a)
    const v = a.value
    if (f.kind === 'select' && typeof v === 'string') {
      value = valueLabel(ctx, f, v)
      specificity = f.leaveValues?.includes(v) ? '—' : SPECIFICITY_LABEL[f.specificity]!
    } else if (f.kind === 'text' && typeof v === 'string') {
      value = v
      specificity = SPECIFICITY_LABEL[f.specificity]!
    } else if (f.kind === 'sectionList' && Array.isArray(v)) {
      value = v.map((id) => itemLabel(ctx, f, id)).join(' → ')
      specificity = SPECIFICITY_LABEL[f.specificity]!
    } else if (f.kind === 'bpm') {
      throw new GenerationError(`未定義: BPM の①指定の §6 への出し方が決まっていない: ${f.id}`)
    } else {
      throw new GenerationError(`①指定の値の形が不正: ${f.id}`)
    }
  } else if (st === 'delegated') {
    value = delegatedText(ctx, f)
    // インストのとき、声の扱いが②なら末尾に注記（request-text.md 表の生成規則）
    if (f.id === 'voiceTreatment' && ctx.req.vocalMode === 'instrumental')
      value += '（歌詞のない形に限る）'
  } else if (st === 'defaulted') {
    const dv = f.states.defaulted?.value
    if (!dv) throw new GenerationError(`③既定値を持たない項目: ${f.id}`)
    value = `${valueLabel(ctx, f, dv)}（既定値）`
  } else {
    value = 'ツール任せ'
  }
  return { kind: 'value', cells: [f.label, STATE_LABEL[st], value, specificity] }
}

/** 3値選択の語を、語彙の順に並べる（描画規則。request-blocks.md §12） */
function choiceLabels(
  ctx: RequirementsContext,
  f: FieldDef,
  choices: Record<string, string>,
  which: 'use' | 'exclude',
) {
  const order = [...fieldItemIds(ctx.spec, f)]
  for (const id of Object.keys(choices)) {
    if (!order.includes(id)) throw new GenerationError(`語彙にない値: ${f.id}.choices.${id}`)
  }
  return order.filter((id) => choices[id] === which).map((id) => itemLabel(ctx, f, id))
}

/** 3値選択項目の行（項目・状態・使用する・使用しない・具体化） */
function triRow(ctx: RequirementsContext, f: FieldDef): Row {
  const st = effectiveState(ctx, f)
  const a = axisOf(ctx.req, f)
  if (st === 'specified') {
    rejectFreeText(f, a)
    const ch = a.choices ?? {}
    const use = choiceLabels(ctx, f, ch, 'use')
    const exclude = choiceLabels(ctx, f, ch, 'exclude')
    return {
      kind: 'tri',
      cells: [
        f.label,
        STATE_LABEL[st],
        use.join(', ') || '—',
        exclude.join(', ') || '—',
        SPECIFICITY_LABEL[f.specificity]!,
      ],
    }
  }
  if (st === 'delegated')
    return { kind: 'tri', cells: [f.label, STATE_LABEL[st], delegatedText(ctx, f), '—', '—'] }
  throw new GenerationError(`3値選択項目が取れない状態: ${f.id} = ${st}`)
}

function rowOf(ctx: RequirementsContext, f: FieldDef): Row {
  return f.kind === 'triSelect' ? triRow(ctx, f) : valueRow(ctx, f)
}

const TABLE_HEADER: Record<Row['kind'], string> = {
  value: '| 項目 | 状態 | 値 | 具体化 |\n|---|---|---|---|',
  tri: '| 項目 | 状態 | 使用する | 使用しない | 具体化 |\n|---|---|---|---|---|',
}

/** 行を、種類ごとの表に分ける。表の順は、その種類の最初の行が出る順（描画規則。request-blocks.md §12） */
function tables(rows: Row[]): string[] {
  const kinds: Row['kind'][] = []
  for (const r of rows) if (!kinds.includes(r.kind)) kinds.push(r.kind)
  return kinds.map((k) =>
    [
      TABLE_HEADER[k],
      ...rows.filter((r) => r.kind === k).map((r) => `| ${r.cells.join(' | ')} |`),
    ].join('\n'),
  )
}

/** 除外の合算行の値（request-blocks.md §3-5）。除外対象がなければ null */
export function exclusionSummary(ctx: RequirementsContext): string | null {
  const labels: string[] = []
  for (const f of visibleFields(ctx)) {
    if (f.kind !== 'triSelect' || effectiveState(ctx, f) !== 'specified') continue
    for (const l of choiceLabels(ctx, f, axisOf(ctx.req, f).choices ?? {}, 'exclude')) {
      if (!labels.includes(l)) labels.push(l)
    }
  }
  const ex = ctx.spec.fieldById.get('exclusions')
  const exA = ex ? axisOf(ctx.req, ex) : undefined
  const exText =
    ex &&
    effectiveState(ctx, ex) === 'specified' &&
    typeof exA?.value === 'string' &&
    exA.value.trim()
      ? exA.value
      : null
  const parts = labels.filter((l) => l !== exText)
  if (exText) parts.push(exText)
  return parts.length ? parts.join(', ') : null
}

/** 除外対象が1件以上あるか（request-blocks.md §3-1） */
export function hasExclusionTargets(ctx: RequirementsContext): boolean {
  return exclusionSummary(ctx) !== null
}

/** §6 に出る項目を、表に出る順（グループの順 → 項目定義の順）に */
function visibleFields(ctx: RequirementsContext): FieldDef[] {
  const groups = [...ctx.spec.fieldsDef.groups].sort((a, b) => a.order - b.order)
  return groups.flatMap((g) =>
    [...ctx.spec.fieldById.values()].filter((f) => f.group === g.id && isFieldShown(ctx, f)),
  )
}

export interface RequirementsOptions {
  /** 除外の合算行と B-06x を出すか（除外対象が1件以上 かつ 除外欄がある かつ lyrics でない） */
  withExclusion: boolean
}

/** §6 の本文（見出しの下）の段落の並び。見出し「## N. 楽曲の要件」は呼び出し側が付ける */
export function requirementsBody(ctx: RequirementsContext, opts: RequirementsOptions): string[] {
  const out: string[] = ['状態の意味は §2 を参照してください。「具体化」の列は §2-2 の分類です。']
  const groups = [...ctx.spec.fieldsDef.groups].sort((a, b) => a.order - b.order)
  const fieldsOf = (groupIds: string[]) =>
    [...ctx.spec.fieldById.values()].filter(
      (f) => groupIds.includes(f.group) && isFieldShown(ctx, f),
    )

  for (const g of groups.filter((x) => x.axis)) {
    const fs = fieldsOf([g.id])
    if (fs.length === 0) continue
    out.push(`### ${g.axis}. ${g.label}`)
    if (g.axis === 'G' && ctx.scope === 'style') {
      out.push(
        'G. 歌詞（参照用）: この依頼では歌詞を作成しません。スタイル欄の記述が、歌詞の言語や構成と矛盾しないように参照してください。',
      )
    }
    out.push(...tables(fs.map((f) => rowOf(ctx, f))))
  }

  // 除外・補足（軸を持たないグループをまとめた表）
  const rest = fieldsOf(groups.filter((x) => !x.axis).map((x) => x.id))
  if (rest.length) {
    const rows: Row[] = []
    for (const f of rest) {
      rows.push(rowOf(ctx, f))
      if (f.id === 'exclusions' && opts.withExclusion) {
        const summary = exclusionSummary(ctx)
        if (summary)
          rows.push({
            kind: 'value',
            cells: ['スタイルを除外欄に入れる要素', '指定', summary, '保持'],
          })
      }
    }
    out.push('### 除外・補足', ...tables(rows))
  }

  if (opts.withExclusion) {
    out.push(
      '「使用しない」の列に挙げた要素と、「除外したい要素」に書いた内容は、上の「除外・補足」の表の「スタイルを除外欄に入れる要素」の行にまとめてあります。この行の要素を、「スタイルを除外」欄に出力してください。スタイル欄の中に否定形（no ○○ など）で書かないでください。',
      '「スタイルを除外」欄の書き方は次のとおりです。',
      [
        '- 除外したい要素をそのまま並べてください。No や without を付けないでください。この欄自体が除外を表すため、付けると二重否定になります。',
        '- この行に挙がっているものは、すべて漏れなく書いてください。減らさないでください。',
        '- この行に挙がっていない要素を足さないでください。関連する語への展開や具体化もしないでください（例:「ケルト」を「ケルト, ティンホイッスル, バウロン」に広げない）。§2-2 の「具体化」は「使用する」側にのみ適用されます。',
      ].join('\n'),
    )
  }
  return out
}

/** 項目の「値」列（B-LY の条件判定に使う） */
export function valueText(ctx: RequirementsContext, id: string): string {
  return valueRow(ctx, field(ctx, id)).cells[2]!
}
