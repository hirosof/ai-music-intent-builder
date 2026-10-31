// 保存データ（楽曲データ・プロファイル・ストア・エクスポートファイル）の型。
// 仕様: song-file.md §2〜§4、axes の値の形は input-items.md §5。構造の正は song.schema.json・song-export.schema.json
import type { StateId } from './fields'

/** 3値選択の値。「未指定」の語はキーを持たない */
export type Choice = 'use' | 'exclude'

/** axes の1項目の値（input-items.md §5）。①指定でない状態は state だけを持つ */
export interface AxisValue {
  state: StateId
  /** select: 語の id、text: 文字列、bpm: 数値か {min, max}、length: 秒、sectionList: 語の id の配列 */
  value?: string | number | { min: number; max: number } | string[]
  /** triSelect */
  choices?: Record<string, Choice>
  freeText?: string
}

/** 状態モデル（①指定／②お任せ）を持つ、派生元の項目（song-file.md §3） */
export interface DerivedStateValue<T extends string> {
  state: 'specified' | 'delegated'
  value?: T
}

/** 派生元（song-file.md §3）。初版では常に null（F6） */
export interface DerivedFrom {
  source: 'internal' | 'external'
  requestId?: string
  externalSourceLabel?: string
  operation: string | null
  sourceStyleText?: string | null
  sourceStyleEditMethod?: DerivedStateValue<'keep' | 'change'>
  sourceStyleCloseness?: DerivedStateValue<'near' | 'far'>
  originalLength?: number | null
}

export type VocalMode = 'instrumental' | 'vocal'
export type LyricsAuthor = 'chat-ai' | 'chat-ai-instruction'
export type RequestScope = 'combined' | 'style' | 'lyrics'

/** 依頼（song-file.md §2-2）。1つの依頼文に対応する */
export interface SongRequest {
  id: string
  toolId: string
  toolVersion: string
  generationType: 'new' | 'derived'
  vocalMode: VocalMode
  /** vocalMode = vocal のとき必須、instrumental のとき null（F12） */
  lyricsAuthor: LyricsAuthor | null
  derivedFrom: DerivedFrom | null
  /** キーは項目 id。省略した項目は初期状態 */
  axes: Record<string, AxisValue>
  /** キーは出力項目 id。省略した項目は既定値。recommendParams は {パラメータ id: 真偽} */
  output: Record<string, unknown>
}

/** 楽曲データ（song-file.md §2）。すべての保存の中身 */
export interface SongData {
  schemaVersion: number
  requests: SongRequest[]
}

/** プロファイル（ユーザー・ファクトリー共通の部分。song-file.md §4-1）。ファクトリープロファイルはこの形 */
export interface Profile {
  name: string
  updatedAt: string
  data: SongData
}

/** ユーザープロファイル（版2。song-file.md §4-1。判断ポイント68）。id で特定し、名前は同じフォルダの中で一意 */
export interface UserProfile extends Profile {
  id: string
  /** 所属するフォルダの id。null はルート */
  folderId: string | null
}

/** フォルダ（song-file.md §4-6）。名前は同じ親の中で一意 */
export interface Folder {
  id: string
  /** 親のフォルダの id。null はルート直下 */
  parentId: string | null
  name: string
}

/** プロファイルのストア（localStorage。版2。song-file.md §4-2） */
export interface ProfileStore {
  schemaVersion: number
  folders: Folder[]
  profiles: UserProfile[]
}

/** エクスポートファイル（版2。song-file.md §4-2）。常にプロファイルの配列を持つ */
export interface ExportFile extends ProfileStore {
  exportType: 'profiles'
  exportedAt: string
}

/** 版1 のエクスポートファイル（フォルダなし）。同梱のファクトリープロファイルもこの形 */
export interface ExportFileV1 {
  schemaVersion: 1
  exportType: 'profiles'
  exportedAt: string
  profiles: Profile[]
}
