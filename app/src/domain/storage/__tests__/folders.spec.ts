// フォルダの木の見せ方とたどり方（song-file.md §4-6）、フォルダを選ぶ部品（判断ポイント67・69・70）
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ui from '@nuxt/ui/vue-plugin'

import FolderPicker from '@/components/storage/FolderPicker.vue'
import { descendantIds, folderPath, folderPathLabel, folderRows } from '@/domain/storage/folders'
import type { Folder } from '@/domain/types/song'

const f = (id: string, name: string, parentId: string | null = null): Folder => ({
  id,
  parentId,
  name,
})
// ゲーム ＞ ボス戦 ＞ 第1形態、ゲーム ＞ 村、作業用
const folders = [
  f('w', '作業用'),
  f('v', '村', 'g'),
  f('b1', '第1形態', 'b'),
  f('g', 'ゲーム'),
  f('b', 'ボス戦', 'g'),
]

describe('フォルダの木', () => {
  it('表示の順は、親の次にその子。兄弟は名前順。深さを持つ', () => {
    expect(folderRows(folders).map((r) => [r.folder.name, r.depth])).toEqual([
      ['ゲーム', 0],
      ['ボス戦', 1],
      ['第1形態', 2],
      ['村', 1],
      ['作業用', 0],
    ])
  })

  it('親が見つからないフォルダは出さない（循環しても止まる）', () => {
    expect(folderRows([f('x', 'X', 'nope'), f('a', 'A', 'c'), f('c', 'C', 'a')])).toEqual([])
  })

  it('パスはルートからの名前。表示はルートから「＞」でつなぐ', () => {
    expect(folderPath(folders, 'b1')).toEqual(['ゲーム', 'ボス戦', '第1形態'])
    expect(folderPath(folders, null)).toEqual([])
    expect(folderPathLabel(folders, 'b')).toBe('ルート ＞ ゲーム ＞ ボス戦')
    expect(folderPathLabel(folders, null)).toBe('ルート')
  })

  it('配下は子・孫を含み、自分は含まない', () => {
    expect([...descendantIds(folders, 'g')].sort()).toEqual(['b', 'b1', 'v'])
    expect(descendantIds(folders, 'w').size).toBe(0)
  })
})

describe('フォルダを選ぶ部品', () => {
  const mountPicker = (props: Record<string, unknown>) =>
    mount(FolderPicker, {
      props: { folders, modelValue: null, ...props },
      global: { plugins: [ui] },
    })

  it('ルートと木を出し、押したフォルダの id を返す。選んでいるものは aria-checked', async () => {
    const w = mountPicker({ modelValue: 'b' })
    const options = w.findAll('[role="radio"]')
    expect(options.map((o) => o.text())).toEqual([
      'ルート',
      'ゲーム',
      'ボス戦',
      '第1形態',
      '村',
      '作業用',
    ])
    expect(w.get('[data-testid="folder-option-b"]').attributes('aria-checked')).toBe('true')
    await w.get('[data-testid="folder-option-root"]').trigger('click')
    await w.get('[data-testid="folder-option-v"]').trigger('click')
    expect(w.emitted('update:modelValue')).toEqual([[null], ['v']])
  })

  it('disabled のフォルダは選べない（移動で自分自身・配下を外すため）', async () => {
    const w = mountPicker({ disabled: new Set(['g', 'b']) })
    const g = w.get('[data-testid="folder-option-g"]')
    expect(g.attributes('disabled')).toBeDefined()
    await g.trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.get('[data-testid="folder-option-w"]').attributes('disabled')).toBeUndefined()
  })
})
