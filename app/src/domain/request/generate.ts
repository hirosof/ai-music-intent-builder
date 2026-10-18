// 依頼文の生成器（純関数）。楽曲データの依頼1件＋仕様 → 依頼文（markdown の文字列）。
// 文面の正は request-text.md（逐語的に再現する）、出力条件とデータの出所は request-blocks.md、描画規則は request-blocks.md §12。
// 節番号は描画時に、出力する節だけで振る（request-text.md 判断ポイント6）。
import { profileParam, type Spec } from '../spec'
import type { Param, ToolField, ToolProfile } from '../types/tool-profile'
import type { SongRequest } from '../types/song'
import { GenerationError } from './errors'
import {
  axisOf,
  effectiveState,
  hasExclusionTargets,
  requirementsBody,
  valueText,
  type RequestScope,
  type RequirementsContext,
} from './requirements'

const DIFF_AXIS_TEXT: Record<string, string> = {
  auto: '差を付ける軸はあなたが選んでください',
  mood: '明暗や強度を案ごとに変えてください',
  arrangement: '楽器の構成を案ごとに変えてください',
  texture: '空間の質感・音質・ミックスの方向性を案ごとに変えてください',
  interpretation: '「お任せ」項目の埋め方を案ごとに変えてください',
}

interface Ctx extends RequirementsContext {
  profile: ToolProfile
  /** ツール名（{{tool.name}}） */
  T: string
  vocal: boolean
  author: 'chat-ai' | 'chat-ai-instruction' | null
  /** 出力項目の値（省略は既定値） */
  out: (id: string) => unknown
}

const lines = (...xs: (string | false | null | undefined)[]) =>
  xs.filter((x): x is string => typeof x === 'string').join('\n')

function outputValue(spec: Spec, req: SongRequest, id: string): unknown {
  if (Object.prototype.hasOwnProperty.call(req.output, id)) return req.output[id]
  const o = spec.outputById.get(id)
  if (!o) throw new GenerationError(`出力項目の定義がない: ${id}`)
  return o.default
}

function toolField(ctx: Ctx, id: string): ToolField {
  const f = ctx.profile.fields.find((x) => x.id === id)
  if (!f) throw new GenerationError(`ツールプロファイルに欄がない: ${id}`)
  return f
}

function feature(ctx: Ctx, id: string) {
  return ctx.profile.features[id]
}

// ---------------------------------------------------------------------------
// 欄の上限と目標（request-blocks.md §6）
// ---------------------------------------------------------------------------
interface LimitText {
  /** 「上限」列（単位を含む） */
  limit: string
  /** 「目標」列 */
  target: string
  /** 目標の数値（文字数）。ないときは null */
  targetValue: number | null
}

function usableRecommendedTarget(ctx: Ctx, f: ToolField): number | null {
  // 断定の強さは limit.status と recommended.kind で決める。未検証・版が合わない情報は使わない（§6）
  const ok = (f.recommended ?? []).filter(
    (r) =>
      r.kind === 'target' &&
      !['unverified', 'thirdPartyUnversioned'].includes(r.meta?.source ?? '') &&
      (r.meta?.targetVersion === undefined || r.meta.targetVersion === ctx.profile.version.id),
  )
  if (ok.length > 0) {
    // 推奨値を使うときの 5-1 の注記の文言は、初めて必要になったときに決める（§6）
    throw new GenerationError(
      `未定義: 欄 ${f.id} の推奨値（recommended.target）を使うときの文面が決まっていない`,
    )
  }
  return null
}

function limitText(ctx: Ctx, f: ToolField): LimitText {
  const status = f.limit?.status
  const value = f.limit?.value
  if (status === 'confirmed' && typeof value === 'number') {
    const t = usableRecommendedTarget(ctx, f) ?? Math.floor(value * 0.9)
    return { limit: `${value}文字`, target: `${t}文字以内`, targetValue: t }
  }
  if (status === 'lowerBound' && typeof value === 'number') {
    const t = Math.floor(value * 0.9)
    return {
      limit: `少なくとも${value}文字（上限は未確認）`,
      target: `${t}文字以内`,
      targetValue: t,
    }
  }
  if (status === 'unknown') {
    usableRecommendedTarget(ctx, f)
    return { limit: '不明', target: 'できるだけ短く', targetValue: null }
  }
  throw new GenerationError(`欄 ${f.id} の上限（limit）を文字列にできない`)
}

/** スタイル欄・除外欄の言語（{{style.lang}}）。出力言語「標準」以外の文面は未定義 */
function styleLang(ctx: Ctx): string {
  const v = ctx.out('outputLanguage')
  if (v === 'mixed') return '英語を基本とし、日本固有のジャンル名・様式名は日本語のままでよい'
  throw new GenerationError(
    `未定義: 出力言語 ${String(v)} のときの欄の言語（{{style.lang}}）の文面が決まっていない`,
  )
}

