// U2b: 既存のレンダリング例との照合。例ごとに、入力（examples/inputs/）を生成器に通した出力と、例の §1（md から直接読む）を、
// 文書化された差（patches.ts。出典つき）を当てたうえで、1文字単位で突き合わせる。-12・-13 は別のファイル
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import { generateRequestText } from '@/domain/request/generate'
import type { SongData } from '@/domain/types/song'
import { applyPatches, extractRequestText, type Patch } from './helpers'
import {
  DP36_2,
  Q02_ORDER,
  R1,
  R2_52,
  R2_52_INSTRUCTION,
  R2_LENGTH_ITEM,
  R3,
  R4_LY,
  R4_OUT,
  R5,
  R6_TEXT,
  T02,
  UNDOCUMENTED,
  r6Row,
} from './patches'

// テストの実行ディレクトリは app/（vitest.config.ts の root）
const EXAMPLES = resolve(process.cwd(), '../design/v0/docs/examples')

interface ExampleCase {
  /** レンダリング例の md（examples/ の下） */
  md: string
  /** 入力（examples/inputs/ の下） */
  input: string
  patches: Patch[]
}

const RAP = r6Row('| 除外したい要素 | 指定 | ラップ | 保持 |', '緊迫感, ラップ')

const CASES: Record<string, ExampleCase> = {
  '-11（chat-ai-instruction・長さ 3:00）': {
    md: 'rendered-11-new-vocal-lyrics-instruction-r2.md',
    input: 'rendered-11.json',
    patches: [Q02_ORDER, T02, RAP, R6_TEXT, R5],
  },
  '-08（chat-ai-instruction・R-2 の反映前）': {
    md: 'rendered-08-new-vocal-lyrics-instruction.md',
    input: 'rendered-08.json',
    patches: [Q02_ORDER, R2_52_INSTRUCTION, T02, RAP, R6_TEXT, R5, R2_LENGTH_ITEM, R3],
  },
  '-07（chat-ai・構成①・テーマ②）': {
    md: 'rendered-07-new-vocal-chat-ai.md',
    input: 'rendered-07.json',
    patches: [
      Q02_ORDER,
      R2_52,
      T02,
      R1,
      RAP,
      R6_TEXT,
      R4_LY,
      UNDOCUMENTED.lyJaBlankLine,
      R3,
      R4_OUT,
    ],
  },
  '-09（requestScope = style）': {
    md: 'rendered-09-new-vocal-style-only.md',
    input: 'rendered-09.json',
    patches: [Q02_ORDER, T02, RAP, R6_TEXT],
  },
  '-10（requestScope = lyrics・曲名案）': {
    md: 'rendered-10-new-vocal-lyrics-only.md',
    input: 'rendered-10.json',
    patches: [UNDOCUMENTED.lyJaBlankLine, DP36_2],
  },
}

describe('依頼文の生成器: 既存のレンダリング例との照合（U2b）', () => {
  describe.each(Object.entries(CASES))('%s', (_name, c) => {
    const input = JSON.parse(
      readFileSync(resolve(EXAMPLES, 'inputs', c.input), 'utf-8'),
    ) as SongData

    it('入力の楽曲データは、保存データの検証を通る（エラー0件・警告0件）', () => {
      const r = checkSaved(JSON.stringify(input))
      expect([...r.errors, ...r.warnings]).toEqual([])
    })

    it('例の §1 と、文書化された差を除いて1文字単位で一致する', () => {
      const md = readFileSync(resolve(EXAMPLES, c.md), 'utf-8')
      const expected = applyPatches(extractRequestText(md), c.patches)
      expect(generateRequestText({ spec, req: input.requests[0]! })).toBe(expected)
    })
  })
})
