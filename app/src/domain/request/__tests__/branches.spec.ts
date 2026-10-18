// 依頼文の生成器: -12 が通らない分岐（「出ない側」を含む。教訓4-30）と、明示的に失敗させる未定義の組み合わせ。
// 本格的な照合は U2b（-11・-07〜-10・-v4・-03・-05）で行う。ここでは、-12 の入力を1点だけ変えて、分岐が切り替わることを見る
import { describe, it, expect } from 'vitest'

import input from '@examples/inputs/rendered-12.json'
import { spec } from '@/data/spec'
import { GenerationError } from '@/domain/request/errors'
import { generateRequestText } from '@/domain/request/generate'
import type { SongData, SongRequest } from '@/domain/types/song'

function base(): SongRequest {
  return structuredClone((input as unknown as SongData).requests[0]!)
}
const gen = (req: SongRequest) => generateRequestText({ spec, req })

describe('依頼文の生成器: 分岐', () => {
  it('長さが指定のとき: 5-2 に長さの行（M:SS）が出て、B-05L は出ない。指示文に長さを書いてよい（R-2）', () => {
    const req = base()
    req.axes.length = { state: 'specified', value: 180 }
    const t = gen(req)
    expect(t).toContain('| 長さ | 3:00 |\n| Max モード | オフ |')
    expect(t).not.toContain('長さは Auto です。')
    expect(t).toContain(
      '- 指示文には、歌詞の分量の目安として、§5-2 の曲の長さを書いてかまいません。',
    )
    expect(t).not.toContain('指示文に曲の長さを書かないでください')
  })

  it('除外対象がないとき: 除外欄の行・合算行・B-06x・7-2 の項は出ない（B-05x・B-06x の出ない側）', () => {
    const req = base()
    req.axes.mood = { state: 'specified', choices: { nostalgic: 'use' } }
    req.axes.exclusions = { state: 'delegated' }
    const t = gen(req)
    expect(t).not.toContain('| スタイルを除外 |')
    expect(t).not.toContain('スタイルを除外欄に入れる要素')
    expect(t).not.toContain('「スタイルを除外」欄の書き方は次のとおりです。')
    expect(t).not.toContain('- スタイルを除外: コードブロックで囲む')
    expect(t).toContain('| 除外したい要素 | お任せ | お任せ — 指定しないまま残す | — |')
  })

  it('合算行: 「使用しない」の重複は1つに、「除外したい要素」と完全一致する語は落とす（R-6）', () => {
    const req = base()
    req.axes.subGenres = {
      state: 'specified',
      choices: { 'city-pop': 'use', 'trip-hop': 'exclude' },
    }
    req.axes.exclusions = { state: 'specified', value: '緊迫感' }
    const t = gen(req)
    expect(t).toContain('| スタイルを除外欄に入れる要素 | 指定 | Trip Hop, 緊迫感 | 保持 |')
  })

  it('3値選択の語は、入力の順でなく語彙の順に並べる（描画規則）', () => {
    const req = base()
    req.axes.mood = {
      state: 'specified',
      choices: { tense: 'exclude', bittersweet: 'use', nostalgic: 'use' },
    }
    expect(gen(req)).toContain('| 基調となる情緒 | 指定 | 郷愁, 切なさ | 緊迫感 | 拡張可 |')
  })

  it('案の数が1のとき: 案ごとの差の付け方（B-07-3）は出ない', () => {
    const req = base()
    req.output.variantCount = 1
    const t = gen(req)
    expect(t).not.toContain('案ごとの差の付け方')
    expect(t).toContain('1. 案ごとの出力（1 案）')
  })

  it('歌詞の構成が①指定のとき: B-05g の展開の1文（R-1）と、指示文の要件に構成（R-5 の①側）', () => {
    const req = base()
    req.axes.lyricsStructure = { state: 'specified', value: ['intro', 'verse', 'chorus', 'outro'] }
    const t = gen(req)
    expect(t).toContain(
      '- スタイル欄の「展開」の記述は、§6 の「歌詞の構成」と矛盾しないようにしてください',
    )
    expect(t).toContain('指示文には、§6 の G の要件（テーマ・言語・構成）を含めてください。')
    expect(t).toContain('| 歌詞の構成 | 指定 | イントロ → Aメロ → サビ → アウトロ | 保持 |')
  })

  it('歌詞の言語が①指定の english のとき: B-LY-ja は出ない', () => {
    const req = base()
    req.axes.lyricsLanguage = { state: 'specified', value: 'english' }
    expect(gen(req)).not.toContain('歌詞を日本語で書く場合')
  })

  it('バリエーションがオフのとき: B-05v0（rewritesStyle = false）', () => {
    const req = base()
    req.output.variation = 'off'
    const t = gen(req)
    expect(t).toContain(
      '- バリエーション設定が「オフ」のため、あなたが書いたスタイルはそのまま最終形として使われます。',
    )
    expect(t).not.toContain('書き換えの元になる材料')
  })

  it('推奨パラメータを1つオンにしたとき: §5-2 から外れて §7-7 の行になる', () => {
    const req = base()
    req.output.recommendParams = { weirdness: true }
    const t = gen(req)
    expect(t).not.toContain('| 奇抜さ | 50%（既定値） |\n')
    expect(t).toContain('| 奇抜さ | 0〜100% | 50%（既定値） |')
    expect(t).toContain('- 推奨パラメータ')
  })

  it('active-when: 地域・文化の様式に「使用する」があるときだけ、様式の寄せ方が出る', () => {
    const req = base()
    expect(gen(req)).not.toContain('様式の寄せ方')
    req.axes.regionStyles = { state: 'specified', choices: { japanese: 'use' } }
    expect(gen(req)).toContain('| 様式の寄せ方 | 既定値 | 〜風（既定値） | — |')
  })

  it('follows-delegated: 用途が②のとき、用途の詳細は①でも②として出す', () => {
    const req = base()
    req.axes.purpose = { state: 'delegated' }
    req.axes.purposeDetail = { state: 'specified', value: 'ラスボス戦' }
    const t = gen(req)
    // 手がかり（用途）が②のため使えず、フォールバック omit で「指定しないまま残す」になる（request-blocks.md §4-2）
    expect(t).toContain('| 用途の詳細 | お任せ | お任せ — 指定しないまま残す | — |')
    expect(t).not.toContain('ラスボス戦')
  })
})

describe('依頼文の生成器: 未定義の組み合わせは明示的に失敗する（request-blocks.md §1）', () => {
  const cases: [string, (r: SongRequest) => void][] = [
    ['派生生成（第2段階）', (r) => (r.generationType = 'derived')],
    [
      '自由記述（§6 への出し方が未定義）',
      (r) => (r.axes.purpose = { state: 'specified', value: 'ending-theme', freeText: '補足' }),
    ],
    [
      '出力言語「すべて英語」（欄の言語の文面が未定義）',
      (r) => (r.output.outputLanguage = 'all-english'),
    ],
    [
      'BPM の①指定（§6 への出し方が未定義）',
      (r) => (r.axes.bpm = { state: 'specified', value: 120 }),
    ],
    [
      'Max モード（トグル）の推奨値の行（表記が未定義）',
      (r) => (r.output.recommendParams = { 'max-mode': true }),
    ],
  ]
  it.each(cases)('%s', (_name, mutate) => {
    const req = base()
    mutate(req)
    expect(() => gen(req)).toThrow(GenerationError)
  })
})
