# 木管楽器系（`woodwind-instrument-family`）

- 作成日: 2026-09-18
- 語数: 18（既定で表示）
- 既定で非表示の語: 0
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格。フリーリード楽器は本カテゴリに統合。判断ポイント164の判定注記1）
- 辞典形式（R-19）を適用（判断ポイント167）

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れは同一語として数える（V-01）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| フルート | ○ | ○ | ○ | ○ | 4 |
| クラリネット | ○ | ○ | ○ | ○ | 4 |
| オーボエ | ○ | ○ | ○ | ○ | 4 |
| ファゴット | ○ | ○ | ○ | ○ | 4 |
| サクソフォン | ○ | ○ | ○ | ○ | 4 |
| バグパイプ | ○ | ○ | ○ | ○ | 4 |
| 尺八 | ○ | ○ | — | ○ | 3 |
| 篠笛 | ○ | ○ | — | ○ | 3 |

### 3資料未満（段階3の審査対象）

C・S の民族系木管・フリーリード楽器の列挙は詳細だが、O・G は西洋クラシック楽器と
一部の地域代表例に絞っているため、ここに挙がる語は資料数の面では2資料以下になりやすい
（`../README.md` §1-2の楽器版の資料構成の違い。判断ポイント164 §1-1）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| ピッコロ | ○ | — | — | ○ | 2 |
| リコーダー | ○ | — | — | ○ | 2 |
| ハーモニカ | ○ | — | — | ○ | 2 |
| アコーディオン | ○ | — | — | ○ | 2 |
| 笙 | ○ | — | — | ○ | 2 |
| ネイ | — | ○ | ○ | — | 2 |
| ケーナ | ○ | — | — | ○ | 2 |
| ドゥドゥク | ○ | — | — | ○ | 2 |
| ズルナ | ○ | — | — | ○ | 2 |
| ひちりき | ○ | — | — | ○ | 2 |

## 段階2: Suno での実績

`../../../research/suno-profile.md` を確認した。**尺八・篠笛**がSuno自身の出力に
実際に現れていた実績がある（両語とも段階1で既に通過済みのため結果には影響しない。
判断ポイント177）。それ以外の語に総称的な実績はなく、代表項目は**置かない**（判断ポイント178。
西洋クラシック木管・民族リード楽器・フリーリード楽器という性質の異なる楽器群を束ねる
自然な総称語が資料にない。ハープ・ツィター系・世界のリュート系と同型）。

## 段階3: 2資料以下の語の審査（V-03・V-15）

資料の記述が薄い語が多いが、いずれも実際の音色が明確に異なり代替が利かないため、
一般的な知識による判定（ジャンルの Piedmont Blues 等と同型。`../README.md` 判断ポイント86）で
全語を追加した。

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| ピッコロ | 2 | **追加** | (i) フルートより高音域で鋭く突き抜ける音色。(ii) フルートでは代替できない |
| リコーダー | 2 | **追加** | (i) 素朴で柔らかいフィップル管の音色は、教育・古楽の文脈で明確に異なる。(ii) フルートでは代替できない |
| ハーモニカ | 2 | **追加** | (i) 自由簧によるベンド奏法特有の音色。(ii) ブルース・フォーク・カントリー系の需要が明確で代替不可 |
| アコーディオン | 2 | **追加** | (i) 蛇腹による自由簧の音色。(ii) タンゴ・フォーク・ミュゼット系の需要が明確で代替不可 |
| 笙 | 2 | **追加** | (i) 複数管の同時発音によるクラスター・ドローン音は他に類がない。(ii) 雅楽の文脈で代替不可 |
| ネイ | 2 | **追加** | (i) 息づかいの目立つ縁吹きの音色は中東・スーフィー音楽特有。(ii) 代替不可 |
| ケーナ | 2 | **追加** | (i) ノッチ付きの息の多い音色はアンデス音楽特有。(ii) 代替不可 |
| ドゥドゥク | 2 | **追加** | (i) 複簧による物悲しく息の多い音色。(ii) シネマティック系・アンビエント系での需要が高く（`../genres/cinematic.md`）代替不可 |
| ズルナ | 2 | **追加** | (i) 甲高く突き抜ける複簧の音色は中東・バルカンの祝祭音楽特有。(ii) 代替不可 |
| ひちりき | 2 | **追加** | (i) 鼻にかかった甲高い複簧の音色は雅楽特有。(ii) 代替不可 |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a・R-b・R-c に該当する語はない。

