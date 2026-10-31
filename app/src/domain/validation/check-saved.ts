// 保存データ（楽曲データ・エクスポートファイル・プロファイルのストア）の検証。
// 参照実装 design/v0/tools/check-fields/check_fields.py の保存データ側（F0〜F13、S0〜S6、R、O1〜O4）の移植。
// 指摘の文言は参照実装と同じ（U1 の決定 4）。照合は __tests__/check-saved.spec.ts（正解データは export_parity_cases.py が書き出す）。
// 仕様: song-file.md §6・§9、input-items.md §4〜§6、tool-profile.md §9
import { fieldItemIds, profileParam, type Spec } from '../spec'
import { canMigrateContainer, migrateContainer, STORE_SCHEMA_VERSION } from '../storage/migrate'
import type { OutputDef, StateId } from '../types/fields'
import type { ToolProfile } from '../types/tool-profile'
import { pyRepr } from './py-repr'
import type { SchemaValidators } from './schema'

/** 楽曲データの版のうち、このアプリが読める版（song-file.md §6-2）。ストア／エクスポートファイルの版は別（STORE_SCHEMA_VERSION） */
export const SUPPORTED_SCHEMA_VERSION = 1

// vocalMode によって有効・無効が切り替わる項目（L-01。宿題38）
export const INSTRUMENTAL_ONLY_FIELDS = ['structure']
export const VOCAL_ONLY_FIELDS = ['lyricsTheme', 'lyricsLanguage', 'lyricsStructure']
// vocalMode = vocal のとき取れる lyricsAuthor の値（L-01a）
const VOCAL_LYRICS_AUTHORS = ['chat-ai', 'chat-ai-instruction']
// output.requestScope のうち、vocalMode = vocal のときだけ取れる値（判断ポイント28）
const VOCAL_ONLY_REQUEST_SCOPES = ['style', 'lyrics']

export type FindingSeverity = 'error' | 'warning' | 'info'

/** 検証の結果。文言は、どのプロファイル・依頼の指摘かを示す接頭辞（scope）を含む */
export interface CheckResult {
  errors: string[]
  warnings: string[]
  notes: string[]
}

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)
const isStr = (x: unknown): x is string => typeof x === 'string'
const isNum = (x: unknown): x is number => typeof x === 'number'
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x)
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)
const isBlank = (x: unknown) => !(isStr(x) && x.trim() !== '')
const sorted = (xs: Iterable<string>) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

/**
 * S5「①指定なのに値が空」の判定（select・triSelect・text。input-items.md §5）。a は ①指定の項目の値。
 * 自動保存の「未完成」（判断ポイント43）と、生成器が未完成のデータを拒むときにも使う
 */
export function isSpecifiedEmpty(kind: string, a: Obj): boolean {
  const freeOk = isStr(a.freeText) && a.freeText.trim() !== ''
  if (kind === 'select') return (a.value === undefined || a.value === null) && !freeOk
  if (kind === 'triSelect')
    return (isObj(a.choices) ? Object.keys(a.choices).length === 0 : true) && !freeOk
  if (kind === 'text') return !(isStr(a.value) && a.value.trim() !== '')
  return false
}

class Report implements CheckResult {
  errors: string[] = []
  warnings: string[] = []
  notes: string[] = []
  /** どのプロファイル・依頼の指摘かを示す接頭辞 */
  scope = ''
  error(m: string) {
    this.errors.push(this.scope + m)
  }
  warn(m: string) {
    this.warnings.push(this.scope + m)
  }
  note(m: string) {
    this.notes.push(this.scope + m)
  }
  emit(severity: FindingSeverity, m: string) {
    if (severity === 'error') this.error(m)
    else if (severity === 'warning') this.warn(m)
    else this.note(m)
  }
}

/** 検証を続けられない構造（参照実装では、例外を F0 として報告する） */
class StructureError extends Error {}

