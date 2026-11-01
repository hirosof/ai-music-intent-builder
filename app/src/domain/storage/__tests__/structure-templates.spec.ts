// 構成のひな型の純関数（song-file.md §13。UI 判断ポイント75）
import { describe, expect, it } from 'vitest'
import { spec } from '@/data/spec'
import { displaySections } from '@/domain/editor/display'
import { moveSectionTo } from '@/domain/editor/edit'
import {
  checkTemplateStore,
  deleteTemplate,
  emptyTemplateStore,
  findTemplateByName,
  loadTemplateStore,
  renameTemplate,
  saveTemplate,
  sectionsForTemplate,
  sectionsFromTemplate,
  TEMPLATE_SCHEMA_VERSION,
  templateRenameError,
  type StructureTemplateStore,
} from '../structure-templates'

const NOW = new Date('2026-11-02T01:00:00Z')
const template = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  name: '基本',
  updatedAt: '2026-11-02T10:00:00+09:00',
  sections: [{ id: 'intro', sung: false }, { id: 'chorus', sung: true }, { id: 'chorus' }],
  ...over,
})
const storeOf = (...templates: unknown[]) => ({ schemaVersion: 1, templates })
const errorsOf = (obj: unknown) => checkTemplateStore(spec, obj)

describe('読み込みの検査（§13-4）', () => {
  it('値がなければ空のストア', () => {
    expect(loadTemplateStore(spec, null)).toEqual({ ok: true, store: emptyTemplateStore() })
  })
  it('正しいストアは、そのまま読む（空の配列・同じ語の繰り返し・sung なしを含む）', () => {
    expect(errorsOf(storeOf())).toEqual([])
    const s = storeOf(template())
    expect(loadTemplateStore(spec, JSON.stringify(s))).toEqual({ ok: true, store: s })
  })
  it('JSON として読めなければ拒否', () => {
    expect(loadTemplateStore(spec, '{')).toEqual({ ok: false, errors: ['JSON として読めない'] })
  })
  it.each([
    ['新しい版', { schemaVersion: 2, templates: [] }, '新しい版'],
    ['版がない', { templates: [] }, '版がない'],
    ['版が文字列', { schemaVersion: '1', templates: [] }, '版がない'],
    ['版が小数', { schemaVersion: 1.5, templates: [] }, '版がない'],
    ['移行のない古い版', { schemaVersion: 0, templates: [] }, '移行が定義されていない版'],
  ])('%s は拒否', (_, obj, expected) => {
    const r = loadTemplateStore(spec, JSON.stringify(obj))
    expect(r.ok).toBe(false)
    expect(!r.ok && r.errors[0]).toContain(expected)
  })
  it('不明な語 id は拒否し、id を挙げる', () => {
    const e = errorsOf(storeOf(template({ sections: [{ id: 'no-such-term' }, { id: 'bad-2' }] })))
    expect(e).toHaveLength(2)
    expect(e[0]).toContain('不明な語 id: no-such-term')
    expect(e[1]).toContain('不明な語 id: bad-2')
  })
  it.each([
    ['最上位が配列', [], 'オブジェクトではない'],
    ['templates がない', { schemaVersion: 1 }, 'templates が配列ではない'],
    ['最上位の知らないキー', { schemaVersion: 1, templates: [], x: 1 }, '知らないキー: x'],
    ['要素が文字列', storeOf('x'), 'オブジェクトではない'],
    ['ひな型の知らないキー', storeOf(template({ folderId: null })), '知らないキー: folderId'],
    ['id が空', storeOf(template({ id: '' })), 'id が空でない文字列ではない'],
    ['id が数値', storeOf(template({ id: 1 })), 'id が空でない文字列ではない'],
    ['name が空白だけ', storeOf(template({ name: ' 　' })), 'name が、前後の空白を除いて空'],
    ['name が数値', storeOf(template({ name: 1 })), 'name が、前後の空白を除いて空'],
    ['日時の形が違う', storeOf(template({ updatedAt: '2026-11-02' })), 'updatedAt'],
    ['時差のない日時', storeOf(template({ updatedAt: '2026-11-02T10:00:00' })), 'updatedAt'],
    ['sections が空', storeOf(template({ sections: [] })), 'sections が空でない配列ではない'],
    [
      'sections がない',
      storeOf(template({ sections: undefined })),
      'sections が空でない配列ではない',
    ],
    [
      '要素が文字列（版1 の形）',
      storeOf(template({ sections: ['intro'] })),
      'オブジェクトではない',
    ],
    [
      '要素の知らないキー',
      storeOf(template({ sections: [{ id: 'intro', x: 1 }] })),
      '知らないキー: x',
    ],
    ['要素の id が数値', storeOf(template({ sections: [{ id: 1 }] })), 'id が文字列ではない'],
    [
      'sung が文字列',
      storeOf(template({ sections: [{ id: 'intro', sung: 'no' }] })),
      'sung が真偽ではない',
    ],
  ])('%s は拒否', (_, obj, expected) => {
    expect(errorsOf(obj).join('\n')).toContain(expected)
  })
  it('id と名前は一意（名前はそのまま比べる。前後の空白が違えば別の名前）', () => {
    expect(errorsOf(storeOf(template(), template({ name: '別' })))[0]).toContain('id が重複: t1')
    expect(errorsOf(storeOf(template(), template({ id: 't2' })))[0]).toContain('name が重複: 基本')
    expect(errorsOf(storeOf(template(), template({ id: 't2', name: '基本 ' })))).toEqual([])
  })
  it('id の形式は縛らない（判断ポイント68 と同じ）', () => {
    expect(errorsOf(storeOf(template({ id: 'UUID ではない id' })))).toEqual([])
  })
})

