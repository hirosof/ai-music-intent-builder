// 依頼文の下の注意書き（§3-2・§3-3、判断ポイント41・42）。出す条件と、出ない側（教訓4-30）
import { describe, it, expect } from 'vitest'

import { spec } from '@/data/spec'
import { createInitialSong } from '@/domain/editor/initial'
import { CHIP_NOTICE, chipNotice, lengthNotice, lengthNoticeText } from '@/domain/editor/notices'
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
