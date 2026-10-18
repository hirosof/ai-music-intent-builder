# 地域・文化の様式（軸B）の語彙

- 作成日: 2026-09-18
- 語数: 11（既定で表示）
- 既定で非表示の語: 0
- 手順・細則・略号: `../README.md`（V-xx）、`../input-items.md` グループ2「地域・文化の様式」「様式の寄せ方」
- 資料の方針: 専用資料なし。ジャンル資料中に散在する語を材料とする（判断ポイント162 案B）
- 辞典形式（R-19）を適用（判断ポイント167の方針を本軸にも適用。判断ポイント190）
- **伝統・現代の区別は含めない**。別項目「様式の寄せ方」（`〜風`/伝統寄り/現代寄り）が別軸で担うため
  （`../../input-items.md` 判断ポイント5、`../genres/east-asian.md` の `japanese-traditional` 除外注記）

---

## 0. 位置づけ

ジャンルの語彙作成の過程で、地域の形容（Celtic、Japanese Traditional 等）は
ジャンル語ではなく本項目で扱うと決めた語（R-a、`targetAxis: "地域・文化の様式"`）と、
各カテゴリの「1資料のみの語」に埋もれていた地域名（Middle Eastern Music、Balkan、Nordic Folk 等。
`genres/world.md` 判定注記8）を主な材料とする。

ジャンルと異なり「3資料以上」を機械的に適用できる専用資料がないため、本項目では
(a) ジャンル資料でR-aとして明示的に地域・文化の様式へ送られた語、
(b) ジャンルの「1資料のみの語」リストに埋もれていた地域の形容、
(c) 骨格上の対称性から必要と判断した地域（東アジア3か国・世界の主要地域を漏れなく覆う）
の3種を区別して記録する。

## 1. 材料の収集

### 1-1. ジャンル語からR-aで明示的に送られた語

| 語 | 出典 | 除外時の記述 |
|---|---|---|
| Celtic | `genres/world.md`（既定で非表示 `celtic`） | 「他のジャンルに重ねる地域の形容」（`targetAxis: "地域・文化の様式"`） |
| Japanese Traditional | `genres/east-asian.md`（既定で非表示 `japanese-traditional`） | 「地域・文化の様式（Japanese）と様式の寄せ方（伝統寄り）の組み合わせで表す語」 |

### 1-2. ジャンルの「1資料のみの語」に埋もれていた地域の形容

`genres/world.md` 段階3の「1資料のみの語」欄（語ごとの判定がなく辞典に記録されなかった語）から、
地域・文化の様式として扱うべき形容を拾い出した。

| 地域 | 出典語（`genres/world.md`） |
|---|---|
| 中東 | Middle Eastern Music、Arabic Music、Persian Music、Turkish Music |
| バルカン | Balkan |
| 北欧 | Nordic Folk |
| ケルト圏個別 | Irish Traditional、Scottish Traditional（Celtic に統合。判定の注記1） |

### 1-3. 骨格上の対称性から追加した地域

ジャンルの骨格（`../README.md` §3-3）が地域別カテゴリとして扱った範囲
（日本・東アジア系＝日本/中国/韓国、ワールド系＝アフリカ/中東/南アジア/東南アジア/欧州）を
漏れなく覆うため、1-1・1-2 で material が見つからなかった地域も追加した。

| 地域 | 根拠 |
|---|---|
| 中国 | 東アジア系の骨格（日本・中国・韓国発祥のジャンル）に対応する形容が1-1・1-2 になかったため補った |
| 韓国 | 同上 |
| アフリカ | ワールド系の骨格（アフリカ・中東・南アジア・東南アジア・欧州）に対応する形容がなかったため補った |
| インド・南アジア | 同上（`genres/world.md` の Raga・Ghazal・Bhajan 等、南アジアの声楽語は R-b で除外されているが、地域の形容自体は資料に明示されていなかった） |
| 東南アジア | 同上 |
| ラテンアメリカ | 判断ポイント107・117（語「Latin」の保留）をここで解消。ジャンルの総称としては保留のままだが、地域・文化の様式の1項目としては採用する |

## 2. 結果

代表項目は置かない（判断ポイント191。地域はそれぞれ独立した選択肢で、束ねる総称語の概念がない）。

```json
{
  "items": [
    { "id": "japanese",       "label": "日本",       "categories": ["region-style"], "term": { "en": "Japanese" } },
    { "id": "chinese",        "label": "中国",       "categories": ["region-style"], "term": { "en": "Chinese" } },
    { "id": "korean",         "label": "韓国",       "categories": ["region-style"], "term": { "en": "Korean" } },
    { "id": "celtic",         "label": "ケルト",     "categories": ["region-style"], "term": { "en": "Celtic" }, "aliases": ["アイルランド", "スコットランド", "Irish", "Scottish"] },
    { "id": "middle-eastern", "label": "中東",       "categories": ["region-style"], "term": { "en": "Middle Eastern" }, "aliases": ["アラブ", "Arabic"] },
    { "id": "balkan",         "label": "バルカン",   "categories": ["region-style"], "term": { "en": "Balkan" } },
    { "id": "nordic",         "label": "北欧",       "categories": ["region-style"], "term": { "en": "Nordic" } },
    { "id": "african",        "label": "アフリカ",   "categories": ["region-style"], "term": { "en": "African" } },
    { "id": "indian",         "label": "インド",     "categories": ["region-style"], "term": { "en": "Indian" }, "aliases": ["南アジア", "South Asian"] },
    { "id": "southeast-asian","label": "東南アジア", "categories": ["region-style"], "term": { "en": "Southeast Asian" } },
    { "id": "latin-american", "label": "ラテンアメリカ", "categories": ["region-style"], "term": { "en": "Latin American" } }
  ]
}
```

## 既定で非表示の語（V-16）

該当なし。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | Irish Traditional・Scottish Traditional は Celtic に統合した。`genres/world.md` でも Celtic が「ケルトなど欧州の伝統」として上位概念で扱われており、アイルランド・スコットランドを別項目にすると粒度が細かくなりすぎる。別名として残した |
| 2 | Turkish Music・Persian Music・Arabic Music は「中東」に統合した。個別の国・言語圏に分けるとジャンルの語彙（Arabic Classical 等）との境界が曖昧になり、`../input-items.md` の「地域・文化の様式は地域ごとに1項目」（判断ポイント117）の粒度感に合わせた |
| 3 | 「ラテンアメリカ」の採用で、判断ポイント107・117（語「Latin」の保留）を本軸で解消した。ジャンルの総称としての「Latin」は引き続き保留のまま（`latin.md` は未変更） |
| 4 | 1-3 の6地域（中国・韓国・アフリカ・インド・東南アジア・ラテンアメリカ）はジャンル資料に明示的な形容として現れなかったため、ジャンルの骨格の地域区分から対称的に補った。V-03のような段階3の個別審査は行っていない（専用資料がなく、査定する対象の語自体が資料にないため） |
| 5 | 伝統・現代の区別（和風の「伝統寄り」「現代寄り」等）は本項目に含めない。別項目「様式の寄せ方」が担う（`../../input-items.md` グループ2） |
| 6 | 11語はすべて Suno v6 で未検証（DP-06） |
