// ファクトリープロファイル（song-file.md §4-4。判断ポイント19・39・40）。同梱のエクスポートファイルをそのまま使う。
// 正しさ（エラー0・警告0）はテストで保証する（U3 の決定 I10）。書き換えず、読み込みは編集中の内容への複製だけ
import factoryJson from '@spec/factory-profiles.json'
import { cloneJson } from '@/domain/clone'
import type { ExportFile, Profile, SongData } from '@/domain/types/song'

export const factoryProfiles: readonly Profile[] = (factoryJson as unknown as ExportFile).profiles

/** 編集中の内容に読み込む楽曲データ（複製。複製元は記録しない） */
export function copyFactoryData(name: string): SongData | undefined {
  const p = factoryProfiles.find((x) => x.name === name)
  return p && cloneJson(p.data)
}
