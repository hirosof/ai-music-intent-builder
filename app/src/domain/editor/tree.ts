// 階層テーブルの行（presets.md §3・§4・§11。試作 think/tree-select-prototype の shared/tree.ts を移植）。
// カテゴリ → 語の2段。同じ語が複数のカテゴリに出るので、行の key はカテゴリを含む（§4-4）。選択状態は語の id で引く
import type { Spec } from '../spec'
import type { Exclusion } from '../types/presets'

/** 検索用の正規化: 全角半角・大小文字・ひらがな/カタカナを区別しない（§4-2） */
export function norm(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .trim()
}

/** 表示の切り替えができない語（軸が違う語・保留の語。§11-3 の 3） */
const NOT_SWITCHABLE = new Set(['other-axis', 'hold'])

export interface TreeItem {
  kind: 'item'
  /** 行の key（カテゴリ id/語 id） */
  key: string
  id: string
  label: string
  termEn?: string
  aliases: string[]
  /** 今の表示設定で非表示の語（「非表示の語も表示」か、指定中のため出ている） */
  hidden: boolean
  /** 選べる語か。軸が違う語・保留の語は選べず、自由記述へ転記する（§11-3 の 7、判断ポイント49） */
  selectable: boolean
  exclusion?: Exclusion
  /** 検索用（正規化済み。名前・英語表記・別名・所属カテゴリ名と別名） */
  search: string
}

export interface TreeCategory {
  kind: 'category'
  key: string
  id: string
  label: string
  search: string
  children: TreeItem[]
}

export interface TreeOptions {
  /** 「非表示の語も表示」 */
  showHidden: boolean
  /** 語の表示の有無（UI 設定を反映したもの。既定は語の defaultVisible） */
  isVisible: (id: string) => boolean
  /** 非表示でも出す語（状態が「未指定」以外の語。§11-3 の 4） */
  keep: ReadonlySet<string>
}

/** カテゴリごとの行。並びはカテゴリの order と itemOrder（§4-4）。語のないカテゴリは出さない */
export function buildTree(spec: Spec, vocabularyId: string, opts: TreeOptions): TreeCategory[] {
  const vocab = spec.vocabularyById.get(vocabularyId)
  if (!vocab?.categories) throw new Error(`カテゴリを持たない語彙: ${vocabularyId}`)
  const byId = new Map(vocab.items.map((i) => [i.id, i]))
  return [...vocab.categories]
    .sort((a, b) => a.order - b.order)
    .map((cat) => {
      const catText = [cat.label, ...(cat.aliases ?? [])]
      const children: TreeItem[] = []
      for (const id of cat.itemOrder) {
        const it = byId.get(id)
        if (!it) continue
        const hidden = !opts.isVisible(id)
        if (hidden && !opts.showHidden && !opts.keep.has(id)) continue
        children.push({
          kind: 'item',
          key: `${cat.id}/${id}`,
          id,
          label: it.label,
          termEn: it.term?.en,
          aliases: it.aliases ?? [],
          hidden,
          selectable: !NOT_SWITCHABLE.has(it.exclusion?.kind ?? ''),
          exclusion: it.exclusion,
          search: norm([it.label, it.term?.en ?? '', ...(it.aliases ?? []), ...catText].join(' ')),
        })
      }
      return {
        kind: 'category' as const,
        key: cat.id,
        id: cat.id,
        label: cat.label,
        search: norm(catText.join(' ')),
        children,
      }
    })
    .filter((c) => c.children.length > 0)
}

/**
 * 階層を保った検索（UTable のグローバルフィルタと同じ意味。テスト用・件数の表示用）。
 * カテゴリ名（別名を含む）に一致すれば配下をすべて残し、そうでなければ一致した語だけを残す
 */
export function filterTree(rows: TreeCategory[], query: string): TreeCategory[] {
  const q = norm(query)
  if (!q) return rows
  return rows
    .map((cat) => ({
      ...cat,
      children: cat.search.includes(q)
        ? cat.children
        : cat.children.filter((c) => c.search.includes(q)),
    }))
    .filter((c) => c.children.length > 0)
}
