// 保存データの検証を、同梱の仕様（項目定義・語彙・ツールプロファイル・スキーマ）で使えるようにする。
import songSchema from '@spec/song.schema.json'
import exportSchema from '@spec/song-export.schema.json'
import { checkSavedText, type CheckResult } from '@/domain/validation/check-saved'
import { createSchemaValidators } from '@/domain/validation/schema'
import { spec } from './spec'

export const schemaValidators = createSchemaValidators(songSchema, exportSchema)

/** 保存データの文字列（楽曲データ／エクスポートファイル／ストア）を検証する。形は自動判別 */
export function checkSaved(text: string): CheckResult {
  return checkSavedText(text, spec, schemaValidators)
}
