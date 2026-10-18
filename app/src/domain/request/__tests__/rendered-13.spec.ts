// レンダリング例 -13 の元（設計スレッドの依頼、2026-10-18）。判断ポイント42〜46 の文面を、生成器の出力で示す。
// 入力: design/v0/docs/examples/inputs/rendered-13.json。生成した依頼文: 同 rendered-13.generated.txt（生成物）。
// -13 の md が作られるまでは、生成器の出力の固定（回帰の確認）にとどまる（独立の正解ではない）。
// 書き出し直すときは: UPDATE_EXAMPLES=1 npx vitest run src/domain/request/__tests__/rendered-13.spec.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import input from '@examples/inputs/rendered-13.json'
import { spec } from '@/data/spec'
import { checkSaved } from '@/data/validation'
import { generateRequestText } from '@/domain/request/generate'
import type { SongData } from '@/domain/types/song'

// テストの実行ディレクトリは app/（vitest.config.ts の root）
const OUT = resolve(process.cwd(), '../design/v0/docs/examples/inputs/rendered-13.generated.txt')

describe('レンダリング例 -13 の元', () => {
  it('入力の楽曲データは、保存データの検証を通る（エラー0件・警告0件）', () => {
    const r = checkSaved(JSON.stringify(input))
    expect([...r.errors, ...r.warnings]).toEqual([])
  })

  it('生成した依頼文が、保存したものと一致する', () => {
    const got = generateRequestText({ spec, req: (input as unknown as SongData).requests[0]! })
    if (process.env.UPDATE_EXAMPLES === '1') writeFileSync(OUT, got, 'utf-8')
    expect(got).toBe(readFileSync(OUT, 'utf-8'))
    expect(got).not.toContain('`'.repeat(3))
  })
})
