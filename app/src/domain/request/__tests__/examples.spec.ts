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
  DP44_ALL_ENGLISH,
  Q02_ORDER,
  Q02_ORDER_OFF,
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
  vocabLabel,
} from './patches'

// テストの実行ディレクトリは app/（vitest.config.ts の root）
const EXAMPLES = resolve(process.cwd(), '../design/v0/docs/examples')

interface ExampleCase {
  /** レンダリング例の md（examples/ の下） */
  md: string
  /** 入力（examples/inputs/ の下） */
  input: string
  patches: Patch[]
  /** 入力の検証で出てよい警告（例の §6 の表をそのまま入力にしたことによるもの。理由をそれぞれに書く） */
  expectedWarnings?: string[]
}

// -01-v4・-05（入力は同一。-05 はバリエーションだけオフ）の、仮の語彙の表示名と除外
const V4_LABELS = [
  vocabLabel('| 用途 | 指定 | ゲームのボス戦BGM |', '| 用途 | 指定 | ボス戦BGM |'),
  vocabLabel('| 主ジャンル | 指定 | オーケストラ |', '| 主ジャンル | 指定 | Orchestral |'),
  vocabLabel('| 地域・文化の様式 | 指定 | 和風 |', '| 地域・文化の様式 | 指定 | 日本 |'),
  vocabLabel('| 基調となる情緒 | 指定 | 緊迫, 荘厳 |', '| 基調となる情緒 | 指定 | 緊迫感, 荘厳 |'),
  vocabLabel('| リズムの担い手 | 指定 | 和太鼓 |', '| リズムの担い手 | 指定 | 太鼓 |'),
  vocabLabel(
    '| 展開の形 | 指定 | 一定の緊張を保つ |',
    '| 展開の形 | 指定 | 一定を保つ・ループ向き |',
  ),
  // 「映画的な広い残響」はいまの語彙にない。もっとも近い spacious-hall を入力にした（U2b の補完）
  vocabLabel(
    '| 空間の質感 | 指定 | 映画的な広い残響 |',
    '| 空間の質感 | 指定 | 広がりのあるホール |',
  ),
]
const V4_EXCLUSION = r6Row(
  '| 除外したい要素 | 指定 | 歪んだ音色 | 保持 |',
  'ケルト, 郷愁, エレキギター, 歪んだ音色',
)
// -01-v4・-05 の §6 の表は、主旋律で除外したエレキギターを、リズムの担い手に反映していない（楽器の除外の連動。input-items.md §4）
const V4_WARNINGS = [
  '[楽曲データ] 依頼 r1: R instrument-exclusion-linked: electric-guitar は他の項目で除外されているが、rhythmInstruments に反映されていない（連動で補う）',
]

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
  '-01-v4（インスト・除外あり・長さ 3:00）': {
    md: 'rendered-01-new-instrumental-v4.md',
    input: 'rendered-01-v4.json',
    patches: [
      Q02_ORDER,
      R2_52,
      T02,
      ...V4_LABELS,
      UNDOCUMENTED.styleLeanRow,
      V4_EXCLUSION,
      R6_TEXT,
      R3,
    ],
    expectedWarnings: V4_WARNINGS,
  },
  '-05（インスト・バリエーション＝オフ）': {
    md: 'rendered-05-new-instrumental-variation-off.md',
    input: 'rendered-05.json',
    patches: [
      Q02_ORDER_OFF,
      R2_52,
      T02,
      ...V4_LABELS,
      UNDOCUMENTED.styleLeanRow,
      V4_EXCLUSION,
      R6_TEXT,
      R3,
    ],
    expectedWarnings: V4_WARNINGS,
  },
  '-03（インスト・お任せ多め・除外なし・長さ Auto・案1・すべて英語）': {
    md: 'rendered-03-delegated-heavy-ambient.md',
    input: 'rendered-03.json',
    patches: [
      DP44_ALL_ENGLISH,
      Q02_ORDER,
      R2_52,
      T02,
      vocabLabel('| 主ジャンル | 指定 | アンビエント |', '| 主ジャンル | 指定 | Ambient |'),
      UNDOCUMENTED.developmentShapeDelegated,
      vocabLabel('導けない場合は「自然な」 | — |', '導けない場合は「自然な響き」 | — |'),
      R3,
    ],
  },
}

describe('依頼文の生成器: 既存のレンダリング例との照合（U2b）', () => {
  describe.each(Object.entries(CASES))('%s', (_name, c) => {
    const input = JSON.parse(
      readFileSync(resolve(EXAMPLES, 'inputs', c.input), 'utf-8'),
    ) as SongData

    it('入力の楽曲データは、保存データの検証を通る（エラー0件・警告0件）', () => {
      const r = checkSaved(JSON.stringify(input))
      expect(r.errors).toEqual([])
      expect(r.warnings).toEqual(c.expectedWarnings ?? [])
    })

    it('例の §1 と、文書化された差を除いて1文字単位で一致する', () => {
      const md = readFileSync(resolve(EXAMPLES, c.md), 'utf-8')
      const expected = applyPatches(extractRequestText(md), c.patches)
      expect(generateRequestText({ spec, req: input.requests[0]! })).toBe(expected)
    })
  })
})
