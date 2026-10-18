// 仕様の定義（項目・語彙・ツールプロファイル）を、引きやすい形にまとめる。純関数（読み込み元に依存しない）。
// 定義のファイルそのものの正しさは、設計側の check_fields.py（D1〜D12、P0〜P11）と build_presets.py が保証する（U1 の決定 1）。
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

/** ツールプロファイルのパラメータ（なければ undefined） */
export function profileParam(profile: ToolProfile | undefined, paramId: string): Param | undefined {
  return profile?.params.find((p) => p.id === paramId)
}
