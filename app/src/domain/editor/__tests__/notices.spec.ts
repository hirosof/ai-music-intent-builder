// 依頼文の下の注意書き（§3-2・§3-3、判断ポイント41・42）。出す条件と、出ない側（教訓4-30）
import { describe, it, expect } from 'vitest'

import { spec } from '@/data/spec'
import { createInitialSong } from '@/domain/editor/initial'
import {
  CHIP_NOTICE,
  chipNotice,
  diffAxisNotice,
  lengthNotice,
  lengthNoticeText,
} from '@/domain/editor/notices'
import type { SongRequest } from '@/domain/types/song'

const base = (): SongRequest => createInitialSong(spec).requests[0]!
const vocal = (author: SongRequest['lyricsAuthor'], scope: string): SongRequest => ({
  ...base(),
  vocalMode: 'vocal',
  lyricsAuthor: author,
  output: { ...base().output, requestScope: scope },
})

describe('文字数超過の注意書き（§3-3）', () => {
  it('Suno で、スタイル欄が出る範囲（combined・style）だけ。上限はツールプロファイルの値', () => {
    expect(lengthNotice(spec, base())).toEqual({ limit: 1000, basicHint: true })
    expect(lengthNotice(spec, vocal('chat-ai', 'style'))?.limit).toBe(1000)
    expect(lengthNotice(spec, vocal('chat-ai', 'combined'))?.limit).toBe(1000)
    expect(lengthNotice(spec, vocal('chat-ai', 'lyrics'))).toBeNull()
    expect(lengthNotice(spec, { ...base(), toolId: 'other' })).toBeNull()
    // 上限を持つ別のツールでも出さない（Suno 固有の案内）
    const other = { ...spec.toolProfileById.get('suno')!, toolId: 'other' }
    const spec2 = { ...spec, toolProfileById: new Map([...spec.toolProfileById, ['other', other]]) }
    expect(lengthNotice(spec2, { ...base(), toolId: 'other' })).toBeNull()
    expect(lengthNotice(spec2, base())?.limit).toBe(1000)
  })

  it('基本プロンプトの一文は、粒度に基本が含まれるときだけ（省略は既定値＝基本・詳細）', () => {
    const only = (g: string[]) =>
      lengthNotice(spec, { ...base(), output: { ...base().output, granularity: g } })
    expect(only(['detailed'])?.basicHint).toBe(false)
    expect(only(['basic'])?.basicHint).toBe(true)
    const omitted = base()
    delete omitted.output.granularity
    expect(lengthNotice(spec, omitted)?.basicHint).toBe(true)
  })

  it('文面（§3-3 のとおり。上限は値から）', () => {
    expect(lengthNoticeText({ limit: 1000, basicHint: true })).toEqual({
      title: 'Suno のスタイル欄は1000文字までです。',
      lines: [
        'AI の回答が上限を超えていると、貼り付けたときに末尾が切れます。貼る前に文字数を確認してください。',
        '詳細プロンプトが長すぎるときは、基本プロンプトを使えます。',
      ],
    })
    expect(lengthNoticeText({ limit: 900, basicHint: false }).lines).toHaveLength(1)
    expect(lengthNoticeText({ limit: 900, basicHint: false }).title).toBe(
      'Suno のスタイル欄は900文字までです。',
    )
  })
})

