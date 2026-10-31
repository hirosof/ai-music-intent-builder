// フォルダの木の見せ方と、たどり方（song-file.md §4-6。ui-and-nonfunctional.md 判断ポイント67〜70）。
// フォルダは id と親の参照（parentId。null はルート直下）で持つ。純関数で、引数を書き換えない
import type { Folder } from '../types/song'

/** 木を表示するための行（深さ優先。兄弟は名前順） */
export interface FolderRow {
  folder: Folder
  /** ルート直下が 0 */
  depth: number
}

const byName = (a: Folder, b: Folder) => a.name.localeCompare(b.name, 'ja')

/** フォルダの木を、表示の順（親の次にその子。兄弟は名前順）の行にする。親が見つからないフォルダは出さない */
export function folderRows(folders: readonly Folder[]): FolderRow[] {
  const children = new Map<string | null, Folder[]>()
  for (const f of folders) children.set(f.parentId, [...(children.get(f.parentId) ?? []), f])
  const rows: FolderRow[] = []
  const seen = new Set<string>()
  const walk = (parentId: string | null, depth: number) => {
    for (const f of [...(children.get(parentId) ?? [])].sort(byName)) {
      if (seen.has(f.id)) continue
      seen.add(f.id)
      rows.push({ folder: f, depth })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 0)
  return rows
}

/** ルートからそのフォルダまでの名前（ルートは含まない。null・見つからないときは空） */
export function folderPath(folders: readonly Folder[], id: string | null): string[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const names: string[] = []
  const seen = new Set<string>()
  for (let cur = id; cur !== null && byId.has(cur) && !seen.has(cur);) {
    seen.add(cur)
    const f = byId.get(cur)!
    names.unshift(f.name)
    cur = f.parentId
  }
  return names
}

/** 表示用のパス（例: 「ルート ＞ ゲーム ＞ ボス戦」） */
export function folderPathLabel(folders: readonly Folder[], id: string | null): string {
  return ['ルート', ...folderPath(folders, id)].join(' ＞ ')
}

/** そのフォルダの配下（子・孫…）の id。自分は含まない */
export function descendantIds(folders: readonly Folder[], id: string): Set<string> {
  const out = new Set<string>()
  let frontier = [id]
  while (frontier.length > 0) {
    const next = folders.filter((f) => f.parentId !== null && frontier.includes(f.parentId))
    frontier = next.map((f) => f.id).filter((x) => !out.has(x) && x !== id)
    for (const x of frontier) out.add(x)
  }
  return out
}
