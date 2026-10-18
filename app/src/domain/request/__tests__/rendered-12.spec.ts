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

/** 文書化された差（-12 の依頼文は、これらの反映前の版。出典はそれぞれに書く） */
const PATCHES: Patch[] = [
  {
    source:
      '宿題35・-04 Q-02: §5-2 の行の並びは profile.params の順（request-blocks.md §7）。-12 は従来の並びのまま',
    from: '| バリエーション | 標準 |\n| 奇抜さ | 50%（既定値） |\n| スタイルの影響 | 50%（既定値） |\n| Max モード | オフ |',
    to: '| Max モード | オフ |\n| 奇抜さ | 50%（既定値） |\n| スタイルの影響 | 50%（既定値） |\n| バリエーション | 標準 |',
  },
  {
    source: 'R-6・判断ポイント40: 除外・補足の表に合算行を足す（-12 は反映前）',
    from: '| 除外したい要素 | 指定 | ラップ | 保持 |\n',
    to: '| 除外したい要素 | 指定 | ラップ | 保持 |\n| スタイルを除外欄に入れる要素 | 指定 | 緊迫感, ラップ | 保持 |\n',
  },
  {
    source: 'R-6・判断ポイント40: B-06x の文面の改訂（-12 は反映前）',
    from: [
      '「使用しない」の列に挙げた要素と、「除外したい要素」に書いた内容は、まとめて「スタイルを除外」欄に出力してください。スタイル欄の中に否定形（no ○○ など）で書かないでください。',
      '',
      '「スタイルを除外」欄の書き方は次のとおりです。',
      '',
      '- 除外したい要素をそのまま並べてください。No や without を付けないでください。この欄自体が除外を表すため、付けると二重否定になります。',
      '- 「使用しない」と「除外したい要素」に挙がっているものは、すべて漏れなく書いてください。減らさないでください。',
      '- 「使用しない」と「除外したい要素」に挙がっていない要素を足さないでください。',
    ].join('\n'),
    to: [
      '「使用しない」の列に挙げた要素と、「除外したい要素」に書いた内容は、上の「除外・補足」の表の「スタイルを除外欄に入れる要素」の行にまとめてあります。この行の要素を、「スタイルを除外」欄に出力してください。スタイル欄の中に否定形（no ○○ など）で書かないでください。',
      '',
      '「スタイルを除外」欄の書き方は次のとおりです。',
      '',
      '- 除外したい要素をそのまま並べてください。No や without を付けないでください。この欄自体が除外を表すため、付けると二重否定になります。',
      '- この行に挙がっているものは、すべて漏れなく書いてください。減らさないでください。',
      '- この行に挙がっていない要素を足さないでください。',
    ].join('\n'),
  },
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
