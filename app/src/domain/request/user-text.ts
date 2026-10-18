// 利用者が入力した文字列の出し方（request-text.md B-06「表の生成規則」。判断ポイント43）。
// そのまま出す（言い換えない）。ただし次の3点だけ機械的に直す:
//   1. 前後の空白を除く。改行は、前後に空白を置いた「 / 」1つに（空行が続くときも1つ）
//   2. 表のセルの中の「|」は「\|」に
//   3. 3つ以上並んだバッククォートは、長さを保ったまま「'」に（依頼文全体を1つのコードブロックでコピーするため。表の外にも適用）

export function userText(s: string, opts: { inCell: boolean }): string {
  let out = s
    .trim()
    // 改行（と、その前後の空白・続く空行）を「 / 」1つに（補完: 改行に接する空白も除く）
    .replace(/[ \t　]*(?:\r\n|\r|\n)(?:[ \t　]*(?:\r\n|\r|\n))*[ \t　]*/g, ' / ')
  if (opts.inCell) out = out.replace(/\|/g, '\\|')
  return out.replace(/`{3,}/g, (m) => "'".repeat(m.length))
}
