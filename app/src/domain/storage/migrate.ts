// ストア／エクスポートファイル（外側の形）の版の移行（song-file.md §6-2 の 2「n→n+1 を1段ずつ」）。
// 楽曲データの版（自動保存・プロファイルの data）は別で、まだ移行がない。
// 参照実装は design/v0/tools/check-fields/check_fields.py の migrate_container（検証と同じ規則で移行する）

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
