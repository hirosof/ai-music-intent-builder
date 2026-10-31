// プロファイル管理の画面の操作（ui-and-nonfunctional.md 判断ポイント67）: フォルダの作成・名前の変更、
// フォルダとプロファイルの移動・削除、複数選択の展開、全フォルダの検索。純関数で、引数を書き換えず、新しいストアを返す。
// 名前の一意は、プロファイルは同じフォルダの中、フォルダは同じ親の中（song-file.md §4-1・§4-6）
import { norm } from '../editor/tree'
import type { Folder, ProfileStore, UserProfile } from '../types/song'
import { descendantIds, folderPathLabel } from './folders'
import { randomId, type NewId } from './migrate'

/** 画面で選んだもの（フォルダとプロファイルの id） */
export interface Selection {
  folderIds: readonly string[]
  profileIds: readonly string[]
}

/** フォルダの名前が使えないときの理由（使えるなら null）。selfId は名前を変えるフォルダ（自分の今の名前は使える） */
export function folderNameError(
  store: ProfileStore,
  parentId: string | null,
  name: string,
  selfId?: string,
): string | null {
  if (name.trim() === '') return '名前を入力してください'
  if (store.folders.some((f) => f.parentId === parentId && f.name === name && f.id !== selfId))
    return 'その名前はすでにあります'
  return null
}

/** フォルダを作る（判断ポイント67「新しいフォルダ」。今のフォルダの中に） */
export function createFolder(
  store: ProfileStore,
  parentId: string | null,
  name: string,
  newId: NewId = randomId,
): { store: ProfileStore; id: string } {
  const err = folderNameError(store, parentId, name)
  if (err) throw new Error(`${err}: ${name}`)
  const id = newId()
  return { store: { ...store, folders: [...store.folders, { id, parentId, name }] }, id }
}

/** フォルダの名前を変える。中身と位置は変えない */
export function renameFolder(store: ProfileStore, id: string, name: string): ProfileStore {
  const f = store.folders.find((x) => x.id === id)
  if (!f) throw new Error(`フォルダがない: ${id}`)
  const err = folderNameError(store, f.parentId, name, id)
  if (err) throw new Error(`${err}: ${name}`)
  if (f.name === name) return store
  return { ...store, folders: store.folders.map((x) => (x.id === id ? { ...x, name } : x)) }
}

/** 選んだフォルダ（配下を含む）と、その中のプロファイル・選んだプロファイル。削除・書き出しの対象 */
export function expandSelection(
  store: ProfileStore,
  sel: Selection,
): { folderIds: Set<string>; profiles: UserProfile[] } {
  const folderIds = new Set<string>()
  for (const id of sel.folderIds) {
    if (!store.folders.some((f) => f.id === id)) continue
    folderIds.add(id)
    for (const d of descendantIds(store.folders, id)) folderIds.add(d)
  }
  const picked = new Set(sel.profileIds)
  const profiles = store.profiles.filter(
    (p) => picked.has(p.id) || (p.folderId !== null && folderIds.has(p.folderId)),
  )
  return { folderIds, profiles }
}

/** 削除の確認に出す件数（判断ポイント67「フォルダ N 個、プロファイル M 件」。配下・中身を含む） */
export function deletionCounts(
  store: ProfileStore,
  sel: Selection,
): { folders: number; profiles: number } {
  const e = expandSelection(store, sel)
  return { folders: e.folderIds.size, profiles: e.profiles.length }
}

/** 選んだもの（フォルダは中身ごと）を削除する */
export function deleteItems(store: ProfileStore, sel: Selection): ProfileStore {
  const e = expandSelection(store, sel)
  const gone = new Set(e.profiles.map((p) => p.id))
  return {
    ...store,
    folders: store.folders.filter((f) => !e.folderIds.has(f.id)),
    profiles: store.profiles.filter((p) => !gone.has(p.id)),
  }
}

