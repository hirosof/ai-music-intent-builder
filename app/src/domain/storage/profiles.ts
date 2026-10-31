// ユーザープロファイルのストアの操作と、ファイルの取り込み・書き出し（song-file.md §4、ui-and-nonfunctional.md §4-2・§4-3）。
// すべて純関数で、引数を書き換えず、新しいストアを返す。プロファイルの data は複製して持つ（呼び出し側との共有を避ける）。
// 版2（判断ポイント68）: プロファイルは id で特定し、名前は同じフォルダの中で一意。id は newId で作る（既定は UUID）
import { cloneJson } from '../clone'
import type { ExportFile, Folder, ProfileStore, SongData, UserProfile } from '../types/song'
import { randomId, STORE_SCHEMA_VERSION, type NewId } from './migrate'
import { formatTimestamp } from './timestamp'

const clone = cloneJson

export function emptyStore(): ProfileStore {
  return { schemaVersion: STORE_SCHEMA_VERSION, folders: [], profiles: [] }
}

export function findProfileById(store: ProfileStore, id: string): UserProfile | undefined {
  return store.profiles.find((p) => p.id === id)
}

/** フォルダ（null はルート）の中で、その名前のプロファイル */
export function findProfileByName(
  store: ProfileStore,
  folderId: string | null,
  name: string,
): UserProfile | undefined {
  return store.profiles.find((p) => p.folderId === folderId && p.name === name)
}

const assertName = (name: string) => {
  if (name === '') throw new Error('プロファイルの名前が空')
}

/** プロファイルを作る（data は複製。新しい id）。ストアが拒否されているときの、ファイルだけへの書き出しにも使う（判断ポイント44） */
export function makeProfile(
  name: string,
  data: SongData,
  now: Date,
  folderId: string | null = null,
  newId: NewId = randomId,
): UserProfile {
  assertName(name)
  return { id: newId(), folderId, name, updatedAt: formatTimestamp(now), data: clone(data) }
}

export interface SavedProfile {
  store: ProfileStore
  /** 保存したプロファイルの id（上書きなら元の id） */
  id: string
}

/**
 * プロファイルを保存する。同じフォルダに同じ名前があれば上書きし（id と位置は保つ）、なければ新しい id で末尾に加える
 * （名前は同じフォルダの中で一意。§4-1）。上書きの確認は呼び出し側（UI）が行う
 */
export function saveProfile(
  store: ProfileStore,
  folderId: string | null,
  name: string,
  data: SongData,
  now: Date,
  newId: NewId = randomId,
): SavedProfile {
  const i = store.profiles.findIndex((p) => p.folderId === folderId && p.name === name)
  const profiles = [...store.profiles]
  const id = i >= 0 ? profiles[i]!.id : newId()
  const profile = makeProfile(name, data, now, folderId, () => id)
  if (i >= 0) profiles[i] = profile
  else profiles.push(profile)
  return { store: { ...store, profiles }, id }
}

export function deleteProfile(store: ProfileStore, id: string): ProfileStore {
  return { ...store, profiles: store.profiles.filter((p) => p.id !== id) }
}

/** 名前の変更で、新しい名前が使えないときの理由（使えるなら null）。今と同じ名前は使える（何もしない）。一意は同じフォルダの中で見る */
export function renameError(store: ProfileStore, id: string, to: string): string | null {
  if (to === '') return '名前を入力してください'
  const p = findProfileById(store, id)
  const other = p && findProfileByName(store, p.folderId, to)
  if (other && other.id !== id) return 'その名前はすでにあります'
  return null
}

/**
 * プロファイルの名前を変える（ui-and-nonfunctional.md 判断ポイント66）。中身・id・updatedAt・並びの位置は変えない。
 * 今と同じ名前ならストアをそのまま返す。使えない名前・ないプロファイルは例外（確認は呼び出し側の UI が先に行う）
 */
export function renameProfile(store: ProfileStore, id: string, to: string): ProfileStore {
  const i = store.profiles.findIndex((p) => p.id === id)
  if (i < 0) throw new Error(`プロファイルがない: ${id}`)
  const err = renameError(store, id, to)
  if (err) throw new Error(`${err}: ${to}`)
  if (store.profiles[i]!.name === to) return store
  const profiles = [...store.profiles]
  profiles[i] = { ...clone(profiles[i]!), name: to }
  return { ...store, profiles }
}

