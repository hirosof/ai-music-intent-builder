// ストアの操作・取り込み（追加・置換）・書き出し・日時・ファイル名。
// 版2（判断ポイント68）: プロファイルは id で特定し、名前は同じフォルダの中で一意。id は決まった値を返す関数で作る
import { describe, it, expect } from 'vitest'

import { factoryProfiles } from '@/data/factory'
import { exportFileName, sanitizeFileName } from '@/domain/storage/file-name'
import {
  buildExportFile,
  deleteProfile,
  emptyStore,
  findProfileById,
  findProfileByName,
  importAdd,
  importReplace,
  makeProfile,
  renameError,
  renameProfile,
  saveProfile,
  selectFromFile,
  suggestName,
  withAncestors,
  type ConflictResolution,
  type NameConflict,
} from '@/domain/storage/profiles'
import { formatTimestamp } from '@/domain/storage/timestamp'
import type { ExportFile, Folder, Profile, ProfileStore, UserProfile } from '@/domain/types/song'

const NOW = new Date('2026-10-19T01:23:45Z')
const LATER = new Date('2026-10-20T00:00:00Z')
const [f1, f2, f3] = factoryProfiles as [Profile, Profile, Profile]
/** id1, id2, … を順に返す */
const ids = (prefix = 'id') => {
  let n = 0
  return () => `${prefix}${++n}`
}
const user = (p: Profile, id: string, folderId: string | null = null): UserProfile => ({
  ...p,
  id,
  folderId,
})
const fileOf = (...ps: Profile[]): ExportFile =>
  buildExportFile(
    ps.map((p, i) => user(p, `file${i + 1}`)),
    NOW,
  )
const storeOf = (...ps: [string, Profile][]): ProfileStore => {
  const newId = ids('s')
  return ps.reduce(
    (s, [name, p]) => saveProfile(s, null, name, p.data, NOW, newId).store,
    emptyStore(),
  )
}
const folder = (id: string, name: string, parentId: string | null = null): Folder => ({
  id,
  parentId,
  name,
})