// ---------------------------------------------------------------------------
// 依頼1件の axes・output（S・R・O）
// ---------------------------------------------------------------------------
function checkPerItemBoolean(
  key: string,
  o: OutputDef,
  v: unknown,
  req: Obj,
  profile: ToolProfile | undefined,
  report: Report,
) {
  if (!isObj(v)) {
    report.error(`O2 項目ごとの真偽（{項目 id: 真偽}）でない: output.${key}`)
    return
  }
  for (const [item, b] of Object.entries(v)) {
    if (typeof b !== 'boolean') report.error(`O2 真偽値でない: output.${key}.${item}`)
  }
  if (!profile) return // 未知の toolId は F7 が指摘する
  const role = o.itemsFrom?.requestRole
  const params = new Map(profile.params.filter((x) => x.requestRole === role).map((x) => [x.id, x]))
  const mode = profile.modes.find((m) => m.generationType === req.generationType)?.id
  for (const item of Object.keys(v)) {
    const prm = params.get(item)
    if (!prm) {
      report.error(
        `O3 プロファイルにない項目: output.${key}.${item}（取れる項目: ${[...params.keys()].join(', ') || 'なし'}）`,
      )
    } else if (mode !== undefined && !prm.modes.includes(mode)) {
      report.warn(`O4 output.${key}.${item} は、この依頼のモード（${mode}）にないため無視される`)
    }
  }
}