/** フォルダ（folderIds）と、その祖先のフォルダ。並びは folders の順 */
export function withAncestors(
  folders: readonly Folder[],
  folderIds: Iterable<string | null>,
): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const need = new Set<string>()
  for (let id of folderIds) {
    while (id !== null && !need.has(id) && byId.has(id)) {
      need.add(id)
      id = byId.get(id)!.parentId
    }
  }
  return folders.filter((f) => need.has(f.id))
}

/**
 * ファイルのうち、選んだプロファイルだけのファイル（取り込みの対象。判断ポイント65）。並びはファイルの順。
 * フォルダは、選んだプロファイルが属するもの（祖先を含む）だけを残す（判断ポイント69）
 */
export function selectFromFile(file: ExportFile, indexes: ReadonlySet<number>): ExportFile {
  const profiles = file.profiles.filter((_, i) => indexes.has(i))
  return {
    ...file,
    folders: withAncestors(
      file.folders,
      profiles.map((p) => p.folderId),
    ),
    profiles,
  }
}

/** 「別名で追加」の候補名。名前（2）、名前（3）…のうち、使われていない最初のもの（U3 の決定 I6） */
export function suggestName(name: string, taken: ReadonlySet<string>): string {
  for (let n = 2; ; n++) {
    const candidate = `${name}（${n}）`
    if (!taken.has(candidate)) return candidate
  }
}

/** 名前が衝突したときの操作（判断ポイント35。上書き／別名で追加／取り込まない） */
export type ConflictResolution =
  | { action: 'overwrite' }
  | { action: 'rename'; name: string }
  | { action: 'skip' }

export interface NameConflict {
  /** 取り込むプロファイル */
  incoming: UserProfile
  /** ストアにある、同じフォルダの同じ名前のプロファイル */
  existing: UserProfile
  /** 「別名で追加」の候補名（そのフォルダにも、まだ取り込んでいないファイルの名前にもない） */
  suggestedName: string
}

export interface ImportSummary {
  store: ProfileStore
  added: string[]
  overwritten: string[]
  skipped: string[]
  /** ストアに入れた（追加・上書きした）プロファイルの id。ファイルの順 */
  storedIds: string[]
}

/** 取り込みの置き場所（判断ポイント69） */
export interface ImportOptions {
  /** 取り込み先のフォルダ（null はルート）。既定はルート */
  targetFolderId?: string | null
  /** ファイルのフォルダ構成を、取り込み先の下に再現する（同じ名前のフォルダがあれば合流）。既定はオン */
  keepStructure?: boolean
  newId?: NewId
}

/**
 * 取り込みの「追加」（§4-3）。ファイルのプロファイルを、ファイルの順にストアへ加える。
 * 入る先は取り込み先のフォルダ。フォルダ構成を保つときは、ファイルのフォルダ構成を取り込み先の下に再現し、
 * 同じ親の中に同じ名前のフォルダがあれば合流する（判断ポイント69）。作るフォルダは、取り込むプロファイルが入るものだけ
 * （まだないフォルダに入るプロファイルは衝突しないので、作ったフォルダが空のまま残ることはない）。
 * 取り込んだプロファイルと、作ったフォルダには新しい id を振る。上書きは、ストアのプロファイルの id と位置を保って中身を入れ替える（細部 (b)）。
 * 名前の衝突は入る先のフォルダの中で判定し、衝突するたびに resolve を呼んで答えを待つ
 * （画面の衝突ダイアログ。「残りすべてに適用」は、呼び出し側が resolve の中で覚える）。
 * 取り込むプロファイルの updatedAt は、ファイルの値のまま（U3 の決定 I7）
 */
