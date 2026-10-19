// 未完成の検出（判断ポイント43）。S5（①指定なのに値が空）と F12（歌ありで作詞の主体が未選択）。
// 未完成のデータでは依頼文を生成しない。カードに示す（文面は UNFINISHED_MESSAGES）
import type { Spec } from '../spec'
import type { SongRequest } from '../types/song'
import { isSpecifiedEmpty } from '../validation/check-saved'

export interface Incomplete {
  /** ①指定なのに値が空の項目 id */
  emptyFields: string[]
  /** 歌ありで作詞の主体が未選択 */
  lyricsAuthorMissing: boolean
}

/** 画面に出す文面（判断ポイント43 の例をそのまま使う） */
export const UNFINISHED_MESSAGES = {
  emptyField: '指定されていますが値が空です',
  lyricsAuthorMissing: '歌ありで作詞の主体が未選択です',
} as const

/** req は保存する形（正規化済み）を渡す。無効な項目は正規化で省略されている */
export function findIncomplete(spec: Spec, req: SongRequest): Incomplete {
  const emptyFields: string[] = []
  for (const [id, a] of Object.entries(req.axes)) {
    const f = spec.fieldById.get(id)
    if (
      f &&
      a.state === 'specified' &&
      isSpecifiedEmpty(f.kind, a as unknown as Record<string, unknown>)
    )
      emptyFields.push(id)
  }
  return {
    emptyFields,
    lyricsAuthorMissing: req.vocalMode === 'vocal' && req.lyricsAuthor === null,
  }
}

export const isIncomplete = (i: Incomplete) => i.emptyFields.length > 0 || i.lyricsAuthorMissing
