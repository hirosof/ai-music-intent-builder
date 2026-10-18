// 仕様の JSON（design/v0/docs/specifications/）の読み込み。ビルド時にアプリへ組み込む（U0 の決定。写しを持たない）。
// JSON の import は文字列のリテラル型を失うため、ここで一度だけ仕様の型を当てはめる（U1 の決定 3）。
import fieldsJson from '@spec/fields.json'
import presetIndexJson from '@spec/presets/index.json'
import { buildSpec, type Spec } from '@/domain/spec'
import type { FieldsDef } from '@/domain/types/fields'
import type { PresetIndex, Vocabulary } from '@/domain/types/presets'
import type { ToolProfile } from '@/domain/types/tool-profile'

const presetModules = import.meta.glob<Vocabulary>('@spec/presets/*.json', {
  eager: true,
  import: 'default',
})
const toolProfileModules = import.meta.glob<ToolProfile>('@spec/tool-profiles/*.json', {
  eager: true,
  import: 'default',
})

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

export const spec: Spec = buildSpec({
  fields: fieldsJson as unknown as FieldsDef,
  presetIndex: presetIndexJson as PresetIndex,
  presetFiles: Object.fromEntries(
    Object.entries(presetModules).map(([path, v]) => [fileName(path), v]),
  ),
  toolProfiles: Object.values(toolProfileModules),
})

export const specSummary = {
  songFields: spec.fieldById.size,
  outputFields: spec.outputById.size,
  vocabularies: spec.vocabularyById.size,
  toolProfiles: spec.toolProfileById.size,
}