function checkRequest(req: Obj, spec: Spec, report: Report, profile: ToolProfile | undefined) {
  const axes = req.axes
  if (!isObj(axes)) {
    report.error('S0 axes がない')
    return
  }
  for (const fid of Object.keys(axes)) {
    if (!spec.fieldById.has(fid)) report.error(`S1 未知の項目: ${fid}`)
  }

  // S6 vocalMode で無効になる項目に①指定がある
  const vocalMode = req.vocalMode
  const disabled =
    vocalMode === 'vocal'
      ? INSTRUMENTAL_ONLY_FIELDS
      : vocalMode === 'instrumental'
        ? VOCAL_ONLY_FIELDS
        : []
  for (const fid of sorted(disabled)) {
    const a = axes[fid]
    if (isObj(a) && a.state === 'specified')
      report.error(`S6 vocalMode ${vocalMode} では無効な項目に①指定がある: ${fid}`)
  }

  const stateOf = new Map<string, StateId>()
  for (const [fid, f] of spec.fieldById) {
    const a = axes[fid]
    if (a === undefined || a === null) {
      stateOf.set(fid, f.initialState) // 省略時は初期状態
      continue
    }
    if (!isObj(a)) throw new StructureError(`axes.${fid} がオブジェクトでない`)
    for (const k of Object.keys(a)) {
      if (!['state', 'value', 'choices', 'freeText'].includes(k))
        report.error(`S1 未知のキー: ${fid}.${k}`)
    }
    const st = a.state
    if (!isStr(st) || !has(f.states, st)) {
      report.error(
        `S2 取れない状態: ${fid}.state = ${pyRepr(st)}（取れる状態: ${Object.keys(f.states).join(', ')}）`,
      )
      continue
    }
    stateOf.set(fid, st as StateId)
    const vocabItems = fieldItemIds(spec, f)
    if (st !== 'specified') {
      if (['value', 'choices', 'freeText'].some((k) => has(a, k)))
        report.warn(`S3 ①指定でないのに値が残っている（無視される）: ${fid}`)
      continue
    }
    const free = a.freeText
    if (free !== undefined && free !== null && (!isStr(free) || !f.freeText)) {
      report.error(`S4 freeText を持てない、または文字列でない: ${fid}`)
    }
    const v = a.value
    if (f.kind === 'select') {
      if (v !== undefined && v !== null && !(isStr(v) && vocabItems.has(v)))
        report.error(`S4 語彙にない値: ${fid}.value = ${pyRepr(v)}`)
      if (isSpecifiedEmpty(f.kind, a)) report.error(`S5 ①指定なのに値が空: ${fid}`)
    } else if (f.kind === 'triSelect') {
      let ch: unknown = has(a, 'choices') ? a.choices : {}
      if (!isObj(ch)) {
        report.error(`S4 choices がオブジェクトでない: ${fid}`)
        ch = {}
      }
      const entries = Object.entries(ch as Obj)
      for (const [k, val] of entries) {
        if (!vocabItems.has(k)) report.error(`S4 語彙にない選択肢: ${fid}.choices.${k}`)
        if (val !== 'use' && val !== 'exclude') {
          report.error(
            `S4 3値は use / exclude のいずれか（未指定はキーを持たない）: ${fid}.choices.${k} = ${pyRepr(val)}`,
          )
        }
      }
      if (isSpecifiedEmpty(f.kind, a)) report.error(`S5 ①指定なのに値が空: ${fid}`)
    } else if (f.kind === 'text') {
      if (isSpecifiedEmpty(f.kind, a)) report.error(`S5 ①指定なのに値が空: ${fid}`)
    } else if (f.kind === 'bpm') {
      const ok =
        (isNum(v) && v > 0) ||
        (isObj(v) &&
          Object.keys(v).length === 2 &&
          has(v, 'min') &&
          has(v, 'max') &&
          isNum(v.min) &&
          isNum(v.max) &&
          0 < v.min &&
          v.min <= v.max)
      if (!ok) report.error(`S4 BPM は正の数、または {min, max}（min ≤ max）: ${fid}`)
    } else if (f.kind === 'length') {
      // 範囲は、ツールプロファイルのパラメータが持つ（tool-profile.md §9）
      const rng = f.rangeFrom ? profileParam(profile, f.rangeFrom.param)?.range : undefined
      const [lo, hi] = rng ? [rng.min, rng.max] : [1, undefined]
      if (!(isInt(v) && v >= lo && (hi === undefined || v <= hi))) {
        report.error(`S4 長さは${rng ? `${lo}〜${hi}の整数` : '正の整数'}（秒）: ${fid}`)
      }
    } else if (f.kind === 'sectionList') {
      if (!(Array.isArray(v) && v.length > 0 && v.every((x) => isStr(x) && vocabItems.has(x)))) {
        report.error(`S4 構成はセクション id の空でない並び: ${fid}`)
      }
    }
  }

  // 項目をまたぐ規則（R。input-items.md §4）
  const choices = (fid: string): Obj => {
    const a = axes[fid]
    return isObj(a) && a.state === 'specified' && isObj(a.choices) ? a.choices : {}
  }
  for (const r of spec.fieldsDef.crossFieldRules) {
    const emit = (m: string) => report.emit(r.severity, m)
    if (r.type === 'follows-delegated') {
      if (stateOf.get(r.field) === 'specified' && stateOf.get(r.source) === 'delegated') {
        emit(`R ${r.id}: ${r.field} は①指定だが、${r.source} が②お任せのため②として扱われる`)
      }
    } else if (r.type === 'active-when') {
      const cond = r.when
      const active = Object.values(choices(cond.field)).some((v) => v === cond.choice)
      if (stateOf.get(r.field) === 'specified' && !active) {
        emit(
          `R ${r.id}: ${r.field} は指定されているが、条件（${cond.field} が「${cond.choice}」を含む）を満たさないため依頼文に出ない`,
        )
      }
    } else if (r.type === 'linked-exclusion') {
      const excluded = new Set<string>()
      for (const fid of r.fields) {
        for (const [i, v] of Object.entries(choices(fid))) if (v === 'exclude') excluded.add(i)
      }
      for (const i of sorted(excluded)) {
        for (const fid of r.fields) {
          const cur = choices(fid)[i]
          if (cur === 'use') {
            emit(
              `R ${r.id}: ${i} が ${fid} で「使用する」、他の項目で「使用しない」（除外を優先して解決する）`,
            )
          } else if (
            cur === undefined &&
            axes[fid] !== undefined &&
            axes[fid] !== null &&
            stateOf.get(fid) === 'specified'
          ) {
            emit(
              `R ${r.id}: ${i} は他の項目で除外されているが、${fid} に反映されていない（連動で補う）`,
            )
          }
        }
      }
    } else if (r.type === 'single-not-excluded') {
      const main = axes[r.field]
      const v = isObj(main) && main.state === 'specified' ? main.value : undefined
      if (isStr(v) && choices(r.against)[v] === 'exclude') {
        emit(`R ${r.id}: 主ジャンル ${v} が ${r.against} で「使用しない」になっている`)
      }
    }
  }

  // 出力項目（O1〜O4）
  const out = req.output
  if (isObj(out)) {
    for (const [k, v] of Object.entries(out)) {
      const o = spec.outputById.get(k)
      if (!o) {
        report.error(`O1 未知の出力項目: ${k}`)
        continue
      }
      let ids = new Set((o.options ?? []).map((x) => x.id))
      let checkable = true
      if (o.optionsFrom) {
        // 選択肢は、ツールプロファイルのパラメータが持つ。未知の toolId は F7 が指摘する
        const prm = profileParam(profile, o.optionsFrom.param)
        ids = new Set((prm?.values ?? []).map((x) => x.id))
        checkable = prm !== undefined
      }
      if (checkable && o.kind === 'select' && v !== null && !(isStr(v) && ids.has(v))) {
        report.error(`O2 選択肢にない値: output.${k} = ${pyRepr(v)}`)
      }
      if (
        checkable &&
        o.kind === 'multiSelect' &&
        !(Array.isArray(v) && v.every((x) => isStr(x) && ids.has(x)))
      ) {
        report.error(`O2 選択肢にない値: output.${k} = ${pyRepr(v)}`)
      }
      if (o.kind === 'boolean' && typeof v !== 'boolean')
        report.error(`O2 真偽値でない: output.${k}`)
      if (o.kind === 'perItemBoolean') checkPerItemBoolean(k, o, v, req, profile, report)
      if (o.kind === 'number' && !isNum(v)) report.error(`O2 数値でない: output.${k}`)
    }
  }
}

