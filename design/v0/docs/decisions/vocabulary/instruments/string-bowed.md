# 擦弦楽器系（`string-bowed-instrument-family`）

- 作成日: 2026-09-18
- 語数: 13（既定で表示）
- 既定で非表示の語: 2（V-16）
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格、判断ポイント169: 弦楽器系の分割）
- 辞典形式（R-19）を適用（判断ポイント167）

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れは同一語として数える（V-01）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| ヴァイオリン | ○ | ○ | ○ | ○ | 4 |
| ヴィオラ | ○ | ○ | ○ | ○ | 4 |
| チェロ | ○ | ○ | ○ | ○ | 4 |
| コントラバス | ○ | ○ | ○ | ○ | 4 |
| 二胡 | ○ | ○ | ○ | ○ | 4 |
| ハーディ・ガーディ | ○ | ○ | ○ | ○ | 4 |
| フィドル | ○ | ○ | — | ○ | 3 |
| サーランギ | ○ | ○ | — | ○ | 3 |
| ケマンチェ | ○ | ○ | — | ○ | 3 |
| 胡弓 | ○ | ○ | — | ○ | 3 |
| エスラジ | ○ | ○ | — | ○ | 3 |

### 3資料未満（段階3の審査対象）

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| 高胡 | ○ | — | — | ○ | 2 |
| 馬頭琴 | ○ | — | — | ○ | 2 |
| ニッケルハルパ | ○ | — | — | ○ | 2 |
| ヴィオラ・ダ・ガンバ（ヴィオール属） | ○ | — | — | ○ | 2 |
| 中胡、板胡、京胡、ガドゥルカ、レベック 他 | ○ | — | — | — | 1（まとめて記録） |

## 段階2: Suno での実績

`../../../research/suno-profile.md` §5-1・末尾「生成後のスタイル文の観察」を確認した。

金管楽器系（`brass.md`）と同じ2箇所で、**「strings」という総称語**が確認できる。

- §5-1 生成曲1:「brass koto strings」
- 末尾「H-07検証」:「low strings, brass などの伴奏楽器」が追加された

→ 金管楽器系での判断（判断ポイント168）と同じ根拠で **Strings** を追加し、
擦弦楽器系の代表項目（`represents`）とする。ただし Strings は擦弦・撥弦の両方の弦楽器を含意し得る
（オーケストラの「ストリングス」は通常ヴァイオリン属を指すため、本カテゴリに置く。判断ポイント170）。

## 段階3: 2資料以下の語の審査（V-03・V-15）

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| 馬頭琴 | 2 | **追加** | (i) モンゴル特有の馬の毛弓による摩擦音と二弦の共鳴は他語で表せない。(ii) 文化的な知名度・需要も明確 |
| ヴィオラ・ダ・ガンバ | 2 | **追加** | (i) ガット弦・フレット付き構造による柔らかい古楽器の音色。(ii) クラシック系の古楽器需要に対応し、既存語（チェロ等）では代替できない |
| 高胡 | 2 | 追加しない | 二胡より高音域という差はあるが、資料に音色の記述がなく、需要も二胡ほど明確でない（`substitutable`: 二胡） |
| ニッケルハルパ | 2 | 追加しない | 鍵付き擦弦という独自性はあるが、資料に音色の記述がなく需要も不明（`substitutable`: ハーディ・ガーディ） |
| 1資料のみの語（中胡、板胡、京胡、ガドゥルカ、レベック） | 1 | 追加しない | 既存の胡琴類・擦弦語と他軸の組み合わせで表現でき、(ii) を満たさない可能性が高い |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a・R-b に該当する語はない。R-c（Strings と個々の楽器の関係）は、
金管楽器系の Brass と同様に代表項目として扱い、除外しない。

## 結果

```json
{
  "items": [
    { "id": "strings", "label": "Strings", "categories": ["string-bowed-instrument-family"], "represents": "string-bowed-instrument-family", "aliases": ["弦楽器", "ストリングス"] },
    { "id": "violin", "label": "ヴァイオリン", "categories": ["string-bowed-instrument-family"], "term": { "en": "Violin" } },
    { "id": "viola", "label": "ヴィオラ", "categories": ["string-bowed-instrument-family"], "term": { "en": "Viola" } },
    { "id": "cello", "label": "チェロ", "categories": ["string-bowed-instrument-family"], "term": { "en": "Cello" } },
    { "id": "double-bass", "label": "コントラバス", "categories": ["string-bowed-instrument-family"], "term": { "en": "Double Bass" }, "aliases": ["ウッドベース"] },
    { "id": "erhu", "label": "二胡", "categories": ["string-bowed-instrument-family"], "term": { "en": "Erhu" } },
    { "id": "hurdy-gurdy", "label": "ハーディ・ガーディ", "categories": ["string-bowed-instrument-family"], "term": { "en": "Hurdy-gurdy" } },
    { "id": "fiddle", "label": "フィドル", "categories": ["string-bowed-instrument-family"], "term": { "en": "Fiddle" } },
    { "id": "sarangi", "label": "サーランギ", "categories": ["string-bowed-instrument-family"], "term": { "en": "Sarangi" } },
    { "id": "kamancheh", "label": "ケマンチェ", "categories": ["string-bowed-instrument-family"], "term": { "en": "Kamancheh" } },
    { "id": "kokyu", "label": "胡弓", "categories": ["string-bowed-instrument-family"], "term": { "en": "Kokyū" }, "jpNative": true },
    { "id": "esraj", "label": "エスラジ", "categories": ["string-bowed-instrument-family"], "term": { "en": "Esraj" } },
    { "id": "morin-khuur", "label": "馬頭琴", "categories": ["string-bowed-instrument-family"], "term": { "en": "Morin Khuur" }, "jpNative": true },
    { "id": "viola-da-gamba", "label": "ヴィオラ・ダ・ガンバ", "categories": ["string-bowed-instrument-family"], "term": { "en": "Viola da Gamba" } }
  ]
}
```

## 既定で非表示の語（V-16）

```json
{
  "items": [
    { "id": "gaohu", "label": "高胡", "categories": ["string-bowed-instrument-family"], "term": { "en": "Gaohu" }, "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "二胡" } },
    { "id": "nyckelharpa", "label": "ニッケルハルパ", "categories": ["string-bowed-instrument-family"], "term": { "en": "Nyckelharpa" }, "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "ハーディ・ガーディ" } }
  ]
}
```

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 「Strings」を代表項目としたのは、金管楽器系の Brass（判断ポイント168）と同型の判断。オーケストラ用語としての「ストリングス」は擦弦楽器（ヴァイオリン属）を指すのが一般的なため、撥弦楽器系ではなくこちらに置いた（判断ポイント170） |
| 2 | 胡弓（日本）と二胡（中国）は別語として扱った。楽器としては近縁だが、資料でも別項目として記述され、V-01の表記揺れの範囲を超える |
| 3 | 馬頭琴・ヴィオラ・ダ・ガンバは資料の説明が薄く、一般的な知識による判定を含む（ジャンルの Piedmont Blues 等と同型。`../README.md` 判断ポイント86） |
| 4 | 13語はすべて Suno v6 で未検証（DP-06） |