// ---------------------------------------------------------------------------
// §5-2 と §7-7（request-blocks.md §7）
// ---------------------------------------------------------------------------
function modeParams(ctx: Ctx, modeId: string): Param[] {
  return ctx.profile.params.filter((p) => p.modes.includes(modeId))
}

function formatDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/** パラメータの既定値の表記（描画規則。request-blocks.md §12） */
function defaultText(p: Param): string {
  if (p.kind === 'slider') return `${String(p.default)}${p.range?.unit ?? ''}（既定値）`
  if (p.kind === 'toggle') return p.default === true ? 'オン' : 'オフ'
  if (p.kind === 'select') {
    const v = p.values?.find((x) => x.id === p.default)
    if (v) return `${v.label}（既定値）`
  }
  throw new GenerationError(`未定義: パラメータ ${p.id}（${p.kind}）の既定値の表記が決まっていない`)
}

interface ParamRows {
  /** §5-2 の行 [設定, 値] */
  fixed: [string, string][]
  /** §7-7 の行 [設定, 範囲, 既定値] */
  recommend: [string, string, string][]
}

function paramRows(ctx: Ctx, modeId: string): ParamRows {
  const rec = ctx.out('recommendParams')
  const recOn = (id: string) =>
    typeof rec === 'object' && rec !== null && (rec as Record<string, unknown>)[id] === true
  const rows: ParamRows = { fixed: [], recommend: [] }
  for (const p of modeParams(ctx, modeId)) {
    if (p.requestRole === 'input') {
      const b = ctx.profile.bindings.find(
        (x) =>
          x.target?.kind === 'param' &&
          x.target.id === p.id &&
          (x.route === 'uiSetting' || x.route === 'both'),
      )
      if (!b) continue // 入力項目を持たない（vocal-gender）
      if (b.item.kind === 'axis') {
        const f = ctx.spec.fieldById.get(b.item.id)
        if (!f) throw new GenerationError(`bindings の項目がない: ${b.item.id}`)
        const a = axisOf(ctx.req, f)
        if (effectiveState(ctx, f) === 'toolManaged') continue // B-05L を出す
        if (p.kind === 'duration' && typeof a.value === 'number')
          rows.fixed.push([p.label, formatDuration(a.value)])
        else throw new GenerationError(`未定義: パラメータ ${p.id} の値の表記`)
      } else {
        const v = ctx.out(b.item.id)
        const label = p.values?.find((x) => x.id === v)?.label
        if (!label) throw new GenerationError(`パラメータ ${p.id} の選択肢にない値: ${String(v)}`)
        rows.fixed.push([p.label, label])
      }
    } else if (p.requestRole === 'recommend') {
      if (recOn(p.id)) {
        if (p.kind !== 'slider' || !p.range)
          throw new GenerationError(
            `未定義: パラメータ ${p.id}（${p.kind}）の推奨値の行の表記が決まっていない`,
          )
        rows.recommend.push([
          p.label,
          `${p.range.min}〜${p.range.max}${p.range.unit ?? ''}`,
          defaultText(p),
        ])
      } else {
        rows.fixed.push([p.label, defaultText(p)])
      }
    }
  }
  return rows
}

// ---------------------------------------------------------------------------
// 文書の組み立て
// ---------------------------------------------------------------------------
interface Section {
  title: string
  /** 段落（空行で区切る） */
  body: string[]
}

export interface GenerateInput {
  spec: Spec
  req: SongRequest
}