describe('ストアの操作', () => {
  it('空のストアは版2で、フォルダもプロファイルもない', () => {
    expect(emptyStore()).toEqual({ schemaVersion: 2, folders: [], profiles: [] })
  })

  it('保存: 新しい名前は新しい id で末尾に加え、同じフォルダの同じ名前は id と位置を保って上書きする', () => {
    const newId = ids()
    let s = saveProfile(emptyStore(), null, 'a', f1.data, NOW, newId).store
    s = saveProfile(s, null, 'b', f2.data, NOW, newId).store
    const r = saveProfile(s, null, 'a', f3.data, LATER, newId)
    expect(r.id).toBe('id1')
    s = r.store
    expect(s.profiles.map((p) => [p.id, p.name])).toEqual([
      ['id1', 'a'],
      ['id2', 'b'],
    ])
    expect(s.profiles[0]!.data).toEqual(f3.data)
    expect(s.profiles[0]!.updatedAt).toBe(formatTimestamp(LATER))
    const c = saveProfile(s, null, 'c', f1.data, NOW, newId)
    expect(c.id).toBe('id3')
    expect(c.store.profiles.map((p) => p.name)).toEqual(['a', 'b', 'c'])
  })

  it('保存: 別のフォルダなら同じ名前でも別のプロファイル（判断ポイント68）', () => {
    const newId = ids()
    const s0 = { ...emptyStore(), folders: [folder('g', 'ゲーム')] }
    const s1 = saveProfile(s0, null, '曲', f1.data, NOW, newId).store
    const s2 = saveProfile(s1, 'g', '曲', f2.data, NOW, newId).store
    expect(s2.profiles.map((p) => [p.id, p.folderId, p.name])).toEqual([
      ['id1', null, '曲'],
      ['id2', 'g', '曲'],
    ])
    expect(findProfileByName(s2, 'g', '曲')?.data).toEqual(f2.data)
    expect(findProfileByName(s2, null, '曲')?.data).toEqual(f1.data)
  })

  it('保存: 引数を書き換えず、data は複製して持つ', () => {
    const s0 = emptyStore()
    const data = structuredClone(f1.data)
    const s1 = saveProfile(s0, null, 'a', data, NOW).store
    expect(s0.profiles).toEqual([])
    data.requests[0]!.toolVersion = 'changed'
    expect(s1.profiles[0]!.data.requests[0]!.toolVersion).toBe('v6')
  })

  it('保存: 空の名前は受け付けない。id は既定で UUID', () => {
    expect(() => saveProfile(emptyStore(), null, '', f1.data, NOW)).toThrow(
      'プロファイルの名前が空',
    )
    expect(makeProfile('a', f1.data, NOW).id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('削除と検索（id で）', () => {
    const s0 = storeOf(['a', f1], ['b', f2])
    const s = deleteProfile(s0, 's1')
    expect(s.profiles.map((p) => p.name)).toEqual(['b'])
    expect(findProfileById(s, 's1')).toBeUndefined()
    expect(findProfileById(s, 's2')?.data).toEqual(f2.data)
  })
})

describe('候補名', () => {
  it('名前（2）から、使われていない最初の番号', () => {
    expect(suggestName('曲', new Set(['曲']))).toBe('曲（2）')
    expect(suggestName('曲', new Set(['曲', '曲（2）', '曲（3）']))).toBe('曲（4）')
  })
})

describe('取り込みの「追加」', () => {
  it('衝突がなければ、ファイルの順に末尾へ新しい id で加え、resolve を呼ばない', async () => {
    const r = await importAdd(
      storeOf(['x', f1]),
      fileOf(f2, f3),
      () => {
        throw new Error('呼ばれない')
      },
      ids('n'),
    )
    expect(r.store.profiles.map((p) => p.name)).toEqual(['x', f2.name, f3.name])
    expect(r.added).toEqual([f2.name, f3.name])
    expect(r.storedIds).toEqual(['n1', 'n2'])
    // ファイルの値のまま（updatedAt も）。id は振り直し、ルートに入れる
    expect(r.store.profiles[1]).toEqual(user(f2, 'n1'))
  })

  it('上書き・別名・取り込まない、の3つの操作（答えを待つ）。上書きは元の id と位置を保つ', async () => {
    const store = storeOf([f1.name, f3], [f2.name, f3], [f3.name, f1])
    const decisions: Record<string, ConflictResolution> = {
      [f1.name]: { action: 'overwrite' },
      [f2.name]: { action: 'rename', name: '別名' },
      [f3.name]: { action: 'skip' },
    }
    const seen: NameConflict[] = []
    const r = await importAdd(
      store,
      fileOf(f1, f2, f3),
      async (c) => {
        seen.push(c)
        await Promise.resolve()
        return decisions[c.incoming.name]!
      },
      ids('n'),
    )
    expect(seen.map((c) => c.incoming.name)).toEqual([f1.name, f2.name, f3.name])
    expect(seen[0]!.existing.data).toEqual(f3.data)
    expect(r.store.profiles.map((p) => p.name)).toEqual([f1.name, f2.name, f3.name, '別名'])
    expect(r.store.profiles[0]).toEqual(user(f1, 's1'))
    expect(r.store.profiles[2]!.data).toEqual(f1.data)
    expect(r.store.profiles[3]).toEqual({ ...user(f2, 'n1'), name: '別名' })
    expect(r).toMatchObject({
      added: ['別名'],
      overwritten: [f1.name],
      skipped: [f3.name],
      storedIds: ['s1', 'n1'],
    })
    // 元のストアは変わらない
    expect(store.profiles[0]!.data).toEqual(f3.data)
  })

  it('衝突はルートの中で判定する（別のフォルダの同じ名前は衝突しない）', async () => {
    const s0: ProfileStore = {
      ...emptyStore(),
      folders: [folder('g', 'ゲーム')],
      profiles: [user(f1, 'old', 'g')],
    }
    const r = await importAdd(
      s0,
      fileOf(f1),
      () => {
        throw new Error('呼ばれない')
      },
      ids('n'),
    )
    expect(r.store.profiles.map((p) => [p.id, p.folderId])).toEqual([
      ['old', 'g'],
      ['n1', null],
    ])
  })

  it('候補名は、ストアにも、まだ取り込んでいないファイルの名前にもない', async () => {
    const incoming = [f1, { ...f2, name: `${f1.name}（2）` }]
    let suggested = ''
    await importAdd(storeOf([f1.name, f1]), fileOf(...incoming), (c) => {
      if (c.incoming.name === f1.name) suggested = c.suggestedName
      return { action: 'skip' }
    })
    expect(suggested).toBe(`${f1.name}（3）`)
  })

  it('別名がストアの名前と重なる・空のときは失敗する', async () => {
    const store = storeOf([f1.name, f1], ['使用中', f2])
    await expect(
      importAdd(store, fileOf(f1), () => ({ action: 'rename', name: '使用中' })),
    ).rejects.toThrow('別名がストアの名前と重複している')
    await expect(
      importAdd(store, fileOf(f1), () => ({ action: 'rename', name: '' })),
    ).rejects.toThrow('プロファイルの名前が空')
  })
})

describe('取り込みの「置換」と書き出し', () => {
  it('置換は、ストアをファイルの内容で入れ替え、id を振り直す', () => {
    const s = importReplace(fileOf(f2, f3), ids('n'))
    expect(s).toEqual({ schemaVersion: 2, folders: [], profiles: [user(f2, 'n1'), user(f3, 'n2')] })
  })

  it('置換は、フォルダの id と参照も振り直す（判断ポイント69）', () => {
    const file: ExportFile = {
      ...fileOf(f1),
      folders: [folder('a', 'A'), folder('b', 'B', 'a')],
      profiles: [user(f1, 'p', 'b')],
    }
    const s = importReplace(file, ids('n'))
    expect(s.folders).toEqual([folder('n1', 'A'), folder('n2', 'B', 'n1')])
    expect(s.profiles.map((p) => [p.id, p.folderId])).toEqual([['n3', 'n2']])
  })

  it('書き出しは版2・exportType: profiles で、1件以上', () => {
    const f = buildExportFile([user(f1, 'a')], NOW)
    expect(f).toEqual({
      schemaVersion: 2,
      exportType: 'profiles',
      exportedAt: formatTimestamp(NOW),
      folders: [],
      profiles: [user(f1, 'a')],
    })
    expect(() => buildExportFile([], NOW)).toThrow('書き出すプロファイルがない')
  })

  it('書き出しには、入れたプロファイルが属するフォルダ（祖先を含む）だけを入れる（判断ポイント69）', () => {
    const folders = [
      folder('a', 'A'),
      folder('b', 'B', 'a'),
      folder('c', 'C'),
      folder('d', 'D', 'b'),
    ]
    const f = buildExportFile([user(f1, 'p', 'b'), user(f2, 'q')], NOW, folders)
    expect(f.folders).toEqual([folder('a', 'A'), folder('b', 'B', 'a')])
    expect(withAncestors(folders, ['d', null])).toEqual([
      folder('a', 'A'),
      folder('b', 'B', 'a'),
      folder('d', 'D', 'b'),
    ])
  })
})

describe('日時', () => {
  it('時差付きの ISO 8601（スキーマの pattern に合う）', () => {
    expect(formatTimestamp(NOW, 540)).toBe('2026-10-19T10:23:45+09:00')
    expect(formatTimestamp(NOW, 0)).toBe('2026-10-19T01:23:45+00:00')
    expect(formatTimestamp(NOW, -330)).toBe('2026-10-18T19:53:45-05:30')
    const local = formatTimestamp(NOW)
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
    expect(Date.parse(local)).toBe(NOW.getTime())
  })
})

describe('ファイル名', () => {
  it('Windows で使えない文字を置き換え、末尾の点・空白を除く', () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j')
    expect(sanitizeFileName('曲. .')).toBe('曲')
  })

  it('1件はプロファイル名、一括と、名前が残らないときは日時入りの固定名', () => {
    const at = new Date(2026, 9, 19, 8, 5)
    expect(exportFileName([f1], at)).toBe(`${f1.name}.json`)
    expect(exportFileName([f1, f2], at)).toBe('ai-music-intent-builder-profiles-20261019-0805.json')
    expect(exportFileName([{ ...f1, name: '..' }], at)).toBe(
      'ai-music-intent-builder-profiles-20261019-0805.json',
    )
  })
})

describe('名前の変更（判断ポイント66）', () => {
  it('名前だけを変え、中身・id・更新日時・並びの位置は変えない。引数は書き換えない', () => {
    const s0 = saveProfile(
      storeOf(['a', f1], ['b', f2]),
      null,
      'c',
      f3.data,
      LATER,
      () => 's3',
    ).store
    const before = JSON.stringify(s0)
    const s1 = renameProfile(s0, 's2', 'B2')
    expect(s1.profiles.map((p) => [p.id, p.name])).toEqual([
      ['s1', 'a'],
      ['s2', 'B2'],
      ['s3', 'c'],
    ])
    expect(s1.profiles[1]!.data).toEqual(f2.data)
    expect(s1.profiles[1]!.updatedAt).toBe(s0.profiles[1]!.updatedAt)
    expect(s1.profiles[1]!.data).not.toBe(s0.profiles[1]!.data)
    expect(JSON.stringify(s0)).toBe(before)
  })

  it('一意: 空・同じフォルダのほかと同じ名前は使えない。今と同じ名前は何もしない', () => {
    const s0 = storeOf(['a', f1], ['b', f2])
    expect(renameError(s0, 's1', '')).toBe('名前を入力してください')
    expect(renameError(s0, 's1', 'b')).toBe('その名前はすでにあります')
    expect(renameError(s0, 's1', 'a')).toBeNull()
    expect(renameError(s0, 's1', 'z')).toBeNull()
    expect(() => renameProfile(s0, 's1', 'b')).toThrow('すでにあります')
    expect(() => renameProfile(s0, 's1', '')).toThrow('名前を入力')
    expect(() => renameProfile(s0, 'x', 'y')).toThrow('プロファイルがない')
    expect(renameProfile(s0, 's1', 'a')).toBe(s0)
  })

  it('一意は同じフォルダの中で見る（別のフォルダの同じ名前にはできる）', () => {
    const s0: ProfileStore = {
      ...emptyStore(),
      folders: [folder('g', 'ゲーム')],
      profiles: [user({ ...f1, name: 'a' }, 'p1'), user({ ...f2, name: 'b' }, 'p2', 'g')],
    }
    expect(renameError(s0, 'p1', 'b')).toBeNull()
    expect(renameProfile(s0, 'p1', 'b').profiles.map((p) => p.name)).toEqual(['b', 'b'])
  })
})

describe('取り込むプロファイルの選択（判断ポイント65）', () => {
  it('選んだ位置のものだけを、ファイルの順に残す。ほかのキーは変えない', () => {
    const file = fileOf({ ...f1, name: 'x' }, { ...f2, name: 'y' }, { ...f3, name: 'z' })
    const sub = selectFromFile(file, new Set([2, 0]))
    expect(sub.profiles.map((p) => p.name)).toEqual(['x', 'z'])
    expect(sub.exportedAt).toBe(file.exportedAt)
    expect(selectFromFile(file, new Set()).profiles).toEqual([])
    expect(file.profiles).toHaveLength(3)
  })

  it('フォルダは、選んだプロファイルが属するもの（祖先を含む）だけを残す', () => {
    const file: ExportFile = {
      ...fileOf(f1),
      folders: [folder('a', 'A'), folder('b', 'B', 'a'), folder('c', 'C')],
      profiles: [user(f1, 'p', 'b'), user(f2, 'q', 'c')],
    }
    expect(selectFromFile(file, new Set([0])).folders.map((f) => f.id)).toEqual(['a', 'b'])
  })

  it('選んだものだけで置換・追加する', async () => {
    const file = fileOf({ ...f1, name: 'x' }, { ...f2, name: 'y' })
    expect(importReplace(selectFromFile(file, new Set([1]))).profiles.map((p) => p.name)).toEqual([
      'y',
    ])
    const r = await importAdd(storeOf(['a', f1]), selectFromFile(file, new Set([0])), () => ({
      action: 'skip',
    }))
    expect(r.store.profiles.map((p) => p.name)).toEqual(['a', 'x'])
  })
})