// ---------------------------------------------------------------------------
// 依頼1件の、要素をまたぐ規則とツールの規則（F3・F4・F6・F7・F9〜F13）
// ---------------------------------------------------------------------------
/** 依頼 r の derivedFrom が指す、同じ楽曲データ内の依頼 id。外部の曲は、指す依頼を持たない */
function derivedRef(r: unknown): unknown {
  const df = isObj(r) ? r.derivedFrom : undefined
  if (!isObj(df) || df.source === 'external') return undefined
  return df.requestId
}

function followsCycle(rid: string, byId: Map<string, Obj>): boolean {
  const seen = new Set([rid])
  let cur = derivedRef(byId.get(rid))
  while (isStr(cur) && byId.has(cur)) {
    if (seen.has(cur)) return true
    seen.add(cur)
    cur = derivedRef(byId.get(cur))
  }
  return false
}

function checkOperation(op: unknown, profile: ToolProfile, report: Report) {
  if (!isStr(op)) return // null は許される。文字列でない値は F1（スキーマ）が指摘する
  const ops = new Map(
    profile.modes.flatMap((m) => (m.operations ?? []).map((o) => [o.id, o] as const)),
  )
  const o = ops.get(op)
  if (!o) {
    const allowed = sorted(
      [...ops].filter(([, x]) => x.scope === 'candidate' || x.scope === 'first').map(([k]) => k),
    )
    report.error(
      `F9 未知の操作種別: ${pyRepr(op)}（ツールプロファイル ${profile.toolId} の operations にない。取れる値: ${allowed.join(', ')}）`,
    )
  } else if (o.scope !== 'candidate' && o.scope !== 'first') {
    report.error(`F9 依頼文の対象外の操作: ${pyRepr(op)}（scope: ${o.scope}）`)
  }
}