/** 依頼文を生成する。未定義の組み合わせは GenerationError */
export function generateRequestText({ spec, req }: GenerateInput): string {
  if (req.generationType !== 'new') {
    throw new GenerationError(
      '未定義: 派生生成のブロック（B-DF・B-03d）は第2段階（初版の対象外。F6）',
    )
  }
  const profile = spec.toolProfileById.get(req.toolId)
  if (!profile) throw new GenerationError(`未知の toolId: ${req.toolId}`)
  const mode = profile.modes.find((m) => m.generationType === req.generationType)
  if (!mode) throw new GenerationError(`モードがない: generationType = ${req.generationType}`)
  const screen = profile.screens.find((s) => s.id === mode.screen)
  if (!screen) throw new GenerationError(`画面がない: ${mode.screen}`)

  const scopeRaw = Object.prototype.hasOwnProperty.call(req.output, 'requestScope')
    ? req.output.requestScope
    : 'combined'
  if (scopeRaw !== 'combined' && scopeRaw !== 'style' && scopeRaw !== 'lyrics') {
    throw new GenerationError(`依頼文の範囲が不正: ${String(scopeRaw)}`)
  }
  const scope: RequestScope = scopeRaw
  const vocal = req.vocalMode === 'vocal'
  if (scope !== 'combined' && !vocal)
    throw new GenerationError('依頼文の範囲 style／lyrics は、歌ありのときだけ（F13）')
  if (vocal && req.lyricsAuthor === null)
    throw new GenerationError('歌ありで lyricsAuthor がない（F12）')

  const ctx: Ctx = {
    spec,
    req,
    scope,
    profile,
    T: profile.label,
    vocal,
    author: vocal ? req.lyricsAuthor : null,
    out: (id) => outputValue(spec, req, id),
  }
  const T = ctx.T
  const toolLine = `${T} ${profile.version.id}（${screen.label}モード）`
  const withStyle = scope !== 'lyrics'
  const withLyrics = vocal && scope !== 'style'
  const isChatAi = ctx.author === 'chat-ai'
  const isInstruction = ctx.author === 'chat-ai-instruction'
  const lyricsItemName = isChatAi ? '歌詞' : '作詞AIへの指示'

  const exclusionField = feature(ctx, 'exclusion-field')
  const withExclusion = withStyle && hasExclusionTargets(ctx)
  if (withExclusion && !exclusionField?.supported) {
    throw new GenerationError('除外対象があるが、ツールに除外欄がない（文面が未定義）')
  }

  const lengthField = spec.fieldById.get('length')
  const lengthAuto = lengthField ? effectiveState(ctx, lengthField) === 'toolManaged' : false
  const lyricsStructureSpecified =
    vocal &&
    spec.fieldById.has('lyricsStructure') &&
    effectiveState(ctx, spec.fieldById.get('lyricsStructure')!) === 'specified'

  const variantCount = ctx.out('variantCount')
  if (typeof variantCount !== 'number') throw new GenerationError('案の数が数値でない')
  const granularity = ctx.out('granularity')
  const gran = Array.isArray(granularity) ? (granularity as string[]) : []
  const outputLanguage = ctx.out('outputLanguage')
  const titleOn = ctx.out('titleSuggestions') === true
  const titleBinding = profile.bindings.find(
    (b) =>
      b.item.kind === 'output' &&
      b.item.id === 'titleSuggestions' &&
      b.route === 'text' &&
      b.target?.kind === 'field',
  )
  const withTitle = titleOn && scope !== 'style' && titleBinding !== undefined

  // --- §5-2 の行 ---
  const params = paramRows(ctx, mode.id)
  // lyrics の 5-2 は長さの行だけ（request-text.md §2 末尾 (4)）
  const show52 = scope === 'lyrics' || params.fixed.length > 0
  const withRecommend = withStyle && params.recommend.length > 0

  const sections: Section[] = []

  // B-01（＋ B-01i／B-01v）
  const subject =
    scope === 'style'
      ? '新規生成の楽曲1曲のスタイル欄に入れるテキスト'
      : scope === 'lyrics'
        ? isChatAi
          ? '新規生成の楽曲1曲の歌詞'
          : '新規生成の楽曲1曲の、作詞AIへの指示文'
        : '新規生成の楽曲1曲'
  const intro = [
    `- あなたの役割は、音楽生成AI「${toolLine}」の入力欄に貼り付けるテキストを作ることです。`,
    '- あなた自身が音楽・音声・画像・動画を生成する機能を持っている場合でも、この依頼ではそれらを起動しないでください。求めているのはテキストのみです。',
    '- 私に確認の質問はしないでください。情報が足りない箇所は §2 のルールに従って補完し、1回の回答で最後まで出力してください。判断に迷った点は、質問ではなく最後の「注意事項」に書いてください。',
    `- 今回の対象は、${subject}です。`,
    '- 回答の説明文は日本語で書いてください。各欄に入れるテキスト自体の言語は §5 の表に従います。',
  ]
  const voiceNote =
    '- §6 の「声の扱い」は、合唱・ハミングなど、歌詞のある歌唱とは別の、声の要素についての指定です。「声を入れない」と書かれている場合も、歌唱を入れないという意味ではありません。合唱やハミングなどの声の要素を足さない、という意味です。'
  const tagNote =
    '- 歌詞欄に入れる構成タグ（[Verse] や [Chorus] など）は、「歌詞の作成」の節の指定に従って付けてください。'
  if (!vocal) {
    const inst = feature(ctx, 'instrumental')
    if (!inst?.supported || inst.method !== 'empty-lyrics') {
      throw new GenerationError(
        '未定義: インストの指定方法（features.instrumental）に対応する文面がない',
      )
    }
    intro.push(
      `- 今回はインストゥルメンタル（歌詞のない楽曲）です。歌詞は作らないでください。${T} では歌詞欄を空にすることがインストの条件であるため、歌詞欄は出力の対象外です。`,
    )
    if (feature(ctx, 'meta-tags')?.supported) {
      intro.push(
        '- 歌詞欄に入れる構成タグ（[Verse] や [Chorus] など）も出力しないでください。曲の展開はスタイル欄の文章として表現してください。',
      )
    }
    if (exclusionField?.supported) {
      intro.push(
        '- インストになるかどうかは歌詞欄を空にすることで決まります。歌が入ることを心配して、「スタイルを除外」欄に歌唱や歌詞に関する語を足す必要はありません。',
      )
    }
  } else if (scope === 'combined') {
    intro.push(
      '- 今回はボーカル入りの楽曲です。歌詞（または作詞AIへの指示文）は、「歌詞の作成」の節に従って作成してください。',
    )
    if (isChatAi) intro.push(tagNote)
    intro.push(voiceNote)
  } else if (scope === 'style') {
    intro.push(
      '- 今回はボーカル入りの楽曲です。この依頼で作るのはスタイル欄に入れるテキストだけです。歌詞（または作詞AIへの指示文）は別の依頼で作成するため、この依頼では作成も出力もしないでください。',
      voiceNote,
    )
  } else {
    intro.push(
      '- 今回はボーカル入りの楽曲です。この依頼で作るのは、歌詞（または作詞AIへの指示文）だけです。スタイル欄に入れるテキストは別の依頼で作成するため、この依頼では作成も出力もしないでください。',
      '- 歌詞（または指示文）は、「歌詞の作成」の節に従って作成してください。',
    )
    if (isChatAi) intro.push(tagNote)
  }
  sections.push({ title: '依頼の前提', body: [intro.join('\n')] })

  // B-02
  sections.push({
    title: '値の状態の読み方',
    body: [
      '§6 の要件表では、すべての項目に「状態」が付いています。意味は次のとおりです。',
      lines(
        '| 状態 | 意味 | あなたの扱い |',
        '|---|---|---|',
        '| 指定 | 私が値を決めた | その値に従う。§2-2 の範囲で言い換え・具体化してよい |',
        '| お任せ | あなたが決めてよい | §2-1 に従って決める。決めた内容は補完一覧に書く |',
        '| 既定値 | 既定値をそのまま使う（値は表に書いてある） | その値を前提にしてよい。補完一覧には書かない |',
        `| ツール任せ | 生成時に ${T} 側が決める（値は誰にもわからない） | その値を前提にした記述をしない。補完一覧には書かない |`,
      ),
      '### 2-1. 「お任せ」の決め方',
      lines(
        '- 「値」の列に、判断の手がかりが書かれています。その手がかりから内容を決めてください。手がかりが使えない場合の扱いも、同じ列に書いてあります。',
        '- 「指定しないまま残す」と書かれている項目は、何も決めず、その要素に触れないまま出力してください。指定していない要素が勝手に増えることを避けるためです。',
      ),
      '### 2-2. 具体化の許容度',
      '「具体化」の列は次の分類です。',
      lines(
        '| 分類 | できること |',
        '|---|---|',
        '| 拡張可 | 指定を出発点に、それに合う要素を足してよい |',
        '| 翻案可 | 指定を別の言葉に置き換えてよい。要素は足さない |',
        '| 保持 | 指定をそのまま使う。言い換えも最小限にとどめる |',
      ),
      '### 2-3. 具体化した内容を書く場所',
      'ある項目を具体化した結果が別の軸の内容になる場合、その内容は本来の軸の記述として書いてください。',
      '例: 「和風」（様式）から尺八と太鼓を導いた場合、尺八と太鼓は「音の構成」の内容として書きます。様式の記述を「和風（尺八と太鼓を含む）」のように膨らませないでください。同じ内容が複数箇所に現れると、文字数を無駄に使います。',
    ],
  })

  // B-03（B-03p／B-03q。B-03d は派生生成のみ）
  const priorities = [
    '§4 の禁止事項',
    show52
      ? `${T} の制約（欄の有無、文字数上限、§5-2 で確定している設定）`
      : `${T} の制約（欄の有無、文字数上限）`,
    '私の指定（状態が「指定」のもの）',
    'あなたの補完（状態が「お任せ」のもの）',
  ]
  sections.push({
    title: '優先順位',
    body: [
      '矛盾が生じたときは、上にあるものを優先してください。優先順位はこの節だけで定義します。他の節に個別の優先ルールは書きません。',
      priorities.map((p, i) => `${i + 1}. ${p}`).join('\n'),
      '「私の指定」の中で矛盾がある場合は、次のとおりに扱ってください。',
      lines(
        '- 自由記述（「その他・補足」）と構造化された項目が矛盾する場合は、自由記述を優先する',
        '- 「使用する」と「使用しない」が矛盾する場合は、使用しない（除外）を優先する',
      ),
      '矛盾を解決した場合は、「何と何が矛盾し、どちらを採ったか」を「注意事項」に書いてください。',
    ],
  })

  // B-04（＋ B-04v）
  sections.push({
    title: '禁止事項',
    body: [
      lines(
        `- 実在するアーティスト名・グループ名・曲名・既存の歌詞を使わないでください。理由は2つあります。ひとつは権利上の問題、もうひとつは ${T} 側で生成を拒否される原因になることです。`,
        '- 参考にしたい対象がある場合は、名前を出さず、ジャンル・年代・楽器編成・演奏の質感・歌い方といった特徴に分解して表現してください。',
        '- 私の入力に実在の固有名詞が含まれていた場合も、無視せずに特徴へ分解して使い、分解したことを「注意事項」に書いてください。',
        '- 暴力・差別・性的な表現など、不適切な内容を含めないでください。',
        withLyrics &&
          '- 歌詞は、既存の曲の歌詞を引用・改変せず、独自の表現で書いてください。特定の曲を連想させる固有のフレーズや言い回しも避けてください。',
      ),
    ],
  })

  // B-05
  const s5: string[] = [`対象: ${toolLine}`, '### 5-1. 出力する欄']
  const rows51: string[] = ['| 欄 | 上限 | 目標 | 言語 |', '|---|---|---|---|']
  if (withStyle) {
    const st = limitText(ctx, toolField(ctx, profile.defaultDescriptionField))
    rows51.push(
      `| ${toolField(ctx, profile.defaultDescriptionField).label} | ${st.limit} | ${st.target} | ${styleLang(ctx)} |`,
    )
    if (withExclusion) {
      const exf = toolField(ctx, exclusionField!.field!)
      const ex = limitText(ctx, exf)
      rows51.push(`| ${exf.label} | ${ex.limit} | ${ex.target} | ${styleLang(ctx)} |`)
    }
  }
  if (withTitle) {
    const tf = toolField(ctx, titleBinding!.target!.id)
    rows51.push(`| ${tf.label} | ${limitText(ctx, tf).limit} | できるだけ短く | 日本語 |`)
  }
  if (withLyrics && isChatAi) {
    const lf = lyricsField(ctx)
    const l = limitText(ctx, lf)
    rows51.push(
      `| 歌詞 | ${l.limit} | ${l.target} | §6 の「歌詞本文の言語」に従う${lf.languageNote ? `（${lf.languageNote}）` : ''} |`,
    )
  }
  if (withLyrics && isInstruction) {
    const pf = toolField(ctx, 'lyrics-prompt')
    const l = limitText(ctx, pf)
    rows51.push(`| ${pf.label} | ${l.limit} | ${l.target} | 日本語 |`)
  }
  s5.push(
    rows51.join('\n'),
    lines(
      `- 上限は ${T} 側の制限です。目標は、推奨値があればその値、なければ上限の9割です（余裕を持たせるための値）。`,
      '- 文字数を数えて申告する必要はありません。目標の長さに収まるように書いてください。文字数の確認は私の側で行います。',
    ),
  )
  const table52 = (rows: [string, string][]) =>
    lines('| 設定 | 値 |', '|---|---|', ...rows.map(([a, b]) => `| ${a} | ${b} |`))
  if (scope === 'lyrics') {
    const lengthRows = params.fixed.filter(
      ([label]) => label === profileParam(profile, 'length')?.label,
    )
    s5.push(
      `### 5-2. ${T} 側で確定している設定`,
      `次の設定は ${T} の UI で私が指定します。`,
      lengthAuto
        ? `長さは Auto です。生成時に ${T} が決めるため、特定の長さを前提にした記述をしないでください。`
        : table52(lengthRows),
      `歌詞（または指示文）の分量は、「歌詞の作成」の節に従います。ここに挙げていない ${T} の設定にも言及しないでください。`,
    )
  } else if (show52) {
    s5.push(
      `### 5-2. ${T} 側で確定している設定（本文に書かないこと）`,
      `次の設定は ${T} の UI で私が指定します。スタイル欄の文章の中で重ねて指定しないでください。`,
      table52(params.fixed),
      lines(
        'これらの値は、スタイル欄の文章の中で、曲の長さやループの尺度としても書かないでください（例:「3分間のループ」のような書き方をしない）。',
        isInstruction &&
          scope === 'combined' &&
          '作詞AIへの指示文に書く曲の長さの扱いは、「歌詞の作成」の節に従います。',
        `また、ここに挙げていない ${T} の設定にも言及しないでください。`,
      ),
    )
    if (lengthAuto)
      s5.push(
        `長さは Auto です。生成時に ${T} が決めるため、特定の長さを前提にした記述をしないでください（例:「3分の曲なので中間に間奏を置く」）。`,
      )
  }
  if (withStyle) {
    const variation = profileParam(profile, 'variation')
    const vv = variation?.values?.find((x) => x.id === ctx.out('variation'))
    if (!vv || vv.rewritesStyle === undefined)
      throw new GenerationError('バリエーションの値（rewritesStyle）がない')
    s5.push(
      '### 5-3. 書き方',
      lines(
        '- 重要な要素を先頭に置いてください。',
        '- スタイル欄の要素の順序は、ジャンル・様式 → 声の扱い → テンポ（BPM） → 情緒・雰囲気 → 楽器編成 → 展開 → 質感 を基本としてください。',
        '- 複数のジャンルを組み合わせる場合は、主となるジャンルを先に書き、他を with や meets でつないでください。',
        '- 楽器は役割を明示してください（主旋律を担う楽器、伴奏を担う楽器、リズムを担う楽器）。',
        '- スタイル欄は「あるもの」を書く欄です。no ○○ / without ○○ / rather than ○○ のような、要素を打ち消す書き方を使わないでください。「○○-free」「non-○○」「○○なし」のように、語尾や接頭辞で打ち消す形も同じです。打ち消したくなったときは、あるものを肯定形で書いてください（例: round, smooth melodic bass）。除外したい要素は「スタイルを除外」欄に書きます。ただし wordless のように、要素そのものの名前に含まれる語は問題ありません。',
        !vocal &&
          '- 今回はインストです。声を決める場合も、歌詞のある歌にならない表現を選んでください（例: 言葉のない合唱、ハミング）。',
        vocal &&
          `- 今回は歌入りです。歌唱の質感や歌い方、歌い手の性別は、§6 に指定がない限りスタイル欄に書かないでください。歌い手の性別は ${T} 側の設定で決めます。`,
        vocal &&
          lyricsStructureSpecified &&
          '- スタイル欄の「展開」の記述は、§6 の「歌詞の構成」と矛盾しないようにしてください（例: 歌詞にブリッジがないのに、展開にブリッジを書かない）。',
        vv.rewritesStyle
          ? `- バリエーション設定が「${vv.label}」のため、あなたが書いたスタイルは ${T} 側で書き換えられます。あなたの記述は最終形ではなく、書き換えの元になる材料です。細部を書き込むより、曲の性格を決める核となる要素を短く、前方に置いてください。`
          : `- バリエーション設定が「オフ」のため、あなたが書いたスタイルはそのまま最終形として使われます。${T} 側での書き換えは起きません。必要な要素をすべて含んだ、完成した記述を書いてください。`,
      ),
    )
  }
  sections.push({ title: '対象ツールと出力欄', body: s5 })

  // B-06
  sections.push({ title: '楽曲の要件', body: requirementsBody(ctx, { withExclusion }) })

  // B-LY（歌詞の作成）
  if (withLyrics) {
    const body: string[] = []
    const themeLeft = valueText(ctx, 'lyricsTheme') === 'お任せ — 指定しないまま残す'
    if (isChatAi) {
      body.push(`歌詞そのものを、あなたが書いてください。歌詞は ${T} の歌詞欄に貼り付けます。`)
    } else {
      body.push(
        lines(
          `歌詞そのものではなく、${T} の作詞AIに渡す指示文を、あなたが書いてください。歌詞は ${T} 側で生成されます。`,
          lyricsStructureSpecified
            ? '指示文には、§6 の G の要件（テーマ・言語・構成）を含めてください。'
            : '指示文には、§6 の G の要件（テーマ・言語）を含めてください。歌詞の構成は指定がないため、指示文に含めないでください。',
        ),
      )
    }
    body.push(
      lines(
        '- 歌詞の分量は、§6 の歌詞の構成と、§5-2 に長さの指定があるときはその長さに見合う量にしてください。',
        '- 歌い手の性別は ' +
          T +
          ' 側の設定で決めるため、特定の性別を前提にした一人称・語尾・表現は避けてください。',
        isChatAi && '- 一人称を使わず、情景の描写を中心にしてもよいです。',
        isInstruction &&
          !lengthAuto &&
          '- 指示文には、歌詞の分量の目安として、§5-2 の曲の長さを書いてかまいません。',
        isInstruction &&
          lengthAuto &&
          '- 長さは Auto のため、指示文に曲の長さを書かないでください。',
        isChatAi &&
          themeLeft &&
          '- §6 の「歌詞のテーマ・内容」が「指定しないまま残す」となっている場合も、歌詞の内容はあなたが決めてください。決めた内容は補完一覧に書いてください。',
        isInstruction &&
          themeLeft &&
          '- §6 の「歌詞のテーマ・内容」が「指定しないまま残す」となっている場合は、指示文にテーマを含めず、作詞AIに任せてください。',
      ),
    )
    if (isChatAi && feature(ctx, 'meta-tags')?.supported) {
      if (lyricsStructureSpecified) {
        body.push(
          '歌詞の構成は、§6 の「歌詞の構成」に指定した順にしてください。次の対応で、各まとまりの直前に英語の構成タグを付けてください。',
          structureTags(ctx),
        )
      } else {
        body.push(
          '歌詞の構成は指定されていません。構成タグは付けず、空行でまとまりを区切って書いてください。',
        )
      }
    }
    const langField = spec.fieldById.get('lyricsLanguage')
    const langA = langField ? axisOf(req, langField) : undefined
    const english =
      langField && effectiveState(ctx, langField) === 'specified' && langA?.value === 'english'
    if (!english) {
      body.push(
        isChatAi
          ? lines(
              '歌詞を日本語で書く場合は、次の点に配慮してください。',
              '- 読み方が複数ある漢字は、意図した発音になるよう、ひらがなで書いてください。',
              '- カタカナ語は、日本語らしい発音にしたい場合、ひらがなで書いてください。',
              '- 「を」「は」など発音が特殊な助詞は、必要な箇所だけローマ字にしてもかまいません。多用は避けてください。',
            )
          : '歌詞を日本語で書く場合の希望として、「読み方が複数ある漢字はひらがなで書く」ことを、指示文に含めてください。',
      )
    }
    sections.push({ title: '歌詞の作成', body })
  }

  // B-07（出力形式）
  const sub: Section[] = []
  const hasCases = scope !== 'lyrics'
  const items = [
    hasCases && `案ごとの出力（${variantCount} 案）`,
    withLyrics && `${lyricsItemName}。案ごとではなく1回だけ`,
    '補完一覧',
    withTitle && '曲名案',
    '注意事項',
    '補足（必要な場合のみ）',
  ].filter((x): x is string => typeof x === 'string')
  sub.push({
    title: '全体の構成',
    body: [
      '次の順で出力してください。',
      items.map((x, i) => `${i + 1}. ${x}`).join('\n'),
      ...(hasCases
        ? [
            `各案の見出しには「案 N / ${variantCount}」のように、何番目の案かと総数を明記してください。`,
          ]
        : []),
      '上記以外の成果物（ファイルなど）は作らないでください。前置きや後書きも不要です。',
    ],
  })
  if (hasCases) {
    const basic = gran.includes('basic')
    const detailed = gran.includes('detailed')
    if (!basic && !detailed) throw new GenerationError('出力する粒度が空')
    const styleTarget = limitText(ctx, toolField(ctx, profile.defaultDescriptionField))
    sub.push({
      title: '各案に含めるもの',
      body: [
        '案ごとに、次を順に書いてください。',
        lines(
          basic &&
            '- 基本プロンプト: スタイル欄に入れる短い版。曲の性格を決める核となる要素だけを書く（ジャンル、様式、情緒の中心、主要な楽器）。数語から30語程度。コードブロックで囲む',
          detailed &&
            `- 詳細プロンプト: スタイル欄に入れる完成版。テンポ、楽器編成、声の扱い（§6 で触れると決めた場合のみ）、強弱の変化、残響やミックスまで含む。${styleTarget.target}。コードブロックで囲む`,
          outputLanguage !== 'all-japanese' && '- 日本語訳',
          '- この案の狙い: 1〜2文。他の案と何を変えたかを含める',
          withExclusion && '- スタイルを除外: コードブロックで囲む',
          withRecommend && '- 推奨パラメータ',
        ),
        ...(basic && detailed
          ? [
              '基本プロンプトと詳細プロンプトは、同じ要件から作られた2つの表現です。基本プロンプトは詳細プロンプトの核を抜き出したものであり、両者の内容が矛盾しないようにしてください。',
            ]
          : []),
      ],
    })
    if (variantCount >= 2) {
      const diff = DIFF_AXIS_TEXT[String(ctx.out('diffAxis'))]
      if (!diff)
        throw new GenerationError(`案ごとの差の付け方が不正: ${String(ctx.out('diffAxis'))}`)
      sub.push({
        title: '案ごとの差の付け方',
        body: [
          lines(
            '- 状態が「指定」の項目は、どの案でも変えないでください。',
            '- 「スタイルを除外」欄の内容は、どの案でも同じにしてください。',
            '- 差を付けてよいのは、状態が「お任せ」の項目と、「指定」項目を具体化する範囲です。',
            `- 今回の差の付け方: ${diff}`,
          ),
        ],
      })
    }
    if (outputLanguage !== 'all-japanese') {
      sub.push({
        title: '訳',
        body: [
          '基本プロンプトと詳細プロンプトのそれぞれの直後に、日本語訳を付けてください。片方だけにしないでください。訳はコードブロックには入れず、通常の文章として書いてください。コピーの対象と区別するためです。',
        ],
      })
    }
  }
  sub.push({
    title: '補完一覧',
    body: [
      lines(
        '- 状態が「お任せ」だった項目について、あなたが決めた内容を表で示してください。列は「項目」「決めた内容」「理由」です。理由は1行で簡潔に書いてください。',
        '- 表には全案に共通する補完だけを載せてください。' +
          (hasCases
            ? '案ごとに内容が異なる項目は、表の「決めた内容」に「案ごとに異なる」とだけ書き、実際の内容は各案の「狙い」に書いてください。'
            : ''),
        '- 状態が「指定」の項目を具体化・翻案した内容（例:「和風」から尺八を導いた）は、この表に含めないでください。',
        '- 「指定しないまま残す」と書かれていた項目についても、そのまま残した旨を1行書いてください。',
      ),
    ],
  })
  if (withTitle) {
    const tf = toolField(ctx, titleBinding!.target!.id)
    const count = ctx.out('titleCount')
    sub.push({
      title: '曲名案',
      body: [
        lines(
          `- 曲名案を ${String(count)} 個、日本語で出してください。`,
          '- 曲名案は案ごとではなく、回答の末尾にまとめて置いてください。同じプロンプトから複数の曲を作るためです。',
          `- ${limitText(ctx, tf).limit}以内に収めてください。実際にはもっと短いほうが扱いやすいです。`,
        ),
      ],
    })
  }
  if (withRecommend) {
    sub.push({
      title: '推奨パラメータ',
      body: [
        '次の設定について、今回の楽曲に適した値と、その理由を1行で示してください。設定を実際に変えるのは私です。',
        lines(
          '| 設定 | 範囲 | 既定値 |',
          '|---|---|---|',
          ...params.recommend.map((r) => `| ${r.join(' | ')} |`),
        ),
      ],
    })
  }
  sub.push({
    title: '注意事項',
    body: [
      '次に当てはまるものがあれば書いてください。なければこの節ごと省略してください。',
      lines(
        '- 矛盾を解決した箇所（何と何が矛盾し、どちらを採ったか）',
        '- 実在の固有名詞を特徴に分解した箇所',
        '- 私に確認したかったが、§1 の指示により質問せずに判断した箇所',
      ),
    ],
  })
  if (withLyrics) {
    sub.push({
      title: lyricsItemName,
      body: [
        isChatAi
          ? lines(
              '- 歌詞は、案ごとではなく、回答の中で1回だけ書いてください。どの案のスタイルとも組み合わせて使えるようにするためです。',
              `- 歌詞全体を、1つのコードブロックで囲んでください（${T} の歌詞欄にそのまま貼り付けるため）。`,
              '- 歌詞は、一人称を使わず情景の描写を中心にしてもかまいません（性別を前提にしない書き方のため）。',
              '- 書いた歌詞に日本語以外の言語（英語、または混在した部分）が含まれるときは、その部分の日本語訳を、コードブロックの外に通常の文章で付けてください。',
            )
          : lines(
              '- 指示文は、案ごとではなく、回答の中で1回だけ書いてください。',
              '- 指示文全体を、1つのコードブロックで囲んでください。日本語で書いてください。',
            ),
      ],
    })
  }

  // 描画: 節番号を、出力する節だけで振る
  const n = sections.length + 1
  const parts: string[] = ['# 音楽生成AI用プロンプト作成依頼']
  sections.forEach((s, i) => parts.push(`## ${i + 1}. ${s.title}`, ...s.body))
  parts.push(`## ${n}. 出力形式`)
  sub.forEach((s, i) => parts.push(`### ${n}-${i + 1}. ${s.title}`, ...s.body))
  return parts.join('\n\n') + '\n'
}

