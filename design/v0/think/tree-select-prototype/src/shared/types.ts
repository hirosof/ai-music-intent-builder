/** presets/genre.json（docs/specifications/presets.md §2）の必要部分 */
export interface RawItem {
  id: string
  label: string
  categories: string[]
  aliases?: string[]
  term?: { en: string }
  represents?: string
  defaultVisible?: false
  exclusion?: { kind: string }
}

export interface RawCategory {
  id: string
  label: string
  order: number
  aliases?: string[]
  itemOrder: string[]
}

export interface GenreFile {
  schemaVersion: number
  id: string
  categories: RawCategory[]
  items: RawItem[]
}

/** 3値（presets.md §4-3）。未指定が初期値 */
export type State = 'use' | 'avoid' | 'unset'

/** 1つの語の1つの出現（同じ語が複数カテゴリに出るので、key はカテゴリを含む。§4-4） */
export interface ItemRow {
  kind: 'item'
  key: string // 例: "east-asian-family/city-pop"
  id: string // 選択状態は id で引く
  label: string
  termEn?: string
  aliases: string[]
  hidden: boolean
  isRepresentative: boolean
  categoryId: string
}

export interface CategoryRow {
  kind: 'category'
  key: string // カテゴリ id
  id: string
  label: string
  aliases: string[]
  order: number
  children: ItemRow[]
}

/** Vuetify の DataTable 向けに平らにした行 */
export interface FlatRow extends ItemRow {
  categoryKey: string // グループ化のキー（順序を保つため order を前置）
  categoryLabel: string
  categoryAliases: string[]
}
