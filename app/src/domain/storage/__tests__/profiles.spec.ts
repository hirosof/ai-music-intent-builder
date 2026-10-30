// ストアの操作・取り込み（追加・置換）・書き出し・日時・ファイル名
import { describe, it, expect } from 'vitest'

import { factoryProfiles } from '@/data/factory'
import { exportFileName, sanitizeFileName } from '@/domain/storage/file-name'
import {
  buildExportFile,
  deleteProfile,
  emptyStore,
  findProfile,
  importAdd,
  importReplace,
  renameError,
  renameProfile,
  saveProfile,
  selectFromFile,
  suggestName,
  type ConflictResolution,
  type NameConflict,
} from '@/domain/storage/profiles'
import { formatTimestamp } from '@/domain/storage/timestamp'
import type { ExportFile, Profile, ProfileStore } from '@/domain/types/song'

const NOW = new Date('2026-10-19T01:23:45Z')
const LATER = new Date('2026-10-20T00:00:00Z')
const [f1, f2, f3] = factoryProfiles as [Profile, Profile, Profile]
const fileOf = (...ps: Profile[]): ExportFile => buildExportFile(ps, NOW)
const storeOf = (...ps: [string, Profile][]): ProfileStore =>
  ps.reduce((s, [name, p]) => saveProfile(s, name, p.data, NOW), emptyStore())

describe('ストアの操作', () => {
  it('保存: 新しい名前は末尾に加え、同じ名前は位置を保って上書きする', () => {
    let s = storeOf(['a', f1], ['b', f2])
    s = saveProfile(s, 'a', f3.data, LATER)
    expect(s.profiles.map((p) => p.name)).toEqual(['a', 'b'])
    expect(s.profiles[0]!.data).toEqual(f3.data)
    expect(s.profiles[0]!.updatedAt).toBe(formatTimestamp(LATER))
    s = saveProfile(s, 'c', f1.data, NOW)
    expect(s.profiles.map((p) => p.name)).toEqual(['a', 'b', 'c'])
  })

  it('保存: 引数を書き換えず、data は複製して持つ', () => {
    const s0 = emptyStore()
    const data = structuredClone(f1.data)
    const s1 = saveProfile(s0, 'a', data, NOW)
    expect(s0.profiles).toEqual([])
    data.requests[0]!.toolVersion = 'changed'
    expect(s1.profiles[0]!.data.requests[0]!.toolVersion).toBe('v6')
  })

  it('保存: 空の名前は受け付けない', () => {
    expect(() => saveProfile(emptyStore(), '', f1.data, NOW)).toThrow('プロファイルの名前が空')
  })

  it('削除と検索', () => {
    const s = deleteProfile(storeOf(['a', f1], ['b', f2]), 'a')
    expect(s.profiles.map((p) => p.name)).toEqual(['b'])
    expect(findProfile(s, 'a')).toBeUndefined()
    expect(findProfile(s, 'b')?.data).toEqual(f2.data)
  })
})

describe('候補名', () => {
  it('名前（2）から、使われていない最初の番号', () => {
    expect(suggestName('曲', new Set(['曲']))).toBe('曲（2）')
    expect(suggestName('曲', new Set(['曲', '曲（2）', '曲（3）']))).toBe('曲（4）')
  })
})

describe('取り込みの「追加」', () => {
  it('衝突がなければ、ファイルの順に末尾へ加え、resolve を呼ばない', async () => {
    const r = await importAdd(storeOf(['x', f1]), fileOf(f2, f3), () => {
      throw new Error('呼ばれない')
    })
    expect(r.store.profiles.map((p) => p.name)).toEqual(['x', f2.name, f3.name])
    expect(r.added).toEqual([f2.name, f3.name])
    // ファイルの値のまま（updatedAt も）
    expect(r.store.profiles[1]).toEqual(f2)
  })

  it('上書き・別名・取り込まない、の3つの操作（答えを待つ）', async () => {
    const store = storeOf([f1.name, f3], [f2.name, f3], [f3.name, f1])
    const decisions: Record<string, ConflictResolution> = {
      [f1.name]: { action: 'overwrite' },
      [f2.name]: { action: 'rename', name: '別名' },
      [f3.name]: { action: 'skip' },
    }
    const seen: NameConflict[] = []
    const r = await importAdd(store, fileOf(f1, f2, f3), async (c) => {
      seen.push(c)
      await Promise.resolve()
      return decisions[c.incoming.name]!
    })
    expect(seen.map((c) => c.incoming.name)).toEqual([f1.name, f2.name, f3.name])
    expect(seen[0]!.existing.data).toEqual(f3.data)
    expect(r.store.profiles.map((p) => p.name)).toEqual([f1.name, f2.name, f3.name, '別名'])
    expect(r.store.profiles[0]).toEqual(f1)
    expect(r.store.profiles[2]!.data).toEqual(f1.data)
    expect(r.store.profiles[3]).toEqual({ ...f2, name: '別名' })
    expect(r).toMatchObject({ added: ['別名'], overwritten: [f1.name], skipped: [f3.name] })
    // 元のストアは変わらない
    expect(store.profiles[0]!.data).toEqual(f3.data)
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
  it('置換は、ストアをファイルの内容で入れ替える', () => {
    const s = importReplace(fileOf(f2, f3))
    expect(s).toEqual({ schemaVersion: 1, profiles: [f2, f3] })
  })

  it('書き出しは exportType: profiles で、1件以上', () => {
    const f = buildExportFile([f1], NOW)
    expect(f).toEqual({
      schemaVersion: 1,
      exportType: 'profiles',
      exportedAt: formatTimestamp(NOW),
      profiles: [f1],
    })
    expect(() => buildExportFile([], NOW)).toThrow('書き出すプロファイルがない')
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
  it('名前だけを変え、中身・更新日時・並びの位置は変えない。引数は書き換えない', () => {
    const s0 = saveProfile(storeOf(['a', f1], ['b', f2]), 'c', f3.data, LATER)
    const before = JSON.stringify(s0)
    const s1 = renameProfile(s0, 'b', 'B2')
    expect(s1.profiles.map((p) => p.name)).toEqual(['a', 'B2', 'c'])
    expect(s1.profiles[1]!.data).toEqual(f2.data)
    expect(s1.profiles[1]!.updatedAt).toBe(s0.profiles[1]!.updatedAt)
    expect(s1.profiles[1]!.data).not.toBe(s0.profiles[1]!.data)
    expect(JSON.stringify(s0)).toBe(before)
  })

  it('一意: 空・ほかと同じ名前は使えない。今と同じ名前は何もしない', () => {
    const s0 = storeOf(['a', f1], ['b', f2])
    expect(renameError(s0, 'a', '')).toBe('名前を入力してください')
    expect(renameError(s0, 'a', 'b')).toBe('その名前はすでにあります')
    expect(renameError(s0, 'a', 'a')).toBeNull()
    expect(renameError(s0, 'a', 'z')).toBeNull()
    expect(() => renameProfile(s0, 'a', 'b')).toThrow('すでにあります')
    expect(() => renameProfile(s0, 'a', '')).toThrow('名前を入力')
    expect(() => renameProfile(s0, 'x', 'y')).toThrow('プロファイルがない')
    expect(renameProfile(s0, 'a', 'a')).toBe(s0)
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
