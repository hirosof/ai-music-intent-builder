// 矛盾の警告（ui-and-nonfunctional.md §5・§5-2、判断ポイント51、U4e の決定 N2）。生成は止めない。
// 初版で出すのは、規則がデータとして決まっているものだけ: 項目をまたぐ規則（crossFieldRules）、近い系統のペア（warningPairs）、
// 代表と兄弟の相反（represents）。楽器の除外の連動は、統合テーブルで起きない形にしたので出さない。未完成（S5・F12）は incomplete.ts。
// 表示設定に関係なく判定する（presets.md §11-3 の 5）
import type { Spec } from '../spec'
import type { FieldDef, StateId } from '../types/fields'
import type { SongRequest } from '../types/song'
import { termLabel } from './display'

export interface FieldWarning {
  /** 警告を出す項目（カードの行） */
  fieldId: string
  /** warning は警告色、info は淡い文 */
  severity: 'warning' | 'info'
  message: string
}

const stateOf = (req: SongRequest, f: FieldDef): StateId => req.axes[f.id]?.state ?? f.initialState
/** ①指定の3値（①以外は空） */
const choicesOf = (req: SongRequest, id: string) => {
  const a = req.axes[id]
  return a?.state === 'specified' ? (a.choices ?? {}) : {}
}

/** req は保存する形（正規化済み）を渡す */
export function findWarnings(spec: Spec, req: SongRequest): FieldWarning[] {
  const out: FieldWarning[] = []
  const field = (id: string) => spec.fieldById.get(id)!

  // 項目をまたぐ規則（input-items.md §4）
  for (const r of spec.fieldsDef.crossFieldRules) {
    if (r.type === 'follows-delegated') {
      if (
        stateOf(req, field(r.field)) === 'specified' &&
        stateOf(req, field(r.source)) === 'delegated'
      )
        out.push({
          fieldId: r.field,
          severity: 'warning',
          message: `${field(r.source).label}がお任せのため、${field(r.field).label}はお任せとして扱われます`,
        })
    } else if (r.type === 'active-when') {
      const active = Object.values(choicesOf(req, r.when.field)).includes(r.when.choice)
      if (stateOf(req, field(r.field)) === 'specified' && !active)
        out.push({
          fieldId: r.field,
          severity: 'info',
          message: `${field(r.when.field).label}に「${r.when.choice === 'use' ? '使用する' : '使用しない'}」がないため、${field(r.field).label}は依頼文に出ません`,
        })
    } else if (r.type === 'single-not-excluded') {
      const main = req.axes[r.field]
      const v =
        main?.state === 'specified' && typeof main.value === 'string' ? main.value : undefined
      if (v && choicesOf(req, r.against)[v] === 'exclude')
        out.push({
          fieldId: r.field,
          severity: 'warning',
          message: `${field(r.field).label}の「${termLabel(spec, field(r.field), v)}」が、${field(r.against).label}で「使用しない」になっています`,
        })
    }
  }

  for (const f of spec.fieldsDef.fields) {
    if (f.kind !== 'triSelect' || !f.vocabulary) continue
    const vocab = spec.vocabularyById.get(f.vocabulary)
    const choices = choicesOf(req, f.id)
    // 近い系統のペア（presets.md §5-3。判断ポイント22）
    for (const p of vocab?.warningPairs ?? []) {
      const [a, b] = p.ids
      if (choices[a] === 'use' && choices[b] === 'use')
        out.push({
          fieldId: f.id,
          severity: 'warning',
          message: `「${termLabel(spec, f, a)}」と「${termLabel(spec, f, b)}」を両方使用しています（${p.reason}）`,
        })
    }
    // 代表と兄弟の相反（presets.md §5-3。両方向。U4e の補完1）
    for (const rep of vocab?.items.filter((i) => i.represents) ?? []) {
      const c = choices[rep.id]
      if (!c) continue
      const cat = vocab?.categories?.find((x) => x.id === rep.represents)
      for (const sib of cat?.itemOrder ?? []) {
        const s = choices[sib]
        if (sib === rep.id || !s || s === c) continue
        out.push({
          fieldId: f.id,
          severity: 'warning',
          message: `「${termLabel(spec, f, rep.id)}」（${cat!.label}の代表）と「${termLabel(spec, f, sib)}」を、逆の指定にしています`,
        })
      }
    }
  }
  return out
}
