// ファクトリープロファイル（song-file.md §4-4。判断ポイント19・39・40）。同梱のエクスポートファイルをそのまま使う。
// 正しさ（エラー0・警告0）はテストで保証する（U3 の決定 I10）。書き換えず、読み込みは編集中の内容への複製だけ。
// 同梱のファイルの外側は版1 の形のまま（ファクトリープロファイルは id・folderId を持たない。song-file.md §4-1）。
// data は楽曲データの今の版で置く（UI 判断ポイント81）。読むときの移行は、ほかの保存データと同じに通す（song-file.md §6-5）
import factoryJson from '@spec/factory-profiles.json'
import { cloneJson } from '@/domain/clone'
import { migrateProfilesData } from '@/domain/storage/migrate'
import type { ExportFileV1, Profile, SongData } from '@/domain/types/song'
import { spec } from './spec'

export const factoryProfiles = migrateProfilesData(
  (factoryJson as unknown as ExportFileV1).profiles,
  spec,
) as readonly Profile[]

/** 編集中の内容に読み込む楽曲データ（複製。複製元は記録しない） */
export function copyFactoryData(name: string): SongData | undefined {
  const p = factoryProfiles.find((x) => x.name === name)
  return p && cloneJson(p.data)
}