function checkDerivedSource(r: Obj, df: Obj, byId: Map<string, Obj>, report: Report) {
  const src = df.source
  const rid = r.id
  if (src === 'external') {
    if (has(df, 'requestId')) {
      report.error(
        `F10 source が external なのに requestId がある（外部の曲は、同じ楽曲データ内の依頼を指さない）: ${pyRepr(df.requestId)}`,
      )
    }
    return
  }
  if (src === 'internal' && has(df, 'externalSourceLabel')) {
    report.error(
      'F10 source が internal なのに externalSourceLabel がある（元曲は requestId が指す依頼）',
    )
  }
  const ref = derivedRef(r)
  if (ref === rid) report.error(`F3 derivedFrom が自分自身を指している: ${pyRepr(ref)}`)
  else if (!isStr(ref) || !byId.has(ref))
    report.error(`F3 derivedFrom の参照先の依頼がない: ${pyRepr(ref)}`)
  else if (isStr(rid) && followsCycle(rid, byId))
    report.error(`F3 derivedFrom を辿ると循環している（起点 ${pyRepr(rid)}）`)
}

function checkSourceStyle(df: Obj, report: Report) {
  const items = new Map<string, Obj>()
  for (const key of ['sourceStyleEditMethod', 'sourceStyleCloseness']) {
    const a = df[key]
    if (!isObj(a)) continue
    items.set(key, a)
    if (a.state === 'specified' && (a.value === undefined || a.value === null)) {
      report.error(`F11 ①指定なのに値が空: derivedFrom.${key}`)
    } else if (a.state === 'delegated' && has(a, 'value')) {
      report.warn(`F11 ②お任せなのに値が残っている（無視される）: derivedFrom.${key}`)
    }
  }
  const em = items.get('sourceStyleEditMethod')
  const cl = items.get('sourceStyleCloseness')
  if (cl && cl.state === 'specified' && em && em.state === 'specified' && em.value === 'keep') {
    report.error(
      'F11 sourceStyleCloseness が①指定だが、sourceStyleEditMethod が keep（近さは change のときだけ有効）',
    )
  }
  if (isBlank(df.sourceStyleText)) {
    for (const [key, a] of items) {
      if (a.state === 'specified')
        report.warn(`F11 sourceStyleText が空のため、derivedFrom.${key} は無効（依頼文に出ない）`)
    }
  }
}

function checkRequestRules(
  r: Obj,
  byId: Map<string, Obj>,
  spec: Spec,
  report: Report,
): ToolProfile | undefined {
  const gt = r.generationType
  const df = r.derivedFrom
  if (gt === 'new' && df !== null && df !== undefined)
    report.error('F4 generationType が new なのに、derivedFrom が null でない')
  if (gt === 'derived' && (df === null || df === undefined))
    report.error('F4 generationType が derived なのに、derivedFrom が null')
  if (isObj(df)) {
    checkDerivedSource(r, df, byId, report)
    checkSourceStyle(df, report)
  }
  // F6 初版の制約（依頼の件数は checkSongData で確かめる）
  if (gt !== 'new')
    report.error(`F6 初版が扱えるのは generationType = new のみ（初版の対象外: ${pyRepr(gt)}）`)
  if (df !== null && df !== undefined) {
    report.error(
      'F6 初版では derivedFrom は null のみ（初版の対象外。歌あり対応後も、派生生成は引き続き対象外）',
    )
  }

  // F12 vocalMode と lyricsAuthor の整合
  const vm = r.vocalMode
  const la = r.lyricsAuthor
  if (vm === 'vocal' && !(isStr(la) && VOCAL_LYRICS_AUTHORS.includes(la))) {
    report.error(
      `F12 vocalMode が vocal のとき、lyricsAuthor は ${VOCAL_LYRICS_AUTHORS.join('／')} のいずれかが必須: ${pyRepr(la)}`,
    )
  }
  if (vm === 'instrumental' && la !== null && la !== undefined) {
    report.error(`F12 vocalMode が instrumental のとき、lyricsAuthor は null: ${pyRepr(la)}`)
  }

  // F13 output.requestScope と vocalMode の整合。値そのものの正否は O2 が見る
  const out = r.output
  const scopeValue = isObj(out) ? out.requestScope : undefined
  if (isStr(scopeValue) && VOCAL_ONLY_REQUEST_SCOPES.includes(scopeValue) && vm !== 'vocal') {
    report.error(
      `F13 output.requestScope が ${scopeValue} のとき、vocalMode は vocal が必須（インストは combined のみ）: vocalMode ${pyRepr(vm)}`,
    )
  }

  // F7 toolId・toolVersion（song-file.md §7）
  const tool = r.toolId
  const profile = isStr(tool) ? spec.toolProfileById.get(tool) : undefined
  if (!profile) {
    report.error(
      `F7 未知の toolId: ${pyRepr(tool)}（既知: ${sorted(spec.toolProfileById.keys()).join(', ') || 'なし'}）`,
    )
    return undefined
  }
  const target = profile.version.id
  if (r.toolVersion !== target) {
    report.warn(
      `F7 toolVersion が対象ツールの版と違う: ファイル ${pyRepr(r.toolVersion)}、対象 ${pyRepr(target)}（警告。読み込みは止めず、値は書き換えない）`,
    )
  }
  if (isObj(df)) checkOperation(df.operation, profile, report)
  return profile
}

