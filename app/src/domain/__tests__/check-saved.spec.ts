// 保存データの検証を、参照実装（design/v0/tools/check-fields/check_fields.py）と照合する。
// 正解データ fixtures/check-fields-cases.json は export_parity_cases.py が書き出す（test_check_fields.py の保存データのケース）。
// 照合の規則（文書化された差）:
//   1. F1（スキーマ違反）の文言と件数は、jsonschema と Ajv で異なる。範囲（接頭辞）ごとに、出るか出ないかだけを比べる
//   2. 「F0 JSON として読めない」「F0 構造が不正で、検証を続けられない」は、後半が Python の例外の文言なので、前半だけを比べる
//   3. KNOWN_DIFFERENCES のケースは、参照実装の副作用による指摘を除いて比べる（理由はそれぞれに書く）
import { describe, it, expect } from 'vitest'

import { checkSaved } from '@/data/validation'
import data from './fixtures/check-fields-cases.json'

interface ParityCase {
  name: string
  input: string
  errors: string[]
  warnings: string[]
  notes: string[]
  expect: {
    has: string[]
    lacks: string[]
    counts: [number, number] | null
    once: [string, number] | null
  }
}

const PREFIX_ONLY = ['F0 JSON として読めない: ', 'F0 構造が不正で、検証を続けられない: ']

/** 参照実装の副作用による指摘（アプリは出さない） */
const KNOWN_DIFFERENCES: Record<string, { reason: string; ignore: RegExp }> = {
  'F0: axes の値がオブジェクトでない（例外で落ちない）': {
    reason:
      '参照実装は、文字列の値を1文字ずつキーとして走査し（S1 未知のキー: purpose.b など）、その後の例外で F0 を出す。アプリは、オブジェクトでない時点で F0 を出す',
    ignore: /S1 未知のキー: purpose\.[a-z]$/,
  },
}

const isF1 = (m: string) => / ?F1 スキーマ違反: /.test(m)
const f1Scopes = (ms: string[]) =>
  [...new Set(ms.filter(isF1).map((m) => m.slice(0, m.indexOf('F1 '))))].sort()

function normalize(ms: string[], ignore?: RegExp): string[] {
  return ms
    .filter((m) => !isF1(m) && !(ignore && ignore.test(m)))
    .map((m) => {
      for (const p of PREFIX_ONLY) {
        const i = m.indexOf(p)
        if (i >= 0) return m.slice(0, i + p.length)
      }
      return m
    })
}

const cases = (data as { cases: ParityCase[] }).cases

describe('保存データの検証（check_fields.py との照合）', () => {
  it('正解データがある（保存データのケース）', () => {
    expect(cases.length).toBeGreaterThanOrEqual(130)
  })

  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const got = checkSaved(c.input)
    const known = KNOWN_DIFFERENCES[c.name]
    expect(normalize(got.errors)).toEqual(normalize(c.errors, known?.ignore))
    expect(normalize(got.warnings)).toEqual(normalize(c.warnings, known?.ignore))
    expect(normalize(got.notes)).toEqual(normalize(c.notes, known?.ignore))
    expect(f1Scopes(got.errors)).toEqual(f1Scopes(c.errors))

    // test_check_fields.py の期待（has・lacks）も、同じ文字列で確かめる。
    // 参照実装の出力で F1 の行にしか現れない文字列（jsonschema の文言）は、規則1により、F1 が出ていることで確かめる
    const all = [...got.errors, ...got.warnings, ...got.notes].join('\n')
    const pyLines = [...c.errors, ...c.warnings, ...c.notes]
    for (const s of c.expect.has) {
      const inPy = pyLines.filter((m) => m.includes(s))
      const want = inPy.length > 0 && inPy.every(isF1) ? 'F1 スキーマ違反' : s
      expect(all).toContain(want)
    }
    for (const s of c.expect.lacks) expect(all).not.toContain(s)
  })
})