## 結果

```json
{
  "items": [
    { "id": "flute", "label": "フルート", "categories": ["woodwind-instrument-family"], "term": { "en": "Flute" } },
    { "id": "clarinet", "label": "クラリネット", "categories": ["woodwind-instrument-family"], "term": { "en": "Clarinet" } },
    { "id": "oboe", "label": "オーボエ", "categories": ["woodwind-instrument-family"], "term": { "en": "Oboe" } },
    { "id": "bassoon", "label": "ファゴット", "categories": ["woodwind-instrument-family"], "term": { "en": "Bassoon" } },
    { "id": "saxophone", "label": "サクソフォン", "categories": ["woodwind-instrument-family"], "term": { "en": "Saxophone" } },
    { "id": "bagpipes", "label": "バグパイプ", "categories": ["woodwind-instrument-family"], "term": { "en": "Bagpipes" } },
    { "id": "shakuhachi", "label": "尺八", "categories": ["woodwind-instrument-family"], "term": { "en": "Shakuhachi" }, "jpNative": true },
    { "id": "shinobue", "label": "篠笛", "categories": ["woodwind-instrument-family"], "term": { "en": "Shinobue" }, "jpNative": true },
    { "id": "piccolo", "label": "ピッコロ", "categories": ["woodwind-instrument-family"], "term": { "en": "Piccolo" } },
    { "id": "recorder", "label": "リコーダー", "categories": ["woodwind-instrument-family"], "term": { "en": "Recorder" } },
    { "id": "harmonica", "label": "ハーモニカ", "categories": ["woodwind-instrument-family"], "term": { "en": "Harmonica" } },
    { "id": "accordion", "label": "アコーディオン", "categories": ["woodwind-instrument-family"], "term": { "en": "Accordion" } },
    { "id": "sho", "label": "笙", "categories": ["woodwind-instrument-family"], "term": { "en": "Shō" }, "jpNative": true },
    { "id": "ney", "label": "ネイ", "categories": ["woodwind-instrument-family"], "term": { "en": "Ney" } },
    { "id": "quena", "label": "ケーナ", "categories": ["woodwind-instrument-family"], "term": { "en": "Quena" } },
    { "id": "duduk", "label": "ドゥドゥク", "categories": ["woodwind-instrument-family"], "term": { "en": "Duduk" } },
    { "id": "zurna", "label": "ズルナ", "categories": ["woodwind-instrument-family"], "term": { "en": "Zurna" } },
    { "id": "hichiriki", "label": "ひちりき", "categories": ["woodwind-instrument-family"], "term": { "en": "Hichiriki" }, "jpNative": true }
  ]
}
```

## 既定で非表示の語（V-16）

該当なし。段階3の語はすべて明確な音色の独自性が認められ、既定で表示とした。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | フリーリード楽器（ハーモニカ・アコーディオン・笙）は独立した大分類にしなかった（判断ポイント164 判定注記1）ため本カテゴリに統合した |
| 2 | 段階3の語を通常より広く追加した。資料の記述は薄いが、いずれも音色が明確に異なり民族楽器としての需要も高いと判断したため（ジャンルの一般的知識による判定と同型。`../README.md` 判断ポイント86） |
| 3 | 尺八・篠笛はSuno自身の出力に実績があり（判断ポイント177）、需要の裏付けとして特筆した |
| 4 | 18語はすべて Suno v6 で未検証（DP-06） |