// ---------------------------------------------------------------------------
// 楽曲データ・ストア・エクスポートファイル
// ---------------------------------------------------------------------------
/**
 * F8 schemaVersion（song-file.md §6-2 の 1〜3）。読めない版なら false（以降の検証を省く）。
 * canMigrate があれば、古い版でも、今の版までの移行がそろっていれば読める
 */
function checkVersion(
  obj: Obj,
  report: Report,
  supported = SUPPORTED_SCHEMA_VERSION,
  canMigrate: (v: number) => boolean = () => false,
): boolean {
  const v = obj.schemaVersion
  if (!isInt(v)) {
    report.error(`F8 schemaVersion がない、または整数でない: ${pyRepr(v)}`)
    return false
  }
  if (v > supported) {
    report.error(`F8 新しい版（${v}。このツールが読めるのは ${supported} まで）のため、拒否する`)
    return false
  }
  if (v < supported && !canMigrate(v)) {
    report.error(`F8 古い版（${v}）で、移行が未定義のため、拒否する`)
    return false
  }
  return true
}

/** key(要素) が undefined でない要素を key ごとにまとめ、2件以上あるもの（最初に現れた順）。key は文字列にして比べる */
function duplicates<K>(items: unknown[], key: (x: unknown) => K | undefined): [K, number[]][] {
  const groups = new Map<string, [K, number[]]>()
  items.forEach((x, i) => {
    const k = key(x)
    if (k === undefined) return
    const s = JSON.stringify(k)
    const g = groups.get(s)
    if (g) g[1].push(i)
    else groups.set(s, [k, [i]])
  })
  return [...groups.values()].filter(([, idx]) => idx.length > 1)
}
const positions = (idx: number[]) => idx.map((i) => `#${i}`).join(', ')

/**
 * フォルダとプロファイルの id・所属・名前（F14〜F17・F5。song-file.md §4-1・§4-6・§9-2。判断ポイント68）。
 * 型の違反は F1 が指摘するので、ここでは期待する型の値だけを見る
 */
