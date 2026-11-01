// 構成のひな型（song-file.md §13。UI 判断ポイント75）。曲の構成に名前を付けて保存する、プロファイルとは別の小さな仕組み。
// 検査はここだけ（ファイルで扱わないので、check_fields.py とスキーマの対象にしない）
import { cloneJson } from '../clone'
import { defaultSung, STRUCTURE_FIELD_ID, type Spec } from '../spec'
import type { SectionElement, VocalMode } from '../types/song'
import { randomId, type NewId } from './migrate'
import { formatTimestamp } from './timestamp'

/** ひな型のストアの版。ほかの保存とは独立（song-file.md §6） */
export const TEMPLATE_SCHEMA_VERSION = 1

export interface StructureTemplate {
  id: string
  name: string
  updatedAt: string
  sections: SectionElement[]
}

export interface StructureTemplateStore {
  schemaVersion: number
  templates: StructureTemplate[]
}

export function emptyTemplateStore(): StructureTemplateStore {
  return { schemaVersion: TEMPLATE_SCHEMA_VERSION, templates: [] }
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function unknownKeys(obj: Record<string, unknown>, known: readonly string[]): string[] {
  return Object.keys(obj).filter((k) => !known.includes(k))
}

function checkSections(v: unknown, where: string, terms: ReadonlySet<string>): string[] {
  if (!Array.isArray(v) || v.length === 0) return [`${where}: sections が空でない配列ではない`]
  const errors: string[] = []
  v.forEach((s: unknown, i) => {
    const at = `${where} の要素 #${i}`
    if (!isObject(s)) {
      errors.push(`${at}: オブジェクトではない`)
      return
    }
    const extra = unknownKeys(s, ['id', 'sung'])
    if (extra.length) errors.push(`${at}: 知らないキー: ${extra.join(', ')}`)
    if (typeof s.id !== 'string') errors.push(`${at}: id が文字列ではない`)
    else if (!terms.has(s.id)) errors.push(`${at}: 不明な語 id: ${s.id}`)
    if ('sung' in s && typeof s.sung !== 'boolean') errors.push(`${at}: sung が真偽ではない`)
  })
  return errors
}

/** ストアの検査（song-file.md §13-1・§13-4）。エラーの一覧を返す（なければ空） */
export function checkTemplateStore(spec: Spec, obj: unknown): string[] {
  if (!isObject(obj)) return ['形が違う: オブジェクトではない']
  const version = obj.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version))
    return [`版がない、または整数でない: ${JSON.stringify(version)}`]
  if (version > TEMPLATE_SCHEMA_VERSION)
    return [
      `新しい版のため読めない: ${version}（このアプリが読めるのは ${TEMPLATE_SCHEMA_VERSION} まで）`,
    ]
  if (version < TEMPLATE_SCHEMA_VERSION) return [`移行が定義されていない版: ${version}`]
  const errors: string[] = []
  const extra = unknownKeys(obj, ['schemaVersion', 'templates'])
  if (extra.length) errors.push(`知らないキー: ${extra.join(', ')}`)
  if (!Array.isArray(obj.templates)) return [...errors, 'templates が配列ではない']
  const vocabulary = spec.fieldById.get(STRUCTURE_FIELD_ID)?.vocabulary
  const terms = new Set(spec.vocabularyById.get(vocabulary ?? '')?.items.map((i) => i.id))
  const ids = new Set<string>()
  const names = new Set<string>()
  obj.templates.forEach((t: unknown, i) => {
    const at = `ひな型 #${i}`
    if (!isObject(t)) {
      errors.push(`${at}: オブジェクトではない`)
      return
    }
    const extraKeys = unknownKeys(t, ['id', 'name', 'updatedAt', 'sections'])
    if (extraKeys.length) errors.push(`${at}: 知らないキー: ${extraKeys.join(', ')}`)
    if (typeof t.id !== 'string' || t.id === '') errors.push(`${at}: id が空でない文字列ではない`)
    else if (ids.has(t.id)) errors.push(`${at}: id が重複: ${t.id}`)
    else ids.add(t.id)
    if (typeof t.name !== 'string' || t.name.trim() === '')
      errors.push(`${at}: name が、前後の空白を除いて空`)
    else if (names.has(t.name)) errors.push(`${at}: name が重複: ${t.name}`)
    else names.add(t.name)
    if (typeof t.updatedAt !== 'string' || !TIMESTAMP.test(t.updatedAt))
      errors.push(`${at}: updatedAt がタイムゾーン付きの日時ではない`)
    errors.push(...checkSections(t.sections, at, terms))
  })
  return errors
}

