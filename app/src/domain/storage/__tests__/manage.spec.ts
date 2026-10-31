// プロファイル管理の操作（判断ポイント67）: フォルダの作成・名前の変更、移動・削除、選択の展開、検索
import { describe, it, expect } from 'vitest'

import { factoryProfiles } from '@/data/factory'
import {
  createFolder,
  deleteItems,
  deletionCounts,
  expandSelection,
  folderNameError,
  moveErrors,
  moveItems,
  renameFolder,
  searchAll,
  unmovableTargets,
} from '@/domain/storage/manage'
import { emptyStore } from '@/domain/storage/profiles'
import type { Folder, ProfileStore, UserProfile } from '@/domain/types/song'

const d = factoryProfiles[0]!.data
const f = (id: string, name: string, parentId: string | null = null): Folder => ({
  id,
  parentId,
  name,
})
const p = (id: string, name: string, folderId: string | null = null): UserProfile => ({
  id,
  name,
  folderId,
  updatedAt: '2026-10-01T00:00:00+09:00',
  data: d,
})
// ゲーム ＞ ボス戦（第1形態）、ゲーム（村）、作業用（空）、ルート（曲）
const store = (): ProfileStore => ({
  ...emptyStore(),
  folders: [f('g', 'ゲーム'), f('b', 'ボス戦', 'g'), f('w', '作業用')],
  profiles: [p('p1', '第1形態', 'b'), p('p2', '村', 'g'), p('p3', '曲')],
})
const none = { folderIds: [], profileIds: [] }

describe('フォルダの作成・名前の変更', () => {
  it('名前は同じ親の中で一意。空白だけは不可。自分の今の名前は使える', () => {
    const s = store()
    expect(folderNameError(s, null, ' ')).toBe('名前を入力してください')
    expect(folderNameError(s, null, 'ゲーム')).toBe('その名前はすでにあります')
    expect(folderNameError(s, 'g', 'ゲーム')).toBeNull()
    expect(folderNameError(s, null, 'ゲーム', 'g')).toBeNull()
  })

  it('作ったフォルダは親の中に入り、新しい id を持つ。引数は変えない', () => {
    const s = store()
    const r = createFolder(s, 'g', '村の外', () => 'n1')
    expect(r.id).toBe('n1')
    expect(r.store.folders[r.store.folders.length - 1]).toEqual(f('n1', '村の外', 'g'))
    expect(s.folders).toHaveLength(3)
    expect(() => createFolder(s, 'g', 'ボス戦')).toThrow('すでにあります')
  })

  it('名前の変更は名前だけ（中身・親は変えない）。同じ名前ならそのまま', () => {
    const s = store()
    const r = renameFolder(s, 'g', 'ゲーム曲')
    expect(r.folders.find((x) => x.id === 'g')).toEqual(f('g', 'ゲーム曲'))
    expect(r.profiles).toEqual(s.profiles)
    expect(renameFolder(s, 'g', 'ゲーム')).toBe(s)
    expect(() => renameFolder(s, 'g', '作業用')).toThrow('すでにあります')
    expect(() => renameFolder(s, 'x', 'a')).toThrow('フォルダがない')
  })
})

describe('選択の展開・削除', () => {
  it('フォルダを選ぶと、配下のフォルダと中のプロファイルすべてが対象', () => {
    const e = expandSelection(store(), { folderIds: ['g'], profileIds: ['p3'] })
    expect([...e.folderIds].sort()).toEqual(['b', 'g'])
    expect(e.profiles.map((x) => x.id)).toEqual(['p1', 'p2', 'p3'])
    expect(deletionCounts(store(), { folderIds: ['g'], profileIds: [] })).toEqual({
      folders: 2,
      profiles: 2,
    })
    expect(deletionCounts(store(), { folderIds: ['w'], profileIds: [] })).toEqual({
      folders: 1,
      profiles: 0,
    })
  })

  it('削除は中身ごと。選んでいないものは残す', () => {
    const r = deleteItems(store(), { folderIds: ['b'], profileIds: ['p3'] })
    expect(r.folders.map((x) => x.id)).toEqual(['g', 'w'])
    expect(r.profiles.map((x) => x.id)).toEqual(['p2'])
    expect(deleteItems(store(), none)).toEqual(store())
  })
})

describe('移動', () => {
  it('フォルダは自分自身・配下に移せない（選べない先）', () => {
    const s = store()
    expect([...unmovableTargets(s, { folderIds: ['g'], profileIds: [] })].sort()).toEqual([
      'b',
      'g',
    ])
    expect(moveErrors(s, { folderIds: ['g'], profileIds: [] }, 'b')).toContain(
      'フォルダを、自分自身やその中には移動できません',
    )
    expect(moveErrors(s, { folderIds: ['g'], profileIds: [] }, 'g')).toHaveLength(1)
  })

  it('移動先に同じ名前があれば移せない（移動するもの同士の重なりも見る）', () => {
    const s: ProfileStore = {
      ...store(),
      profiles: [...store().profiles, p('p4', '村'), p('p5', '曲', 'w')],
    }
    expect(moveErrors(s, { folderIds: [], profileIds: ['p4'] }, 'g')).toEqual([
      '「ルート ＞ ゲーム」に、同じ名前のプロファイル「村」があります',
    ])
    // ルートの曲と作業用の曲を、ほかのフォルダへ一緒に移す
    expect(moveErrors(s, { folderIds: [], profileIds: ['p3', 'p5'] }, 'b')).toEqual([
      '「ルート ＞ ゲーム ＞ ボス戦」に、同じ名前のプロファイル「曲」があります',
    ])
    const withSibling: ProfileStore = { ...s, folders: [...s.folders, f('x', 'ボス戦', 'w')] }
    expect(moveErrors(withSibling, { folderIds: ['x'], profileIds: [] }, 'g')).toEqual([
      '「ルート ＞ ゲーム」に、同じ名前のフォルダ「ボス戦」があります',
    ])
    // 自分が今いる場所への移動は、自分とは重ならない
    expect(moveErrors(s, { folderIds: ['b'], profileIds: ['p2'] }, 'g')).toEqual([])
  })

  it('移動はフォルダの親・プロファイルの所属だけを変える（id・名前・更新日時は変えない）', () => {
    const s = store()
    const r = moveItems(s, { folderIds: ['b'], profileIds: ['p3'] }, 'w')
    expect(r.folders.find((x) => x.id === 'b')).toEqual(f('b', 'ボス戦', 'w'))
    expect(r.profiles.find((x) => x.id === 'p3')).toEqual(p('p3', '曲', 'w'))
    expect(r.profiles.find((x) => x.id === 'p1')).toEqual(p('p1', '第1形態', 'b'))
    expect(() => moveItems(s, { folderIds: ['g'], profileIds: [] }, 'b')).toThrow('移動できません')
  })
})

describe('検索', () => {
  it('全フォルダから、名前に検索語を含むフォルダとプロファイル（表記の揺れはそろえる）。パスは入っている場所', () => {
    const hits = searchAll(store(), 'ぼす')
    expect(hits.map((h) => [h.kind, h.path])).toEqual([['folder', 'ルート ＞ ゲーム']])
    expect(searchAll(store(), '形態').map((h) => [h.kind, h.path])).toEqual([
      ['profile', 'ルート ＞ ゲーム ＞ ボス戦'],
    ])
    expect(searchAll(store(), '  ')).toEqual([])
  })
})