function checkFolders(folders: unknown[], profiles: unknown[], report: Report) {
  const strOf = (x: unknown, k: string) => (isObj(x) && isStr(x[k]) ? x[k] : undefined)
  // フォルダの参照（文字列か null）。キーがない・型が違うときは undefined（一意の判定の対象外）
  const refOf = (x: unknown, k: string): string | null | undefined => {
    if (!isObj(x) || !has(x, k)) return undefined
    const v = x[k]
    return v === null || isStr(v) ? v : undefined
  }
  for (const [k, idx] of duplicates(folders, (f) => strOf(f, 'id')))
    report.error(`F14 フォルダの id が重複: ${pyRepr(k)}（要素 ${positions(idx)}）`)
  for (const [k, idx] of duplicates(profiles, (p) => strOf(p, 'id')))
    report.error(`F14 プロファイルの id が重複: ${pyRepr(k)}（要素 ${positions(idx)}）`)
  const ids = new Set(folders.map((f) => strOf(f, 'id')).filter(isStr))
  folders.forEach((f, i) => {
    const pid = strOf(f, 'parentId')
    if (pid !== undefined && !ids.has(pid))
      report.error(
        `F15 フォルダの parentId が、実在するフォルダを指さない: ${pyRepr(pid)}（要素 #${i}）`,
      )
  })
  profiles.forEach((p, i) => {
    const fid = strOf(p, 'folderId')
    if (fid !== undefined && !ids.has(fid))
      report.error(
        `F15 プロファイルの folderId が、実在するフォルダを指さない: ${pyRepr(fid)}（要素 #${i}）`,
      )
  })
  const parent = new Map<string, string | undefined>()
  for (const f of folders) {
    const fid = strOf(f, 'id')
    if (fid !== undefined && !parent.has(fid)) parent.set(fid, strOf(f, 'parentId'))
  }
  folders.forEach((f, i) => {
    const start = strOf(f, 'id')
    if (start === undefined) return
    const seen = new Set<string>()
    let cur = parent.get(start)
    while (cur !== undefined && parent.has(cur) && !seen.has(cur)) {
      if (cur === start) {
        report.error(`F16 フォルダの親子が循環している（要素 #${i}）`)
        break
      }
      seen.add(cur)
      cur = parent.get(cur)
    }
  })
  folders.forEach((f, i) => {
    const name = isObj(f) ? f.name : undefined
    if (isStr(name) && name.trim() === '')
      report.error(`F17 フォルダの name が、前後の空白を除いて空（要素 #${i}）`)
  })
  const nameIn = (x: unknown, k: string): [string | null, string] | undefined => {
    const name = strOf(x, 'name')
    const ref = refOf(x, k)
    return name === undefined || ref === undefined ? undefined : [ref, name]
  }
  for (const [k, idx] of duplicates(folders, (f) => nameIn(f, 'parentId')))
    report.error(
      `F17 フォルダの name が、同じ親の中で重複: ${pyRepr(k[1])}（要素 ${positions(idx)}）`,
    )
  for (const [k, idx] of duplicates(profiles, (p) => nameIn(p, 'folderId')))
    report.error(
      `F5 プロファイルの name が、同じフォルダの中で重複: ${pyRepr(k[1])}（要素 ${positions(idx)}）`,
    )
}

/** F1 スキーマ適合。skipData のときは、プロファイルの data の中の違反を数えない（data ごとに別に検証するため） */
function checkBySchema(
  validate: SchemaValidators[keyof SchemaValidators],
  obj: unknown,
  report: Report,
  skipData = false,
) {
  if (validate(obj)) return
  for (const err of validate.errors ?? []) {
    const path = err.instancePath.split('/').slice(1)
    if (skipData && path.length >= 3 && path[0] === 'profiles' && path[2] === 'data') continue
    report.error(`F1 スキーマ違反: ${path.join('/')}: ${(err.message ?? '').slice(0, 200)}`)
  }
}

function checkSongData(song: unknown, spec: Spec, validators: SchemaValidators, report: Report) {
  const base = report.scope
  try {
    if (!isObj(song)) {
      report.error('F0 オブジェクトでない')
      return
    }
    if (!has(song, 'requests') && has(song, 'axes')) {
      report.error('F0 旧形式（axes が最上位）。requests[] 形（song-file.md §2）に直す')
      return
    }
    if (!checkVersion(song, report)) return
    checkBySchema(validators.song, song, report)
    const reqs = song.requests
    if (!Array.isArray(reqs)) return
    if (reqs.length !== 1) report.error(`F6 依頼はちょうど1件（初版の対象外: ${reqs.length} 件）`)
    const ids = new Map<string, number[]>()
    reqs.forEach((r, i) => {
      if (isObj(r) && isStr(r.id)) ids.set(r.id, [...(ids.get(r.id) ?? []), i])
    })
    for (const [rid, idx] of ids) {
      if (idx.length > 1)
        report.error(
          `F2 依頼の id が重複: ${pyRepr(rid)}（要素 ${idx.map((i) => `#${i}`).join(', ')}）`,
        )
    }
    const byId = new Map([...ids].map(([rid, idx]) => [rid, reqs[idx[0]!] as Obj]))
    reqs.forEach((r: unknown, i) => {
      const rid = isObj(r) ? r.id : undefined
      report.scope = base + `依頼 ${isStr(rid) ? rid : `#${i}`}: `
      if (!isObj(r)) {
        report.error('F0 依頼がオブジェクトでない')
        return
      }
      try {
        const profile = checkRequestRules(r, byId, spec, report)
        checkRequest(r, spec, report, profile)
      } catch (e) {
        if (!(e instanceof StructureError)) throw e
        report.error(`F0 構造が不正で、検証を続けられない: ${e.message}`)
      }
    })
  } finally {
    report.scope = base
  }
}

