// 保存時の正規化（判断ポイント45。ui-and-nonfunctional.md §4-7 G3、song-file.md §6-3）。
// 保存する楽曲データ（自動保存・プロファイル・書き出し）は、次の形にしてから保存する:
//   (1) ①指定以外の項目は値を持たない（state だけ）
//   (2) 今の vocalMode で無効な項目（S6）は省略する
//   (3) インストのとき requestScope は combined、lyricsAuthor は null
// output のその他の値は触らない。画面上の一時保持（判断ポイント30）は保存データに入れない
import type { SongData, SongRequest } from '../types/song'
import { INSTRUMENTAL_ONLY_FIELDS, VOCAL_ONLY_FIELDS } from '../validation/check-saved'

function normalizeRequest(req: SongRequest): SongRequest {
  const vocal = req.vocalMode === 'vocal'
  const invalid = new Set(vocal ? INSTRUMENTAL_ONLY_FIELDS : VOCAL_ONLY_FIELDS)
  const axes: SongRequest['axes'] = {}
  for (const [fid, a] of Object.entries(req.axes)) {
    if (invalid.has(fid)) continue
    axes[fid] = a.state === 'specified' ? structuredClone(a) : { state: a.state }
  }
  const output = structuredClone(req.output)
  const out: SongRequest = { ...structuredClone(req), axes, output }
  if (req.vocalMode === 'instrumental') {
    out.lyricsAuthor = null
    if (Object.prototype.hasOwnProperty.call(output, 'requestScope'))
      output.requestScope = 'combined'
  }
  return out
}

/** 保存する形に正規化した楽曲データ（引数は書き換えない） */
export function normalizeForSave(song: SongData): SongData {
  return { ...song, requests: song.requests.map(normalizeRequest) }
}