export async function importAdd(
  store: ProfileStore,
  file: ExportFile,
  resolve: (conflict: NameConflict) => ConflictResolution | Promise<ConflictResolution>,
  { targetFolderId = null, keepStructure = true, newId = randomId }: ImportOptions = {},
): Promise<ImportSummary> {
  const folders = [...store.folders]
  const profiles = [...store.profiles]
  const summary = { added: [] as string[], overwritten: [] as string[], skipped: [] as string[] }
  const storedIds: string[] = []
  const fileFolders = new Map(file.folders.map((f) => [f.id, f]))
  // ファイルのフォルダ → ストアのフォルダ（既存に合流、または作る）
  const planned = new Map<string, string>()
  const destOf = (fileFolderId: string | null): string | null => {
    if (!keepStructure || fileFolderId === null) return targetFolderId
    const known = planned.get(fileFolderId)
    if (known !== undefined) return known
    const f = fileFolders.get(fileFolderId)
    if (!f) return targetFolderId
    const parentId = destOf(f.parentId)
    const existing = folders.find((x) => x.parentId === parentId && x.name === f.name)
    const id = existing?.id ?? newId()
    if (!existing) folders.push({ id, parentId, name: f.name })
    planned.set(fileFolderId, id)
    return id
  }
  const namesIn = (folderId: string | null) =>
    profiles.filter((p) => p.folderId === folderId).map((p) => p.name)
  const put = (incoming: UserProfile, folderId: string | null, name: string) => {
    const p = { ...clone(incoming), id: newId(), folderId, name }
    profiles.push(p)
    storedIds.push(p.id)
  }
  const dests = file.profiles.map((p) => destOf(p.folderId))
  for (const [i, incoming] of file.profiles.entries()) {
    const folderId = dests[i]!
    const existingIndex = profiles.findIndex(
      (p) => p.folderId === folderId && p.name === incoming.name,
    )
    if (existingIndex < 0) {
      put(incoming, folderId, incoming.name)
      summary.added.push(incoming.name)
      continue
    }
    const later = file.profiles.slice(i + 1).filter((_, j) => dests[i + 1 + j] === folderId)
    const taken = new Set([...namesIn(folderId), ...later.map((p) => p.name)])
    const r = await resolve({
      incoming,
      existing: profiles[existingIndex]!,
      suggestedName: suggestName(incoming.name, taken),
    })
    if (r.action === 'skip') {
      summary.skipped.push(incoming.name)
    } else if (r.action === 'overwrite') {
      const existing = profiles[existingIndex]!
      profiles[existingIndex] = {
        ...clone(incoming),
        id: existing.id,
        folderId,
        name: existing.name,
      }
      storedIds.push(existing.id)
      summary.overwritten.push(incoming.name)
    } else {
      assertName(r.name)
      if (namesIn(folderId).includes(r.name))
        throw new Error(`別名がストアの名前と重複している: ${r.name}`)
      put(incoming, folderId, r.name)
      summary.added.push(r.name)
    }
  }
  return { store: { ...store, folders, profiles }, ...summary, storedIds }
}

/**
 * 取り込みの「置換」（§4-3）。ストアの内容を、ファイルのプロファイルと必要なフォルダで入れ替える（判断ポイント69）。自動保存には触れない。
 * プロファイルとフォルダには新しい id を振り、フォルダの参照も振り直す。フォルダ構成を保たないときは、全件をルートに入れる
 */
export function importReplace(
  file: ExportFile,
  { keepStructure = true, newId = randomId }: Omit<ImportOptions, 'targetFolderId'> = {},
): ProfileStore {
  const folders = keepStructure ? file.folders : []
  const map = new Map(folders.map((f) => [f.id, newId()]))
  const ref = (id: string | null) => (id === null ? null : (map.get(id) ?? null))
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    folders: folders.map((f) => ({ ...f, id: map.get(f.id)!, parentId: ref(f.parentId) })),
    profiles: file.profiles.map((p) => ({ ...clone(p), id: newId(), folderId: ref(p.folderId) })),
  }
}

/**
 * エクスポートファイルを組み立てる（§4-2）。単一は1件、一括は N 件。ファイルは1件以上。
 * フォルダは、入れたプロファイルが属するもの（祖先を含む）だけを folders から選んで入れる（判断ポイント69）
 */
export function buildExportFile(
  profiles: readonly UserProfile[],
  now: Date,
  folders: readonly Folder[] = [],
): ExportFile {
  if (profiles.length === 0) throw new Error('書き出すプロファイルがない')
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    exportType: 'profiles',
    exportedAt: formatTimestamp(now),
    folders: clone(
      withAncestors(
        folders,
        profiles.map((p) => p.folderId),
      ),
    ),
    profiles: clone([...profiles]),
  }
}

/** 保存データの文字列（JSON。UTF-8。DP-07）。仕様の例と同じく2字下げ */
export function toJsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}
