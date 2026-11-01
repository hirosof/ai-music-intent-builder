// 保存データの版の移行（song-file.md §6-2 の 2「n→n+1 を1段ずつ」）。
// ストア／エクスポートファイル（外側の形）と、楽曲データ（自動保存・プロファイルの data）は、版も移行も別々。
// 参照実装は design/v0/tools/check-fields/check_fields.py の migrate_container・migrate_song_1_to_2（検証と同じ規則で移行する）
import { defaultSung, type Spec } from '../spec'

/** ストア／エクスポートファイルの、このアプリが読み書きする版（版2。判断ポイント68） */
export const STORE_SCHEMA_VERSION = 2

/** 新しい id を作る関数。テストでは決まった値を返すものに替える */
export type NewId = () => string

/** id は UUID で作る（判断ポイント68。検査は形式を縛らない） */
export const randomId: NewId = () => crypto.randomUUID()

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)

/** 版1 → 2: 各プロファイルに新しい id、folderId を null、folders を空にする（song-file.md §4-2）。引数は書き換えない */
function migrate1to2(obj: Obj, newId: NewId): Obj {
  const out: Obj = { ...obj, schemaVersion: 2, folders: [] }
  if (Array.isArray(obj.profiles))
    out.profiles = obj.profiles.map((p: unknown) =>
      isObj(p) ? { ...p, id: newId(), folderId: null } : p,
    )
  return out
}

/** 版 n → n+1 の移行。ここにない段がある古い版は読めない（F8） */
export const CONTAINER_MIGRATIONS: Readonly<Record<number, (obj: Obj, newId: NewId) => Obj>> = {
  1: migrate1to2,
}

/** 古い版から今の版まで、各段の移行がそろっているか */
export function canMigrateContainer(version: number): boolean {
  for (let n = version; n < STORE_SCHEMA_VERSION; n++) if (!CONTAINER_MIGRATIONS[n]) return false
  return true
}

/** ストア／エクスポートファイルを今の版まで移行する。版は検証（F8）で確かめておくこと */
export function migrateContainer(obj: Obj, newId: NewId = randomId): Obj {
  let cur = obj
  while ((cur.schemaVersion as number) < STORE_SCHEMA_VERSION)
    cur = CONTAINER_MIGRATIONS[cur.schemaVersion as number]!(cur, newId)
  return cur
}

// ---------------------------------------------------------------------------
// 楽曲データ
// ---------------------------------------------------------------------------

/** 楽曲データの、このアプリが読み書きする版（版2。UI 判断ポイント73） */
export const SONG_SCHEMA_VERSION = 2

const has = (o: Obj, k: string) => Object.prototype.hasOwnProperty.call(o, k)

/** 版1 の構成の項目（語彙の id の配列）を、要素の配列にする。状態はそのまま（規則 (4)）。形が崩れた値は S4 に任せる */
function migrateStructureV1(axis: unknown, toElement: (id: string) => Obj): unknown {
  if (!isObj(axis) || !Array.isArray(axis.value)) return axis
  return {
    ...axis,
    value: axis.value.map((x: unknown) => (typeof x === 'string' ? toElement(x) : x)),
  }
}

/** 依頼1件の axes を版2 にする（UI 判断ポイント73 の規則 (1)〜(4)。song-file.md §6-5） */
function migrateRequest1to2(req: unknown, spec: Spec): unknown {
  const axes = isObj(req) ? req.axes : undefined
  if (!isObj(req) || !isObj(axes) || !(has(axes, 'structure') || has(axes, 'lyricsStructure')))
    return req
  const { lyricsStructure, ...out } = axes
  const useVocal =
    has(axes, 'lyricsStructure') && (!has(axes, 'structure') || req.vocalMode === 'vocal')
  // (2) lyricsStructure は、各要素の sung を語彙の defaultSung から付ける（bridge は Cメロのまま）
  // (1) structure は sung なしの要素にし、bridge（つなぎ）を transition に付け替える
  out.structure = useVocal
    ? migrateStructureV1(lyricsStructure, (id) => ({ id, sung: defaultSung(spec, id) }))
    : migrateStructureV1(axes.structure, (id) => ({ id: id === 'bridge' ? 'transition' : id }))
  return { ...req, axes: out }
}

function migrateSong1to2(song: Obj, spec: Spec): Obj {
  const out: Obj = { ...song, schemaVersion: 2 }
  if (Array.isArray(song.requests))
    out.requests = song.requests.map((r: unknown) => migrateRequest1to2(r, spec))
  return out
}

/** 楽曲データの版 n → n+1 の移行。ここにない段がある古い版は読めない（F8） */
export const SONG_MIGRATIONS: Readonly<Record<number, (song: Obj, spec: Spec) => Obj>> = {
  1: migrateSong1to2,
}

/** 古い版から今の版まで、各段の移行がそろっているか */
export function canMigrateSong(version: number): boolean {
  for (let n = version; n < SONG_SCHEMA_VERSION; n++) if (!SONG_MIGRATIONS[n]) return false
  return true
}

/** 楽曲データを今の版まで移行する。版は検証（F8）で確かめておくこと。引数は書き換えない */
export function migrateSong(song: Obj, spec: Spec): Obj {
  let cur = song
  while ((cur.schemaVersion as number) < SONG_SCHEMA_VERSION)
    cur = SONG_MIGRATIONS[cur.schemaVersion as number]!(cur, spec)
  return cur
}

/** プロファイルの data のうち、古い版のものを移行する。変わらなければ同じ配列を返す */
export function migrateProfilesData(profiles: unknown[], spec: Spec): unknown[] {
  const old = (p: unknown) =>
    isObj(p) &&
    isObj(p.data) &&
    typeof p.data.schemaVersion === 'number' &&
    p.data.schemaVersion < SONG_SCHEMA_VERSION
  if (!profiles.some(old)) return profiles
  return profiles.map((p) =>
    old(p) ? { ...(p as Obj), data: migrateSong((p as Obj).data as Obj, spec) } : p,
  )
}
