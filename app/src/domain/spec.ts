// 仕様の定義（項目・語彙・ツールプロファイル）を、引きやすい形にまとめる。純関数（読み込み元に依存しない）。
// 定義のファイルそのものの正しさは、設計側の check_fields.py（D1〜D13、P0〜P11）と build_presets.py が保証する（U1 の決定 1）。
import type { FieldDef, FieldsDef, OutputDef } from './types/fields'
import type { PresetIndex, Vocabulary } from './types/presets'
import type { Param, ToolProfile } from './types/tool-profile'

export interface Spec {
  fieldsDef: FieldsDef
  /** 楽曲の項目（fields.json の並び順） */
  fieldById: Map<string, FieldDef>
  outputById: Map<string, OutputDef>
  /** 語彙（index.json の並び順） */
  vocabularyById: Map<string, Vocabulary>
  /** ツールプロファイル。キーは toolId */
  toolProfileById: Map<string, ToolProfile>
}

export interface RawSpec {
  fields: FieldsDef
  presetIndex: PresetIndex
  /** 語彙ファイル。キーはファイル名（例: genre.json） */
  presetFiles: Record<string, Vocabulary>
  toolProfiles: ToolProfile[]
}

export function buildSpec(raw: RawSpec): Spec {
  const vocabularyById = new Map<string, Vocabulary>()
  for (const entry of raw.presetIndex.vocabularies) {
    const v = raw.presetFiles[entry.file]
    if (!v) throw new Error(`語彙のファイルがない: ${entry.file}`)
    vocabularyById.set(v.id, v)
  }
  return {
    fieldsDef: raw.fields,
    fieldById: new Map(raw.fields.fields.map((f) => [f.id, f])),
    outputById: new Map(raw.fields.output.map((o) => [o.id, o])),
    vocabularyById,
    toolProfileById: new Map(raw.toolProfiles.map((p) => [p.toolId, p])),
  }
}

/** 項目が取れる値（語の id）の集合。inline の options を持つ項目は options から、それ以外は語彙から */
export function fieldItemIds(spec: Spec, field: FieldDef): Set<string> {
  if (field.options) return new Set(field.options.map((o) => o.id))
  const v = field.vocabulary ? spec.vocabularyById.get(field.vocabulary) : undefined
  return new Set(v ? v.items.map((i) => i.id) : [])
}

/** 曲の構成の項目 id。歌ありのときは「歌詞」のグループに置く（UI 判断ポイント74、文面の判断ポイント50。fields.json の group は time のまま） */
export const STRUCTURE_FIELD_ID = 'structure'
const LYRICS_GROUP_ID = 'lyrics'

/** 表示の上で項目が属するグループ（カードと依頼文 §6 の表） */
export function fieldGroupId(field: FieldDef, vocal: boolean): string {
  return vocal && field.id === STRUCTURE_FIELD_ID ? LYRICS_GROUP_ID : field.group
}

/** グループの項目（項目定義の順）。歌ありの曲の構成は、歌詞のグループの最後に置く */
export function fieldsInGroup(spec: Spec, groupId: string, vocal: boolean): FieldDef[] {
  const fields = [...spec.fieldById.values()]
  const members = fields.filter((f) => f.group === groupId && fieldGroupId(f, vocal) === groupId)
  const moved = fields.filter((f) => f.group !== groupId && fieldGroupId(f, vocal) === groupId)
  return [...members, ...moved]
}

/** 語の歌の印の初期値（語彙 section の defaultSung。UI 判断ポイント73・74）。語彙にない id は偽 */
export function defaultSung(spec: Spec, id: string): boolean {
  const vocabulary = spec.fieldById.get(STRUCTURE_FIELD_ID)?.vocabulary
  return (
    spec.vocabularyById.get(vocabulary ?? '')?.items.find((i) => i.id === id)?.defaultSung ?? false
  )
}

/** ツールプロファイルのパラメータ（なければ undefined） */
export function profileParam(profile: ToolProfile | undefined, paramId: string): Param | undefined {
  return profile?.params.find((p) => p.id === paramId)
}
