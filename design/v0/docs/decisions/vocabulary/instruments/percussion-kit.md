# ドラムセット・オーケストラ打楽器系（`percussion-kit-instrument-family`）

- 作成日: 2026-09-18
- 語数: 10（既定で表示）
- 既定で非表示の語: 0
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格、判断ポイント179: 打楽器系の3分割）
- 辞典形式（R-19）を適用（判断ポイント167）

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れは同一語として数える（V-01）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| バスドラム | ○ | ○ | ○ | ○ | 4 |
| スネアドラム | ○ | ○ | ○ | ○ | 4 |
| シンバル | ○ | ○ | ○ | ○ | 4 |
| タンバリン | ○ | ○ | — | ○ | 3 |
| トライアングル | ○ | ○ | — | ○ | 3 |

### 3資料未満（段階3の審査対象）

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| ハイハット | ○ | — | — | ○ | 2 |
| タムタム（トムトム） | ○ | — | — | ○ | 2 |
| カスタネット | ○ | — | — | ○ | 2 |
| ウィンドチャイム | ○ | — | — | ○ | 2 |
| ゴング | ○ | — | — | ○ | 2 |
| ウッドブロック、アンヴィル 他 | — | — | — | ○ | 1（まとめて記録） |

## 段階2: Suno での実績

`../../../research/suno-profile.md` を確認したが、本カテゴリの語に総称・個別とも実績は確認できなかった。
→ 段階2 での追加はなし。代表項目も**置かない**（判断ポイント181。ドラムセット構成要素と
オーケストラ打楽器が混在するカテゴリで、両方を束ねる自然な総称語が資料にない。
「Drums」はドラムセット側しか含意せず、トライアングル・ゴング等を含まないため代表項目にしなかった）。

## 段階3: 2資料以下の語の審査（V-03・V-15）

いずれも実際の音色・役割が明確に異なり代替が利かないため、全語を追加した。

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| ハイハット | 2 | **追加** | (i) 開閉によるクリスプな金属音はドラムセットのグルーヴに不可欠。(ii) シンバル（総称）では役割が代替できない |
| タムタム | 2 | **追加** | (i) スネア・バスドラムとは異なる共鳴音程のフィル用ドラム。(ii) ドラムセットの構成要素として代替不可 |
| カスタネット | 2 | **追加** | (i) 木製の鋭いクラック音はスペイン・フラメンコ音楽特有。(ii) 代替不可 |
| ウィンドチャイム | 2 | **追加** | (i) ランダムに響く金属の煌めきは他に類がない。(ii) 幻想的・魔法的な質感の需要が明確で代替不可 |
| ゴング | 2 | **追加** | (i) 深く持続する金属の衝撃音はシンバルとは明確に異なる。(ii) シネマティック系での劇的な効果の需要が明確で代替不可（`../genres/cinematic.md`） |
| 1資料のみの語（ウッドブロック、アンヴィル 他） | 1 | 追加しない | 既存語と他軸の組み合わせで表現でき、(ii) を満たさない可能性が高い |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a・R-b・R-c に該当する語はない。

## 結果

```json
{
  "items": [
    { "id": "bass-drum", "label": "バスドラム", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Bass Drum" } },
    { "id": "snare-drum", "label": "スネアドラム", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Snare Drum" } },
    { "id": "cymbals", "label": "シンバル", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Cymbals" } },
    { "id": "tambourine", "label": "タンバリン", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Tambourine" } },
    { "id": "triangle", "label": "トライアングル", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Triangle" } },
    { "id": "hi-hat", "label": "ハイハット", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Hi-Hat" } },
    { "id": "tom-tom", "label": "タムタム", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Tom-tom" } },
    { "id": "castanets", "label": "カスタネット", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Castanets" } },
    { "id": "wind-chimes", "label": "ウィンドチャイム", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Wind Chimes" } },
    { "id": "gong", "label": "ゴング", "categories": ["percussion-kit-instrument-family"], "term": { "en": "Gong" } }
  ]
}
```

## 既定で非表示の語（V-16）

該当なし。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 代表項目を置かない（判断ポイント181）。ドラムセット構成要素とオーケストラ打楽器が混在するため |
| 2 | 10語はすべて Suno v6 で未検証（DP-06） |
