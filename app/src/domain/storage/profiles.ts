// ユーザープロファイルのストアの操作と、ファイルの取り込み・書き出し（song-file.md §4、ui-and-nonfunctional.md §4-2・§4-3）。
// すべて純関数で、引数を書き換えず、新しいストアを返す。プロファイルの data は複製して持つ（呼び出し側との共有を避ける）
import { cloneJson } from '../clone'
import type { ExportFile, Profile, ProfileStore, SongData } from '../types/song'
import { SUPPORTED_SCHEMA_VERSION } from '../validation/check-saved'
import { formatTimestamp } from './timestamp'

const clone = cloneJson

export function emptyStore(): ProfileStore {
  return { schemaVersion: SUPPORTED_SCHEMA_VERSION, profiles: [] }
}

export function findProfile(store: ProfileStore, name: string): Profile | undefined {
  return store.profiles.find((p) => p.name === name)
}

const assertName = (name: string) => {
  if (name === '') throw new Error('プロファイルの名前が空')
}

/** プロファイルを作る（data は複製）。ストアが拒否されているときの、ファイルだけへの書き出しにも使う（判断ポイント44） */
export function makeProfile(name: string, data: SongData, now: Date): Profile {
  assertName(name)
  return { name, updatedAt: formatTimestamp(now), data: clone(data) }
}

/**
 * プロファイルを保存する。同じ名前があれば上書きし（位置は保つ）、なければ末尾に加える（名前は一意。§4-1）。
 * 上書きの確認は呼び出し側（UI）が行う
 */
export function saveProfile(
  store: ProfileStore,
  name: string,
  data: SongData,
  now: Date,
): ProfileStore {
  const profile = makeProfile(name, data, now)
  const i = store.profiles.findIndex((p) => p.name === name)
  const profiles = [...store.profiles]
  if (i >= 0) profiles[i] = profile
  else profiles.push(profile)
  return { ...store, profiles }
}

export function deleteProfile(store: ProfileStore, name: string): ProfileStore {
  return { ...store, profiles: store.profiles.filter((p) => p.name !== name) }
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
  incoming: Profile
  /** ストアにある、同じ名前のプロファイル */
  existing: Profile
  /** 「別名で追加」の候補名（ストアにも、まだ取り込んでいないファイルの名前にもない） */
  suggestedName: string
}

export interface ImportSummary {
  store: ProfileStore
  added: string[]
  overwritten: string[]
  skipped: string[]
}

/**
 * 取り込みの「追加」（§4-3）。ファイルのプロファイルを、ファイルの順にストアへ加える。
 * 名前が衝突するたびに resolve を呼ぶ（「残りすべてに適用」は、呼び出し側が resolve の中で覚える）。
 * 取り込むプロファイルは、ファイルの値のまま（updatedAt も。U3 の決定 I7）
 */
export function importAdd(
  store: ProfileStore,
  file: ExportFile,
  resolve: (conflict: NameConflict) => ConflictResolution,
): ImportSummary {
  const profiles = [...store.profiles]
  const summary = { added: [] as string[], overwritten: [] as string[], skipped: [] as string[] }
  file.profiles.forEach((incoming, i) => {
    const existingIndex = profiles.findIndex((p) => p.name === incoming.name)
    if (existingIndex < 0) {
      profiles.push(clone(incoming))
      summary.added.push(incoming.name)
      return
    }
    const later = file.profiles.slice(i + 1).map((p) => p.name)
    const taken = new Set([...profiles.map((p) => p.name), ...later])
    const r = resolve({
      incoming,
      existing: profiles[existingIndex]!,
      suggestedName: suggestName(incoming.name, taken),
    })
    if (r.action === 'skip') {
      summary.skipped.push(incoming.name)
    } else if (r.action === 'overwrite') {
      profiles[existingIndex] = clone(incoming)
      summary.overwritten.push(incoming.name)
    } else {
      assertName(r.name)
      if (profiles.some((p) => p.name === r.name))
        throw new Error(`別名がストアの名前と重複している: ${r.name}`)
      profiles.push({ ...clone(incoming), name: r.name })
      summary.added.push(r.name)
    }
  })
  return { store: { ...store, profiles }, ...summary }
}

/** 取り込みの「置換」（§4-3）。ストアの内容を、ファイルの内容で入れ替える。自動保存には触れない */
export function importReplace(file: ExportFile): ProfileStore {
  return { schemaVersion: SUPPORTED_SCHEMA_VERSION, profiles: clone(file.profiles) }
}

/** エクスポートファイルを組み立てる（§4-2）。単一は1件、一括は N 件。ファイルは1件以上 */
export function buildExportFile(profiles: readonly Profile[], now: Date): ExportFile {
  if (profiles.length === 0) throw new Error('書き出すプロファイルがない')
  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    exportType: 'profiles',
    exportedAt: formatTimestamp(now),
    profiles: clone([...profiles]),
  }
}

/** 保存データの文字列（JSON。UTF-8。DP-07）。仕様の例と同じく2字下げ */
export function toJsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}