export type TemplateStoreLoad =
  | { ok: true; store: StructureTemplateStore }
  | { ok: false; errors: string[] }

/** text は localStorage の値。ないときは空のストア。エラーが1件でもあれば全体を拒否する（部分的に読まない） */
export function loadTemplateStore(spec: Spec, text: string | null): TemplateStoreLoad {
  if (text === null) return { ok: true, store: emptyTemplateStore() }
  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['JSON として読めない'] }
  }
  const errors = checkTemplateStore(spec, obj)
  return errors.length ? { ok: false, errors } : { ok: true, store: obj as StructureTemplateStore }
}

export function findTemplateByName(
  store: StructureTemplateStore,
  name: string,
): StructureTemplate | undefined {
  return store.templates.find((t) => t.name === name)
}

/**
 * 保存する。同じ名前があれば上書きする（id と並びの位置を保ち、sections と updatedAt を替える）。
 * 上書きの確認は呼び出し側の UI が先に行う
 */
export function saveTemplate(
  store: StructureTemplateStore,
  name: string,
  sections: readonly SectionElement[],
  now: Date,
  newId: NewId = randomId,
): StructureTemplateStore {
  const fields = { updatedAt: formatTimestamp(now), sections: cloneJson([...sections]) }
  const same = findTemplateByName(store, name)
  return {
    ...store,
    templates: same
      ? store.templates.map((t) => (t.id === same.id ? { ...t, ...fields } : t))
      : [...store.templates, { id: newId(), name, ...fields }],
  }
}

/** 名前の変更で、新しい名前が使えないときの理由（使えるなら null）。今と同じ名前は使える */
export function templateRenameError(
  store: StructureTemplateStore,
  id: string,
  to: string,
): string | null {
  if (to === '') return '名前を入力してください'
  const other = findTemplateByName(store, to)
  return other && other.id !== id ? 'その名前はすでにあります' : null
}

/** 名前を変える。id・sections・updatedAt・並びの位置は変えない（判断ポイント66 と同じ） */
export function renameTemplate(
  store: StructureTemplateStore,
  id: string,
  to: string,
): StructureTemplateStore {
  return { ...store, templates: store.templates.map((t) => (t.id === id ? { ...t, name: to } : t)) }
}

export function deleteTemplate(store: StructureTemplateStore, id: string): StructureTemplateStore {
  return { ...store, templates: store.templates.filter((t) => t.id !== id) }
}

/** 編集中の並び → ひな型に入れる要素。歌ありのときだけ sung を持たせる（判断ポイント75 の (2)） */
export function sectionsForTemplate(
  spec: Spec,
  list: readonly SectionElement[],
  vocalMode: VocalMode,
): SectionElement[] {
  return list.map((x) =>
    vocalMode === 'vocal' ? { id: x.id, sung: x.sung ?? defaultSung(spec, x.id) } : { id: x.id },
  )
}

/**
 * ひな型の要素 → 編集中の並び。歌ありのとき、sung のない要素には defaultSung を当てる。
 * インストのときの印は編集中の要素に残す（判断ポイント74 の細部 (d)。保存の正規化で外す）
 */
export function sectionsFromTemplate(
  spec: Spec,
  sections: readonly SectionElement[],
  vocalMode: VocalMode,
): SectionElement[] {
  return sections.map((x) =>
    vocalMode === 'vocal' && x.sung === undefined
      ? { ...x, sung: defaultSung(spec, x.id) }
      : { ...x },
  )
}
