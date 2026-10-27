// レンダリング例 -14（判断ポイント49 の確認。日本語の歌詞の表記。6モデルでの検証は利用者の作業）との照合。
// -14 §1 の依頼文は、生成器の出力（inputs/rendered-14.generated.txt）を転記したもの。
// ここでは、inputs/rendered-14.json を生成器に通した出力を、-14 §1（md から直接読む）と突き合わせる（-14 §5-1）。
// 一致しなければ、転記の誤り（または生成器の変化）として設計スレッドに知らせる。当て布（文書化された差）はない。
// 生成物を書き出し直すときは: UPDATE_EXAMPLES=1 npx vitest run src/domain/request/__tests__/rendered-14.spec.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import md from '@examples/rendered-14-new-vocal-chat-ai-japanese-kanji.md?raw'
import input from '@examples/inputs/rendered-14.json'
import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import { generateRequestText } from '@/domain/request/generate'
import type { SongData } from '@/domain/types/song'
import { extractRequestText } from './helpers'

// テストの実行ディレクトリは app/（vitest.config.ts の root）
const GENERATED = resolve(
  process.cwd(),
  '../design/v0/docs/examples/inputs/rendered-14.generated.txt',
)

const generate = () =>
  generateRequestText({ spec, req: (input as unknown as SongData).requests[0]! })

describe('依頼文の生成器: レンダリング例 -14', () => {
  it('入力の楽曲データは、保存データの検証を通る（エラー0件・警告0件）', () => {
    const r = checkSaved(JSON.stringify(input))
    expect([...r.errors, ...r.warnings]).toEqual([])
  })

  it('生成物 inputs/rendered-14.generated.txt と一致する', () => {
    const got = generate()
    if (process.env.UPDATE_EXAMPLES === '1') writeFileSync(GENERATED, got, 'utf-8')
    expect(got).toBe(readFileSync(GENERATED, 'utf-8'))
  })

  it('-14 §1 と1文字単位で一致する（文書化された差はない）', () => {
    const got = generate()
    expect(got).toBe(extractRequestText(md))
    expect(got).not.toContain('`'.repeat(3))
  })

  it('判断ポイント49 の2か所が出ている', () => {
    const got = generate()
    expect(got).toContain('| 歌詞本文の言語 | 指定 | 日本語 (漢字使用可能) |')
    expect(got).toContain(
      '- 漢字には、意図した発音になるよう、すべての漢字の直後に、ひらがなで振り仮名を付けてください（例: 漢字（かんじ）、揺（ゆ）れる）。',
    )
  })
})
