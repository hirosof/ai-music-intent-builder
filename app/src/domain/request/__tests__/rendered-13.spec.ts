// レンダリング例 -13（判断ポイント42〜47・R-6 の確認。6モデルで検証済み、2026-10-19）との照合。
// -13 §1 の依頼文は、生成器の出力（inputs/rendered-13.generated.txt）を転記したもの。
// ここでは、inputs/rendered-13.json を生成器に通した出力を、-13 §1（md から直接読む）と突き合わせる（-13 §5-1）。
// 一致しなければ、転記の誤り（または生成器の変化）として設計スレッドに知らせる。当て布（文書化された差）はない。
// 生成物を書き出し直すときは: UPDATE_EXAMPLES=1 npx vitest run src/domain/request/__tests__/rendered-13.spec.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import md from '@examples/rendered-13-new-instrumental-freetext-all-english.md?raw'
import input from '@examples/inputs/rendered-13.json'
import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import { generateRequestText } from '@/domain/request/generate'
import type { SongData } from '@/domain/types/song'
import { extractRequestText } from './helpers'

// テストの実行ディレクトリは app/（vitest.config.ts の root）
const GENERATED = resolve(
  process.cwd(),
  '../design/v0/docs/examples/inputs/rendered-13.generated.txt',
)

const generate = () =>
  generateRequestText({ spec, req: (input as unknown as SongData).requests[0]! })

describe('依頼文の生成器: レンダリング例 -13', () => {
  it('入力の楽曲データは、保存データの検証を通る（エラー0件・警告0件）', () => {
    const r = checkSaved(JSON.stringify(input))
    expect([...r.errors, ...r.warnings]).toEqual([])
  })

  it('-13 §1 と1文字単位で一致する（文書化された差はない）', () => {
    const got = generate()
    expect(got).toBe(extractRequestText(md))
    expect(got).not.toContain('`'.repeat(3))
  })

  it('生成物 inputs/rendered-13.generated.txt とも一致する', () => {
    const got = generate()
    if (process.env.UPDATE_EXAMPLES === '1') writeFileSync(GENERATED, got, 'utf-8')
    expect(got).toBe(readFileSync(GENERATED, 'utf-8'))
  })
})
