// 値を、Python の repr（%r）と同じ表記にする。検証の文言を参照実装（check_fields.py）と一致させるため（U1 の決定 4）。
// 制約: JSON から読んだ数値は、整数か小数かを区別できない（Python の 1.0 は、ここでは 1 になる）

function reprString(s: string): string {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'"
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (ch === '\\') out += '\\\\'
    else if (ch === quote) out += '\\' + quote
    else if (ch === '\n') out += '\\n'
    else if (ch === '\r') out += '\\r'
    else if (ch === '\t') out += '\\t'
    else if (code < 0x20 || code === 0x7f) out += '\\x' + code.toString(16).padStart(2, '0')
    else out += ch
  }
  return quote + out + quote
}

export function pyRepr(v: unknown): string {
  if (v === null || v === undefined) return 'None'
  if (v === true) return 'True'
  if (v === false) return 'False'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return reprString(v)
  if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']'
  if (typeof v === 'object') {
    return (
      '{' +
      Object.entries(v)
        .map(([k, x]) => `${reprString(k)}: ${pyRepr(x)}`)
        .join(', ') +
      '}'
    )
  }
  return String(v)
}