function checkProfilesContainer(
  obj: Obj,
  kind: 'file' | 'store',
  spec: Spec,
  validators: SchemaValidators,
  report: Report,
) {
  const label = kind === 'file' ? 'エクスポートファイル' : 'プロファイルのストア'
  report.scope = `[${label}] `
  if (!checkVersion(obj, report, STORE_SCHEMA_VERSION, canMigrateContainer)) return
  if (kind === 'file' && obj.exportType !== 'profiles')
    report.error(`F0 exportType は profiles のみ: ${pyRepr(obj.exportType)}`)
  const version = obj.schemaVersion as number
  if (version < STORE_SCHEMA_VERSION) {
    // 古い版は、その版の形として検証してから移行する（§6-2 の 2）
    checkBySchema(validators[kind === 'file' ? 'fileV1' : 'storeV1'], obj, report, true)
    report.note(`移行: 版${version} のため、版${STORE_SCHEMA_VERSION} に移行して検証する`)
    obj = migrateContainer(obj)
  } else {
    checkBySchema(validators[kind], obj, report, true)
  }
  const profiles = obj.profiles
  if (!Array.isArray(profiles)) {
    report.error('F0 profiles がない、または配列でない')
    return
  }
  report.note(`形: ${label}（プロファイル ${profiles.length} 件）`)
  checkFolders(Array.isArray(obj.folders) ? obj.folders : [], profiles, report)
  profiles.forEach((p: unknown, i) => {
    const name = isObj(p) ? p.name : undefined
    report.scope = `[プロファイル「${isStr(name) ? name : `#${i}`}」] `
    if (!isObj(p) || !has(p, 'data')) {
      report.error('F0 プロファイルがオブジェクトでない、または data がない')
      return
    }
    checkSongData(p.data, spec, validators, report)
  })
}

/** 保存データの形（エクスポートファイル／プロファイルのストア／楽曲データ） */
export type SavedKind = 'file' | 'store' | 'song'

/** 形の自動判別（song-file.md §9-2）。判別できなければ undefined。旧形式（axes が最上位）は楽曲データとして扱い、F0 で拒否する */
export function detectSavedKind(obj: Obj): SavedKind | undefined {
  if (has(obj, 'exportType')) return 'file'
  if (has(obj, 'profiles')) return 'store'
  if (has(obj, 'requests') || has(obj, 'axes')) return 'song'
  return undefined
}

/**
 * 保存データ（楽曲データ／エクスポートファイル／プロファイルのストア）の文字列を、形を自動判別して検証する。
 * エラーが1件でもあれば、その保存データは読み込まない（song-file.md §6-2。ファイルは全体を拒否する）
 */
export function checkSavedText(
  text: string,
  spec: Spec,
  validators: SchemaValidators,
): CheckResult {
  const report = new Report()
  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch (e) {
    report.error(`F0 JSON として読めない: ${(e as Error).message}`)
    return report
  }
  if (!isObj(obj)) {
    report.error('F0 最上位がオブジェクトでない')
    return report
  }
  const kind = detectSavedKind(obj)
  if (kind === undefined) {
    report.error('F0 形を判別できない（exportType・profiles・requests のいずれもない）')
    return report
  }
  try {
    if (kind === 'song') {
      report.note('形: 楽曲データ')
      report.scope = '[楽曲データ] '
      checkSongData(obj, spec, validators, report)
    } else {
      checkProfilesContainer(obj, kind, spec, validators, report)
    }
  } finally {
    report.scope = ''
  }
  return { errors: report.errors, warnings: report.warnings, notes: report.notes }
}