describe('チップ化の案内（§3-2）', () => {
  it('Suno・歌あり・作詞AIへの指示・combined／lyrics のときだけ', () => {
    expect(chipNotice(vocal('chat-ai-instruction', 'combined'))).toBe(true)
    expect(chipNotice(vocal('chat-ai-instruction', 'lyrics'))).toBe(true)
    expect(chipNotice(vocal('chat-ai-instruction', 'style'))).toBe(false)
    expect(chipNotice(vocal('chat-ai', 'combined'))).toBe(false)
    expect(chipNotice(vocal(null, 'combined'))).toBe(false)
    expect(chipNotice(base())).toBe(false)
    // インストでは、作詞の主体が残っていても出さない
    expect(
      chipNotice({ ...vocal('chat-ai-instruction', 'combined'), vocalMode: 'instrumental' }),
    ).toBe(false)
    expect(chipNotice({ ...vocal('chat-ai-instruction', 'combined'), toolId: 'other' })).toBe(false)
  })

  it('一言は固定文', () => {
    expect(CHIP_NOTICE.phrase).toBe('添付のテーマ・指示に従い歌詞を作成してください')
    expect(CHIP_NOTICE.title).toBe('Suno の「作詞AIへの指示」欄に貼るとき')
  })
})

// UI 判断ポイント63 (B)。出る・出ない、vocalMode による有効・無効、解釈の幅
describe('案ごとの差の付け方の案内（UI 判断ポイント63）', () => {
  const withAxis = (
    axis: string,
    states: Record<string, string>,
    over: Partial<SongRequest> = {},
  ) => {
    const r = { ...base(), ...over }
    r.output = { ...r.output, diffAxis: axis, ...over.output }
    r.axes = { ...r.axes }
    for (const [fid, st] of Object.entries(states)) r.axes[fid] = { state: st } as never
    return r
  }
  const MOOD = { mood: 'specified', intensity: 'specified', brightness: 'specified' }
  // 有効な項目を、すべて「お任せ」以外にする（②を持たない項目はない。③を持つ項目は③、ほかは①）
  const noneDelegated = (vocal: boolean) =>
    Object.fromEntries(
      spec.fieldsDef.fields
        .filter((f) => f.states.delegated?.rule !== 'leave')
        .map((f) => [
          f.id,
          f.states.defaulted ? 'defaulted' : f.states.toolManaged ? 'toolManaged' : 'specified',
        ])
        .filter(([id]) => (vocal ? id !== 'structure' : !id!.startsWith('lyrics'))),
    )

  it('情緒の幅: 情緒・雰囲気の3項目がどれも「お任せ」でないと出る。項目名は項目の表示名から', () => {
    expect(diffAxisNotice(spec, withAxis('mood', MOOD))).toBe(
      'この軸の項目（基調となる情緒・強度・明暗）は、どれも「お任せ」でないため、案ごとの差が付きにくくなります',
    )
    // 1つでも「お任せ」なら出ない
    expect(diffAxisNotice(spec, withAxis('mood', { ...MOOD, brightness: 'delegated' }))).toBeNull()
    // 既定値は「お任せ」でない側に数える
    expect(
      diffAxisNotice(spec, withAxis('mood', { ...MOOD, intensity: 'defaulted' })),
    ).not.toBeNull()
  })

  it('お任せ・ほかの軸を選んでいるときは、情緒の項目を見ない', () => {
    expect(diffAxisNotice(spec, withAxis('auto', MOOD))).toBeNull()
    expect(diffAxisNotice(spec, withAxis('texture', MOOD))).toBeNull()
    expect(diffAxisNotice(spec, withAxis('mood', {}))).toBeNull() // 初期状態（お任せ）
  })

  it('編成・質感の幅: 対象のグループの項目全部（③の初期状態を含む）', () => {
    const sound = {
      leadInstruments: 'specified',
      accompanimentInstruments: 'specified',
      rhythmInstruments: 'specified',
      ensembleSize: 'defaulted',
    } // voiceTreatment は初期状態が③
    expect(diffAxisNotice(spec, withAxis('arrangement', sound))).toBe(
      'この軸の項目（主旋律を担う楽器・伴奏・支える楽器・リズムの担い手・声の扱い・編成の規模）は、どれも「お任せ」でないため、案ごとの差が付きにくくなります',
    )
    expect(
      diffAxisNotice(spec, withAxis('arrangement', { ...sound, voiceTreatment: 'delegated' })),
    ).toBeNull()
    const prod = {
      spatialTexture: 'defaulted',
      recordingTexture: 'specified',
      mixDirection: 'defaulted',
    }
    expect(diffAxisNotice(spec, withAxis('texture', prod))).toContain('（空間の質感・')
    expect(
      diffAxisNotice(spec, withAxis('texture', { ...prod, mixDirection: 'delegated' })),
    ).toBeNull()
  })

  it('出す条件: 案の数が2以上で、依頼文の範囲で外れていないとき', () => {
    expect(diffAxisNotice(spec, withAxis('mood', MOOD, { output: { variantCount: 1 } }))).toBeNull()
    expect(
      diffAxisNotice(spec, withAxis('mood', MOOD, { output: { variantCount: 2 } })),
    ).not.toBeNull()
    const lyrics = withAxis('mood', MOOD, {
      vocalMode: 'vocal',
      lyricsAuthor: 'chat-ai',
      output: { requestScope: 'lyrics' },
    })
    expect(diffAxisNotice(spec, lyrics)).toBeNull()
    // 範囲は scopeReq の側を見る
    expect(diffAxisNotice(spec, withAxis('mood', MOOD), lyrics)).toBeNull()
    expect(diffAxisNotice(spec, lyrics, base())).not.toBeNull()
  })

  it('解釈の幅: 有効な項目に「お任せ」が1つもないときだけ出る。除外・補足（②で足させない）は数えない', () => {
    const MSG = '「お任せ」の項目がないため、案ごとの差が付きにくくなります'
    expect(diffAxisNotice(spec, withAxis('interpretation', noneDelegated(false)))).toBe(MSG)
    expect(diffAxisNotice(spec, withAxis('interpretation', {}))).toBeNull()
    // お任せの軸は、「お任せ」の項目がなくても出さない
    expect(diffAxisNotice(spec, withAxis('auto', noneDelegated(false)))).toBeNull()
    expect(
      diffAxisNotice(
        spec,
        withAxis('interpretation', { ...noneDelegated(false), era: 'delegated' }),
      ),
    ).toBeNull()
    // 除外・補足が「お任せ」（初期状態）のままでも出る
    expect(noneDelegated(false)).not.toHaveProperty('notes')
  })

  it('vocalMode で無効な項目は数えない（インストの歌詞、歌ありの構成）', () => {
    const MSG = '「お任せ」の項目がないため、案ごとの差が付きにくくなります'
    const vocal = { vocalMode: 'vocal' as const, lyricsAuthor: 'chat-ai' as const }
    // インスト: 歌詞の項目が「お任せ」でも、無効なので出る
    expect(
      diffAxisNotice(
        spec,
        withAxis('interpretation', { ...noneDelegated(false), lyricsTheme: 'delegated' }),
      ),
    ).toBe(MSG)
    // 歌あり: 構成（インスト専用）が「お任せ」でも、無効なので出る。歌詞の項目は数える
    const v = noneDelegated(true)
    expect(
      diffAxisNotice(spec, withAxis('interpretation', { ...v, structure: 'delegated' }, vocal)),
    ).toBe(MSG)
    expect(
      diffAxisNotice(spec, withAxis('interpretation', { ...v, lyricsTheme: 'delegated' }, vocal)),
    ).toBeNull()
    // 歌ありで歌詞の項目を指定しないままだと出ない
    expect(diffAxisNotice(spec, withAxis('interpretation', noneDelegated(false), vocal))).toBeNull()
  })

  it('依頼文の範囲がスタイルのみのとき、歌詞の項目（依頼文に出ない）は数えない', () => {
    const style = {
      vocalMode: 'vocal' as const,
      lyricsAuthor: 'chat-ai' as const,
      output: { requestScope: 'style' },
    }
    expect(diffAxisNotice(spec, withAxis('interpretation', noneDelegated(false), style))).toBe(
      '「お任せ」の項目がないため、案ごとの差が付きにくくなります',
    )
  })
})
