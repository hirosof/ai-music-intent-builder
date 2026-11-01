// レンダリング例 -15（文面の判断ポイント50 の確認。歌なしのセクションと Cメロ。6モデルでの検証は利用者の作業）との照合。
// -15 §1 の依頼文は、生成器の出力（inputs/rendered-15.generated.txt）を転記したもの。当て布（文書化された差）はない。
// 生成物を書き出し直すときは: UPDATE_EXAMPLES=1 npx vitest run src/domain/request/__tests__/rendered-15.spec.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import md from '@examples/rendered-15-new-vocal-unsung-sections.md?raw'
import input from '@examples/inputs/rendered-15.json'
import input14 from '@examples/inputs/rendered-14.json'
import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import { generateRequestText } from '@/domain/request/generate'
import type { SongData } from '@/domain/types/song'
import { extractRequestText, toCurrentSong } from './helpers'

// テストの実行ディレクトリは app/（vitest.config.ts の root）
const GENERATED = resolve(
  process.cwd(),
  '../design/v0/docs/examples/inputs/rendered-15.generated.txt',
)

const generate = () =>
  generateRequestText({ spec, req: (input as unknown as SongData).requests[0]! })

describe('依頼文の生成器: レンダリング例 -15', () => {
  it('入力の楽曲データは、保存データの検証を通る（エラー0件・警告0件）。版2 で作る', () => {
    const r = checkSaved(JSON.stringify(input))
    expect([...r.errors, ...r.warnings]).toEqual([])
    expect(input.schemaVersion).toBe(2)
  })

  it('入力は -14 の楽曲データと、曲の構成だけが違う', () => {
    const omitStructure = (s: SongData) => {
      const { axes, ...rest } = s.requests[0]!
      const { structure: _omit, ...others } = axes
      return { ...rest, axes: others }
    }
    expect(omitStructure(input as unknown as SongData)).toEqual(
      omitStructure(toCurrentSong(input14)),
    )
  })

  it('生成物 inputs/rendered-15.generated.txt と一致する', () => {
    const got = generate()
    if (process.env.UPDATE_EXAMPLES === '1') writeFileSync(GENERATED, got, 'utf-8')
    expect(got).toBe(readFileSync(GENERATED, 'utf-8'))
  })

  it('-15 §1 と1文字単位で一致する（文書化された差はない）', () => {
    const got = generate()
    expect(got).toBe(extractRequestText(md))
    expect(got).not.toContain('`'.repeat(3))
  })

  it('判断ポイント50 の文面が出ている', () => {
    const got = generate()
    expect(got).toContain(
      '| 曲の構成 | 指定 | イントロ（歌なし） → Aメロ → Bメロ → サビ → 間奏（歌なし） → Aメロ → Cメロ（ブリッジ） → つなぎ（歌なし） → サビ → アウトロ（歌なし） | 保持 |',
    )
    expect(got).toContain(
      '「（歌なし）」を付けたまとまりは、構成タグだけを書き、歌詞は書かないでください。',
    )
    for (const tag of [
      '- イントロ: [Intro]',
      '- 間奏: [Interlude]',
      '- Cメロ（ブリッジ）: [Bridge]',
      '- つなぎ: [Transition]',
    ])
      expect(got).toContain(tag)
    expect(got).toContain('§6 の「曲の構成」と矛盾しないように')
  })
})
