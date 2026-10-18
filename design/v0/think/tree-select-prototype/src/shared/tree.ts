import type { CategoryRow, FlatRow, GenreFile, ItemRow } from './types'

/** 検索用の正規化: 全角半角・大小文字・ひらがな/カタカナを区別しない */
export function norm(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .trim()
}

/** カテゴリごとの行を作る。並びは itemOrder（presets.md §4-4）、非表示の語は showHidden のときだけ */
export function buildCategoryRows(genre: GenreFile, opts: { showHidden: boolean }): CategoryRow[] {
  const byId = new Map(genre.items.map((i) => [i.id, i]))
  return [...genre.categories]
    .sort((a, b) => a.order - b.order)
    .map((cat) => {
      const children: ItemRow[] = []
      for (const id of cat.itemOrder) {
        const it = byId.get(id)
        if (!it) continue
        const hidden = it.defaultVisible === false
        if (hidden && !opts.showHidden) continue
        children.push({
          kind: 'item',
          key: `${cat.id}/${it.id}`,
          id: it.id,
          label: it.label,
          termEn: it.term?.en,
          aliases: it.aliases ?? [],
          hidden,
          isRepresentative: it.represents === cat.id,
          categoryId: cat.id,
        })
      }
      return {
        kind: 'category' as const,
        key: cat.id,
        id: cat.id,
        label: cat.label,
        aliases: cat.aliases ?? [],
        order: cat.order,
        children,
      }
    })
}

function textMatches(q: string, ...texts: (string | undefined)[]): boolean {
  return texts.some((t) => !!t && norm(t).includes(q))
}

export function itemMatches(row: Pick<ItemRow, 'label' | 'termEn' | 'aliases'>, query: string): boolean {
  const q = norm(query)
  return !q || textMatches(q, row.label, row.termEn, ...row.aliases)
}

export function categoryMatches(cat: { label: string; aliases: string[] }, query: string): boolean {
  const q = norm(query)
  return !q || textMatches(q, cat.label, ...cat.aliases)
}

/**
 * 階層を保った検索。カテゴリ名（別名を含む）に一致すれば配下をすべて残し、
 * そうでなければ一致した語だけを残す。空になったカテゴリは落とす。
 */
export function filterRows(rows: CategoryRow[], query: string): CategoryRow[] {
  if (!norm(query)) return rows
  const out: CategoryRow[] = []
  for (const cat of rows) {
    const children = categoryMatches(cat, query) ? cat.children : cat.children.filter((c) => itemMatches(c, query))
    if (children.length) out.push({ ...cat, children })
  }
  return out
}

/** DataTable（グループ化）向けに平らにする。同じ語は所属カテゴリの数だけ行になる */
export function flatten(rows: CategoryRow[]): FlatRow[] {
  return rows.flatMap((cat) =>
    cat.children.map((c) => ({
      ...c,
      categoryKey: `${String(cat.order).padStart(4, '0')}|${cat.id}`,
      categoryLabel: cat.label,
      categoryAliases: cat.aliases,
    })),
  )
}

/** 平らな行に対する検索（カテゴリ名一致なら配下すべて。filterRows と同じ意味） */
export function flatMatches(row: FlatRow, query: string): boolean {
  return categoryMatches({ label: row.categoryLabel, aliases: row.categoryAliases }, query) || itemMatches(row, query)
}
