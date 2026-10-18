// U2 の受け入れ基準: レンダリング例 -12 §1 と同じ入力から生成した依頼文が、文書化された差だけを除いて一致する。
// 正解は md から直接読む（写しを持たない）。入力は design/v0/docs/examples/inputs/rendered-12.json（-12 §6 の表と §2-1 の設定から起こした）
import { describe, it, expect } from 'vitest'

import md from '@examples/rendered-12-new-vocal-lyrics-instruction-auto.md?raw'
import input from '@examples/inputs/rendered-12.json'
import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import { generateRequestText } from '@/domain/request/generate'
import type { SongData } from '@/domain/types/song'
import { applyPatches, extractRequestText, type Patch } from './helpers'
import { Q02_ORDER, R6_TEXT, r6Row } from './patches'

/** 文書化された差（-12 の依頼文は、これらの反映前の版。出典は patches.ts） */
const PATCHES: Patch[] = [
  Q02_ORDER,
  r6Row('| 除外したい要素 | 指定 | ラップ | 保持 |', '緊迫感, ラップ'),
  R6_TEXT,
]

describe('依頼文の生成器: レンダリング例 -12（受け入れ基準）', () => {
  it('入力の楽曲データは、保存データの検証を通る（エラー0件・警告0件）', () => {
    const r = checkSaved(JSON.stringify(input))
    expect([...r.errors, ...r.warnings]).toEqual([])
  })

  it('-12 §1 と、文書化された差を除いて1文字単位で一致する', () => {
    const expected = applyPatches(extractRequestText(md), PATCHES)
    const got = generateRequestText({ spec, req: (input as unknown as SongData).requests[0]! })
    expect(got).toBe(expected)
  })
})
