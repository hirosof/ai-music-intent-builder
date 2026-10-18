# 歌詞（軸G）の語彙

- 作成日: 2026-10-16
- 対象項目: `../input-items.md` 判断ポイント26「`lyricsStructure`」
- 資料の方針: 専用資料なし。`../scope.md` §4 の対応表（構成タグと日本での呼び方）と、
  `../input-items.md` 判断ポイント26（利用者の選択、2026-09-28）を根拠とする
- 辞典形式（R-19）は適用しない（既定で非表示の語がないため。V-16 を適用する語がない）

---

## 1. 歌詞の構成セクション（section-vocal）

`structure`（軸E・インスト用）とは別の語彙。歌あり（`vocalMode = vocal`）のときの
`lyricsStructure` が使う。インストの構成名（主題提示・展開部など。`section`。
`temporal-structure.md` §3）には A メロ・サビがなく、歌詞の構成には使えないため分離した
（`input-items.md` 判断ポイント26の訂正理由）。

語は `scope.md` §4 の対応表（構成タグと日本での呼び方）のまま7語。
`term.en` が依頼文で歌詞欄に付ける構成タグになる。

| id | ラベル | `term.en` |
|---|---|---|
| `intro` | イントロ | `intro` |
| `verse` | A メロ | `verse` |
| `pre-chorus` | B メロ | `pre-chorus` |
| `chorus` | サビ | `chorus` |
| `post-chorus` | サビ直後 | `post-chorus` |
| `bridge` | ブリッジ | `bridge` |
| `outro` | アウトロ | `outro` |

```json
{
  "items": [
    { "id": "intro",       "label": "イントロ",   "categories": ["section-vocal"], "term": { "en": "intro" } },
    { "id": "verse",       "label": "Aメロ",       "categories": ["section-vocal"], "term": { "en": "verse" } },
    { "id": "pre-chorus",  "label": "Bメロ",       "categories": ["section-vocal"], "term": { "en": "pre-chorus" } },
    { "id": "chorus",      "label": "サビ",       "categories": ["section-vocal"], "term": { "en": "chorus" } },
    { "id": "post-chorus", "label": "サビ直後",   "categories": ["section-vocal"], "term": { "en": "post-chorus" } },
    { "id": "bridge",      "label": "ブリッジ",   "categories": ["section-vocal"], "term": { "en": "bridge" } },
    { "id": "outro",       "label": "アウトロ",   "categories": ["section-vocal"], "term": { "en": "outro" } }
  ]
}
```

代表項目は置かない（各段階は独立した選択肢。`temporal-structure.md` §1・§2 と同型）。
既定で非表示の語は該当なし。

### 判定の注記

| # | 内容 |
|---|---|
| 1 | `scope.md` §4 の表では `[Bridge]` の日本での呼び方を「C メロに近い（厳密には一致しない）」と注記しているが、`input-items.md` 判断ポイント26 は7語を「イントロ・Aメロ・Bメロ・サビ・サビ直後・ブリッジ・アウトロ」と明示しており、ラベルは「ブリッジ」を採用した（Cメロとしない） |
| 2 | `axis` は `G`（`fields.json` のグループ G「歌詞」。`request-text.md` §8）。`input-items.md` 判断ポイント26 本文中の「（軸E）」という記載は、`structure` との対比としての言及と解釈し、`fields.json`・`presets.schema.json` 上の軸値としては採らなかった（補完・仮定。`request-text.md` §8 の「グループ G（歌詞）を足す」という明示の指示を優先） |
| 3 | すべて Suno v6 で個別の語としては未検証（DP-06）。Suno 作詞AI の実例（英語タグ＋日本語歌詞）で、歌詞欄への構成タグの対応自体は裏付けが取れている（`input-items.md` 判断ポイント26） |
