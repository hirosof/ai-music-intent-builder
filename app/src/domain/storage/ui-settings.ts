// UI 設定（song-file.md §5、ui-and-nonfunctional.md §4-6）。語ごとの表示の有無を、語彙の既定値から変えたものだけ持つ。
// 版の不一致・スキーマ違反は破棄する（移行は設けない。U3 の決定 I8）。不明な語彙 id・語 id は、データから消さず、使うときに無視する
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020'
import { SUPPORTED_SCHEMA_VERSION } from '../validation/check-saved'

export interface UiSettings {
  schemaVersion: number
  termVisibility: Record<string, Record<string, boolean>>
}

export function defaultUiSettings(): UiSettings {
  return { schemaVersion: SUPPORTED_SCHEMA_VERSION, termVisibility: {} }
}

export function createUiSettingsValidator(schema: object): ValidateFunction {
  return new Ajv2020({ allErrors: true }).compile(schema)
}

export type UiSettingsLoad =
  | { status: 'empty'; settings: UiSettings }
  | { status: 'ok'; settings: UiSettings }
  | { status: 'discarded'; settings: UiSettings; reason: string }

/** text は localStorage の値（ない場合は null）。破棄したときは既定値を返す */
export function loadUiSettings(text: string | null, validate: ValidateFunction): UiSettingsLoad {
  if (text === null) return { status: 'empty', settings: defaultUiSettings() }
  const discard = (reason: string): UiSettingsLoad => ({
    status: 'discarded',
    settings: defaultUiSettings(),
    reason,
  })
  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch {
    return discard('JSON として読めない')
  }
  const version =
    typeof obj === 'object' && obj !== null
      ? (obj as { schemaVersion?: unknown }).schemaVersion
      : undefined
  if (version !== SUPPORTED_SCHEMA_VERSION) return discard(`版が違う: ${JSON.stringify(version)}`)
  if (!validate(obj)) return discard('スキーマに適合しない')
  return { status: 'ok', settings: obj as UiSettings }
}

/** 語の表示の有無。defaultVisible は語彙の既定値（語の defaultVisible が false でなければ表示） */
export function isTermVisible(
  settings: UiSettings,
  vocabularyId: string,
  termId: string,
  defaultVisible: boolean,
): boolean {
  return settings.termVisibility[vocabularyId]?.[termId] ?? defaultVisible
}

/** 語の表示の有無を変える。既定値と同じになったら、その語を設定から除く（既定値から変えたものだけを持つ） */
export function setTermVisibility(
  settings: UiSettings,
  vocabularyId: string,
  termId: string,
  visible: boolean,
  defaultVisible: boolean,
): UiSettings {
  const vocab = { ...settings.termVisibility[vocabularyId] }
  if (visible === defaultVisible) delete vocab[termId]
  else vocab[termId] = visible
  const termVisibility = { ...settings.termVisibility }
  if (Object.keys(vocab).length === 0) delete termVisibility[vocabularyId]
  else termVisibility[vocabularyId] = vocab
  return { ...settings, termVisibility }
}