/** 移動先として選べないフォルダ（選んだフォルダ自身と、その配下。判断ポイント67） */
export function unmovableTargets(store: ProfileStore, sel: Selection): Set<string> {
  const out = new Set<string>()
  for (const id of sel.folderIds) {
    out.add(id)
    for (const d of descendantIds(store.folders, id)) out.add(d)
  }
  return out
}

/**
 * 移動できないときの理由（できるなら空）。移動先が自分自身・配下、移動先に同じ名前のもの（移動するもの同士を含む）があるとき。
 * 名前の衝突は、移動先の中で、移動しないものと、移動するもの同士で見る
 */
export function moveErrors(store: ProfileStore, sel: Selection, targetId: string | null): string[] {
  const errors: string[] = []
  if (targetId !== null && unmovableTargets(store, sel).has(targetId))
    errors.push('フォルダを、自分自身やその中には移動できません')
  const movingFolders = store.folders.filter((f) => sel.folderIds.includes(f.id))
  const movingProfiles = store.profiles.filter((p) => sel.profileIds.includes(p.id))
  const where = folderPathLabel(store.folders, targetId)
  const clash = (names: string[], staying: string[], kind: string) => {
    const seen = new Set(staying)
    const dup = new Set<string>()
    for (const n of names) {
      if (seen.has(n)) dup.add(n)
      seen.add(n)
    }
    for (const n of dup) errors.push(`「${where}」に、同じ名前の${kind}「${n}」があります`)
  }
  clash(
    movingFolders.map((f) => f.name),
    store.folders
      .filter((f) => f.parentId === targetId && !sel.folderIds.includes(f.id))
      .map((f) => f.name),
    'フォルダ',
  )
  clash(
    movingProfiles.map((p) => p.name),
    store.profiles
      .filter((p) => p.folderId === targetId && !sel.profileIds.includes(p.id))
      .map((p) => p.name),
    'プロファイル',
  )
  return errors
}

/** 選んだフォルダ（中身ごと）とプロファイルを、移動先のフォルダ（null はルート）へ移す。id・名前・更新日時は変えない */
export function moveItems(
  store: ProfileStore,
  sel: Selection,
  targetId: string | null,
): ProfileStore {
  const errors = moveErrors(store, sel, targetId)
  if (errors.length > 0) throw new Error(errors.join('\n'))
  return {
    ...store,
    folders: store.folders.map((f) =>
      sel.folderIds.includes(f.id) ? { ...f, parentId: targetId } : f,
    ),
    profiles: store.profiles.map((p) =>
      sel.profileIds.includes(p.id) ? { ...p, folderId: targetId } : p,
    ),
  }
}

/** 検索の結果の1行。パスは、その行が入っているフォルダ */
export type SearchHit =
  | { kind: 'folder'; folder: Folder; path: string }
  | { kind: 'profile'; profile: UserProfile; path: string }

/** 検索の対象（判断ポイント67 の細部 (i)） */
export type SearchTarget = 'both' | 'folder' | 'profile'

/**
 * 全フォルダから、名前に検索語を含むフォルダとプロファイルを探す（判断ポイント67。表記の揺れは norm でそろえる）。
 * target で、フォルダだけ・プロファイルだけに絞れる
 */
export function searchAll(
  store: ProfileStore,
  query: string,
  target: SearchTarget = 'both',
): SearchHit[] {
  const q = norm(query)
  if (!q) return []
  return [
    ...store.folders
      .filter((f) => target !== 'profile' && norm(f.name).includes(q))
      .map((folder) => ({
        kind: 'folder' as const,
        folder,
        path: folderPathLabel(store.folders, folder.parentId),
      })),
    ...store.profiles
      .filter((p) => target !== 'folder' && norm(p.name).includes(q))
      .map((profile) => ({
        kind: 'profile' as const,
        profile,
        path: folderPathLabel(store.folders, profile.folderId),
      })),
  ]
}
