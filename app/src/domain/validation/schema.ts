// 構造の検証（F1）。仕様の JSON Schema（song.schema.json・song-export.schema.json）を、Ajv でそのまま使う（U1 の決定 2）。
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020'

export interface SchemaValidators {
  /** 楽曲データ */
  song: ValidateFunction
  /** エクスポートファイル */
  file: ValidateFunction
  /** プロファイルのストア（song-export.schema.json の $defs/profileStore） */
  store: ValidateFunction
  /** 版1 のエクスポートファイル・ストア（移行の前に検証する。$defs/exportFileV1・profileStoreV1） */
  fileV1: ValidateFunction
  storeV1: ValidateFunction
}

export function createSchemaValidators(
  songSchema: { $id: string },
  exportSchema: { $id: string },
): SchemaValidators {
  // date-time は書式として検査しない。スキーマの pattern が同じ制約を持ち、
  // 参照実装（check_fields.py。jsonschema に rfc3339-validator がない）も書式を検査していないため、それに合わせる
  const ajv = new Ajv2020({ allErrors: true, formats: { 'date-time': true } })
  ajv.addSchema(songSchema)
  ajv.addSchema(exportSchema)
  const get = (ref: string) => {
    const v = ajv.getSchema(ref)
    if (!v) throw new Error(`スキーマを解決できない: ${ref}`)
    return v
  }
  return {
    song: get(songSchema.$id),
    file: get(exportSchema.$id),
    store: get(`${exportSchema.$id}#/$defs/profileStore`),
    fileV1: get(`${exportSchema.$id}#/$defs/exportFileV1`),
    storeV1: get(`${exportSchema.$id}#/$defs/profileStoreV1`),
  }
}