describe('保存・上書き・名前の変更・削除（§13-3）', () => {
  const sections = [{ id: 'intro' }]
  const base = (): StructureTemplateStore =>
    storeOf(template(), template({ id: 't2', name: '次' })) as StructureTemplateStore

  it('新しい名前は末尾に足す', () => {
    const s = saveTemplate(base(), '新', sections, NOW, () => 'new-id')
    expect(s.templates.map((t) => t.id)).toEqual(['t1', 't2', 'new-id'])
    const t = s.templates[2]!
    expect(t.name).toBe('新')
    expect(t.sections).toEqual(sections)
    expect(new Date(t.updatedAt).getTime()).toBe(NOW.getTime())
    expect(s.schemaVersion).toBe(TEMPLATE_SCHEMA_VERSION)
    expect(errorsOf(s)).toEqual([])
  })
  it('同じ名前は上書き: id と位置を保ち、中身と updatedAt を替える。ほかは変えない', () => {
    const before = base()
    const s = saveTemplate(before, '基本', sections, NOW, () => 'unused')
    expect(s.templates.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(s.templates[0]!.sections).toEqual(sections)
    expect(new Date(s.templates[0]!.updatedAt).getTime()).toBe(NOW.getTime())
    expect(s.templates[1]).toEqual(before.templates[1])
  })
  it('保存した中身は、元の配列と切り離される', () => {
    const src = [{ id: 'intro' }]
    const s = saveTemplate(emptyTemplateStore(), '新', src, NOW)
    src[0]!.id = 'outro'
    expect(s.templates[0]!.sections[0]!.id).toBe('intro')
  })
  it('名前の変更: id・中身・updatedAt・位置を変えない', () => {
    const before = base()
    const s = renameTemplate(before, 't1', '改名')
    expect(s.templates[0]).toEqual({ ...before.templates[0], name: '改名' })
    expect(s.templates[1]).toEqual(before.templates[1])
  })
  it('名前の変更の理由: 空・他と重複は不可。自分と同じ名前は可', () => {
    expect(templateRenameError(base(), 't1', '')).toBe('名前を入力してください')
    expect(templateRenameError(base(), 't1', '次')).toBe('その名前はすでにあります')
    expect(templateRenameError(base(), 't1', '基本')).toBeNull()
    expect(templateRenameError(base(), 't1', '新しい')).toBeNull()
  })
  it('削除はそのひな型だけ', () => {
    expect(deleteTemplate(base(), 't1').templates.map((t) => t.id)).toEqual(['t2'])
  })
  it('名前で探す', () => {
    expect(findTemplateByName(base(), '次')?.id).toBe('t2')
    expect(findTemplateByName(base(), 'なし')).toBeUndefined()
  })
})

describe('歌の印（§13-2）', () => {
  it('保存: 歌ありは sung を持たせ、インストは外す', () => {
    const list = [
      { id: 'intro', sung: true },
      { id: 'chorus', sung: false },
    ]
    expect(sectionsForTemplate(spec, list, 'vocal')).toEqual(list)
    expect(sectionsForTemplate(spec, list, 'instrumental')).toEqual([
      { id: 'intro' },
      { id: 'chorus' },
    ])
  })
  it('保存: 歌ありで印のない要素には defaultSung を当てる', () => {
    expect(sectionsForTemplate(spec, [{ id: 'intro' }, { id: 'chorus' }], 'vocal')).toEqual([
      { id: 'intro', sung: false },
      { id: 'chorus', sung: true },
    ])
  })
  it('読み込み: 歌ありは、印のない要素にだけ defaultSung を当てる（印があれば尊重する）', () => {
    const t = [{ id: 'intro' }, { id: 'chorus' }, { id: 'intro', sung: true }]
    expect(sectionsFromTemplate(spec, t, 'vocal')).toEqual([
      { id: 'intro', sung: false },
      { id: 'chorus', sung: true },
      { id: 'intro', sung: true },
    ])
  })
  it('読み込み: インストは印を残し、ないものには足さない', () => {
    const t = [{ id: 'intro', sung: true }, { id: 'chorus' }]
    expect(sectionsFromTemplate(spec, t, 'instrumental')).toEqual(t)
  })
  it('読み込んだ要素は、ひな型と切り離される', () => {
    const t = [{ id: 'intro', sung: true }]
    const out = sectionsFromTemplate(spec, t, 'vocal')
    out[0]!.sung = false
    expect(t[0]!.sung).toBe(true)
  })
  it('並びの表示: 歌ありだけ「（歌なし）」を付ける', () => {
    const field = spec.fieldById.get('structure')!
    const list = [
      { id: 'intro', sung: false },
      { id: 'chorus', sung: true },
    ]
    expect(displaySections(spec, field, list, true)).toBe('イントロ（歌なし） → サビ')
    expect(displaySections(spec, field, list, false)).toBe('イントロ → サビ')
  })
})

describe('moveSectionTo（ドラッグ。判断ポイント76）', () => {
  it('離れた位置へ動かす（下へ・上へ）。元の配列は変えない', () => {
    const list = ['a', 'b', 'c', 'd']
    expect(moveSectionTo(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveSectionTo(list, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moveSectionTo(list, 1, 1)).toEqual(list)
    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })
  it.each([
    [-1, 0],
    [4, 0],
    [0, -1],
    [0, 4],
  ])('範囲外（%i → %i）はそのまま', (from, to) => {
    expect(moveSectionTo(['a', 'b', 'c', 'd'], from, to)).toEqual(['a', 'b', 'c', 'd'])
  })
})
