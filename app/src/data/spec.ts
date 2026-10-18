// 仕様の JSON（design/v0/docs/specifications/）の読み込み。ビルド時にアプリへ組み込む。
// 型と検証は U1（データ層）で整える。U0 では「アプリから読める」ことだけを扱う。
import fields from '@spec/fields.json'
import presetIndex from '@spec/presets/index.json'

const presetFiles = import.meta.glob<{ id: string }>('@spec/presets/*.json', {
  eager: true,
  import: 'default',
})
const toolProfileFiles = import.meta.glob<{ toolId: string }>('@spec/tool-profiles/*.json', {
  eager: true,
  import: 'default',
})

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

// index.json の順序で語彙を並べる。索引にあってファイルがないものは例外にする
export const vocabularies = presetIndex.vocabularies.map((entry) => {
  const path = Object.keys(presetFiles).find((p) => fileName(p) === entry.file)
  if (!path) throw new Error(`語彙のファイルがない: ${entry.file}`)
  return presetFiles[path]!
})

export const toolProfiles = Object.values(toolProfileFiles)

export { fields }

export const specSummary = {
  songFields: fields.fields.length,
  outputFields: fields.output.length,
  vocabularies: vocabularies.length,
  toolProfiles: toolProfiles.length,
}