/** 歌詞欄（request-blocks.md §3-3。features.instrumental.field で引く。構成タグの書き先と同じ欄でなければ失敗） */
function lyricsField(ctx: Ctx): ToolField {
  const id = feature(ctx, 'instrumental')?.field
  if (!id) throw new GenerationError('歌詞欄を特定できない（features.instrumental.field）')
  const tags = feature(ctx, 'meta-tags')
  if (tags?.supported && tags.field !== id)
    throw new GenerationError('構成タグの書き先が歌詞欄と違う')
  return toolField(ctx, id)
}

/** 構成タグの対応（{{lyrics.structureTags}}）。初出の順、重複は1回。タグは term.en の各語の先頭を大文字に */
function structureTags(ctx: Ctx): string {
  const f = ctx.spec.fieldById.get('lyricsStructure')!
  const vocab = ctx.spec.vocabularyById.get(f.vocabulary ?? '')
  const v = axisOf(ctx.req, f).value
  if (!vocab || !Array.isArray(v)) throw new GenerationError('歌詞の構成の値が不正')
  const seen: string[] = []
  for (const id of v) if (!seen.includes(id)) seen.push(id)
  return seen
    .map((id) => {
      const item = vocab.items.find((x) => x.id === id)
      const en = item?.term?.en
      if (!item || !en) throw new GenerationError(`構成タグ（term.en）がない: ${id}`)
      const tag = en.replace(
        /(^|[\s-])([a-z])/g,
        (_m, sep: string, c: string) => sep + c.toUpperCase(),
      )
      return `- ${item.label}: [${tag}]`
    })
    .join('\n')
}
