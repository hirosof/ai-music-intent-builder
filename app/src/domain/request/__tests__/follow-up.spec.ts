// 続けて頼む文 B-FC（request-text.md §2「続けて頼む文: 案の比較図」。文面の判断ポイント51）の照合。
// 正解は request-text.md の節そのもの（コードブロックの文と、{{fc.axes}} の表）から作る。文面を写さない
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import input from '@examples/inputs/rendered-12.json'
import { spec } from '@/data/spec'
import { compareChartText } from '@/domain/request/follow-up'
import type { SongRequest } from '@/domain/types/song'
import { toCurrentSong } from './helpers'

// 決定の文書は開発サーバの公開範囲（vite.config.ts の fs.allow）の外なので、ファイルとして読む
const md = readFileSync(
  resolve(import.meta.dirname, '../../../../../design/v0/docs/decisions/request-text.md'),
  'utf-8',
)

/** request-text.md の B-FC の節: コードブロックの文と、diffAxis ごとの {{fc.axes}} */
function fcSpec(): { template: string; axes: Map<string, string> } {
  const text = md.replace(/\r\n/g, '\n')
  const start = text.indexOf('\n### 続けて頼む文: 案の比較図')
  if (start < 0) throw new Error('B-FC の節がない')
  const end = text.indexOf('\n---\n', start)
  const section = text.slice(start, end)
  const open = section.indexOf('\n```\n')
  const close = section.indexOf('\n```\n', open + 5)
  if (open < 0 || close < 0) throw new Error('B-FC のコードブロックがない')
  const axes = new Map<string, string>()
  for (const line of section.split('\n')) {
    const m = /^\| (`.+?) \| (.+) \|$/.exec(line)
    if (!m) continue
    for (const id of m[1]!.matchAll(/`([a-z]+)`/g)) axes.set(id[1]!, m[2]!)
  }
  return { template: section.slice(open + 5, close) + '\n', axes }
}

const expected = (n: number, axis: string) => {
  const { template, axes } = fcSpec()
  const a = axes.get(axis)
  if (a === undefined) throw new Error(`表に ${axis} がない`)
  return template.split('{{fc.n}}').join(String(n)).split('{{fc.axes}}').join(a)
}

function base(): SongRequest {
  return structuredClone(toCurrentSong(input).requests[0]!)
}
function withOutput(values: Record<string, unknown>): SongRequest {
  const req = base()
  Object.assign(req.output, values)
  return req
}
const DIFF_AXES = spec.outputById.get('diffAxis')!.options!.map((o) => o.id)

describe('続けて頼む文 B-FC', () => {
  it('節の表は、diffAxis の選択肢をちょうど覆う（5つ）', () => {
    const { template, axes } = fcSpec()
    expect([...axes.keys()].sort()).toEqual([...DIFF_AXES].sort())
    expect(DIFF_AXES).toHaveLength(5)
    expect(template).toContain('{{fc.n}}')
    expect(template).toContain('{{fc.axes}}')
  })

  it.each(['mood', 'arrangement', 'texture', 'auto', 'interpretation'])(
    '差の付け方 %s・案の数3: 節の文と逐語的に一致する',
    (axis) => {
      const t = compareChartText(spec, withOutput({ variantCount: 3, diffAxis: axis }))
      expect(t).toBe(expected(3, axis))
    },
  )

  it.each([2, 5, 10])('案の数 %i: {{fc.n}} がその数になる（2か所）', (n) => {
    const t = compareChartText(spec, withOutput({ variantCount: n, diffAxis: 'mood' }))
    expect(t).toBe(expected(n, 'mood'))
    expect(t).toContain(`（案1〜案${n}）`)
    expect(t).toContain(`${n}案すべてを入れてください`)
  })

  it('情緒の幅は軸を固定し、ほかは AI に選ばせる（出し分けが入れ替わっていない）', () => {
    const t = (axis: string) =>
      compareChartText(spec, withOutput({ variantCount: 3, diffAxis: axis }))!
    expect(t('mood')).toContain('横軸は明暗（"暗い" --> "明るい"）')
    expect(t('arrangement')).toContain('"少人数" --> "大編成"')
    expect(t('texture')).toContain('"近く乾いた音" --> "広く響く音"')
    expect(t('auto')).toBe(t('interpretation'))
    expect(t('auto').split('\n')[1]).not.toContain('例:')
  })

  it('案の数・差の付け方を省いたときは既定値（3・お任せ）で出す', () => {
    const req = base()
    delete req.output.variantCount
    delete req.output.diffAxis
    expect(compareChartText(spec, req)).toBe(expected(3, 'auto'))
  })

  it('範囲がスタイルのみでも出す', () => {
    const t = compareChartText(
      spec,
      withOutput({ variantCount: 3, diffAxis: 'mood', requestScope: 'style' }),
    )
    expect(t).toBe(expected(3, 'mood'))
  })

  it('出さない条件: 案の数が1、範囲が歌詞のみ', () => {
    expect(compareChartText(spec, withOutput({ variantCount: 1, diffAxis: 'mood' }))).toBeNull()
    expect(
      compareChartText(
        spec,
        withOutput({ variantCount: 3, diffAxis: 'mood', requestScope: 'lyrics' }),
      ),
    ).toBeNull()
  })

  it('不正な値では出さない（依頼文の本体も生成できない値）', () => {
    expect(compareChartText(spec, withOutput({ variantCount: 3, diffAxis: 'genre' }))).toBeNull()
    expect(compareChartText(spec, withOutput({ variantCount: '3', diffAxis: 'mood' }))).toBeNull()
    expect(compareChartText(spec, withOutput({ variantCount: 2.5, diffAxis: 'mood' }))).toBeNull()
  })

  it('文の中にバッククォート3つを含めない（本体と同じ決まり）', () => {
    for (const axis of DIFF_AXES) {
      expect(compareChartText(spec, withOutput({ variantCount: 3, diffAxis: axis }))).not.toContain(
        '```',
      )
    }
  })
})
