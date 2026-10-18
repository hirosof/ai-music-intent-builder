// レンダリング例（design/v0/docs/examples/rendered-*.md）との照合の補助

/** 文書化された差。正解（例の依頼文）の from を to に置き換える。from はちょうど1回現れなければならない */
export interface Patch {
  /** 差の出典（判断ポイント・宿題など） */
  source: string
  from: string
  to: string
}

/** レンダリング例の「## 1. 依頼文（全文）」の、最初のコードブロックの中身（末尾は改行1つ） */
export function extractRequestText(md: string): string {
  const text = md.replace(/\r\n/g, '\n')
  const start = text.indexOf('\n## 1. 依頼文')
  if (start < 0) throw new Error('「## 1. 依頼文」がない')
  const open = text.indexOf('\n```\n', start)
  const close = text.indexOf('\n```\n', open + 5)
  if (open < 0 || close < 0) throw new Error('依頼文のコードブロックがない')
  return text.slice(open + 5, close) + '\n'
}

export function applyPatches(text: string, patches: Patch[]): string {
  let out = text
  for (const p of patches) {
    const n = out.split(p.from).length - 1
    if (n !== 1) throw new Error(`差の当て布が ${n} 回現れる（1回でなければならない）: ${p.source}`)
    out = out.replace(p.from, p.to)
  }
  return out
}
