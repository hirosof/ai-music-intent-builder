// 続けて頼む文: 案の比較図（request-text.md §2 の B-FC。文面の判断ポイント51、UI 判断ポイント83）。
// 依頼文の本体ではなく、チャットAI の回答のあとに同じ会話に貼る短い文。文面は request-text.md が正で、逐語的に再現する
import { requestScopeOf } from '../editor/cards'
import type { Spec } from '../spec'
import type { SongRequest } from '../types/song'

/** {{fc.axes}}（案ごとの差の付け方 diffAxis で出し分ける。B-FC の表） */
const FC_AXES: Record<string, string> = {
  mood: '横軸は明暗（"暗い" --> "明るい"）、縦軸は強度（"弱い" --> "強い"）にしてください。',
  arrangement:
    '横軸と縦軸には、今回付けた編成の違いが最もよく分かる尺度を、あなたが2つ選んでください。軸の両端の名前も書いてください（例: "少人数" --> "大編成"）。',
  texture:
    '横軸と縦軸には、今回付けた質感の違いが最もよく分かる尺度を、あなたが2つ選んでください。軸の両端の名前も書いてください（例: "近く乾いた音" --> "広く響く音"）。',
  auto: '横軸と縦軸には、あなたが案ごとに実際に付けた違いが最もよく分かる尺度を、2つ選んでください。軸の両端の名前も書いてください。',
  interpretation:
    '横軸と縦軸には、あなたが案ごとに実際に付けた違いが最もよく分かる尺度を、2つ選んでください。軸の両端の名前も書いてください。',
}

const template = (n: number, axes: string): string =>
  [
    `上の回答の各案（案1〜案${n}）を比べる図を、Mermaid の quadrantChart で出力してください。`,
    `- ${axes}`,
    `- 案ごとに点を1つ置き、${n}案すべてを入れてください。点の名前は「案1 短い特徴」の形にしてください。`,
    '- 位置は、今回の案どうしを比べた相対的な位置でかまいません。',
    '- 図は mermaid のコードブロックで囲み、図の後に、各案の位置の理由を1行ずつ書いてください。',
    '',
    '書き方の決まり（守らないと図が表示されません）:',
    '- 座標は0以上1以下の数値にする。最大値は「1」と書き、「1.0」「1.00」とは書かない。最小値は「0」と書く。それ以外の小数は「0.625」の形にする。',
    '- 点は1行に1つずつ書く。',
    '- 点の名前と軸の両端の名前は、それぞれ全体を二重引用符「"」で囲む（例: "案1 華やか・王道": [0.8, 0.7]、x-axis "暗い" --> "明るい"）。名前の中には二重引用符を使わない。',
  ].join('\n') + '\n'

/** 出す条件と、文に入れる値（案の数・差の付け方）。満たさないとき・不正な値のときは null */
function fcParams(spec: Spec, req: SongRequest): { n: number; axis: string } | null {
  const out = (id: string) => (id in req.output ? req.output[id] : spec.outputById.get(id)?.default)
  if (requestScopeOf(req) === 'lyrics') return null
  const n = out('variantCount')
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 2) return null
  const axis = String(out('diffAxis'))
  return axis in FC_AXES ? { n, axis } : null
}

/**
 * B-FC の文。出す条件（案の数が2以上、かつ依頼文の範囲が lyrics でない）を満たさないときは null。
 * 案の数・差の付け方が不正な値のときも null（そのときは依頼文の本体も生成できない）
 */
export function compareChartText(spec: Spec, req: SongRequest): string | null {
  const p = fcParams(spec, req)
  return p && template(p.n, FC_AXES[p.axis]!)
}

/** 比較図のタブの要約の一言で、軸を言う文（UI 判断ポイント83。軸を AI が選ぶときは、その旨） */
const SUMMARY_AXES: Record<string, string> = {
  mood: '明暗×強度の図（Mermaid）で比べてもらう文です。',
  arrangement:
    '2つの軸の図（Mermaid）で比べてもらう文です。軸は、編成の違いが分かるものをチャットAI が選びます。',
  texture:
    '2つの軸の図（Mermaid）で比べてもらう文です。軸は、質感の違いが分かるものをチャットAI が選びます。',
  auto: '2つの軸の図（Mermaid）で比べてもらう文です。軸は、案ごとに付けた違いが分かるものをチャットAI が選びます。',
  interpretation:
    '2つの軸の図（Mermaid）で比べてもらう文です。軸は、案ごとに付けた違いが分かるものをチャットAI が選びます。',
}

/** 控え方の注意（UI 判断ポイント83 の追記。画面の作りは変わりうるので「ChatGPT では」と限る） */
export const COMPARE_CHART_NOTE =
  'ChatGPT では、回答全体のコピーに図のコードが入りません。図の右上の「…」→「コードとしてコピー」で控えてください。'

/** 比較図のタブの先頭の要約の一言（UI 判断ポイント83）。出す条件は compareChartText と同じ */
export function compareChartSummary(spec: Spec, req: SongRequest): string | null {
  const p = fcParams(spec, req)
  return (
    p &&
    `案${p.n}件を、${SUMMARY_AXES[p.axis]!}チャットAI の回答のあとに、同じ会話に貼ってください。`
  )
}
