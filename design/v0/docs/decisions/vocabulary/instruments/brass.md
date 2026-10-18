# 金管楽器系（`brass-instrument-family`）

- 作成日: 2026-09-18
- 語数: 8（既定で表示）
- 既定で非表示の語: 4（V-16）
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格）
- 辞典形式（R-19）を適用（判断ポイント167、2026-09-18。ジャンルと同じ仕組みをそのまま使う。`../../presets.md` §11-1 が既に「楽器・情緒などの語彙にも同じ仕組みを使える」としていたものを、楽器で最初に確認・適用した）

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れ（フレンチホルン/ホルン、
フリューゲルホルン等）は同一語として数える（V-01）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| トランペット | ○ | ○ | ○ | ○ | 4 |
| トロンボーン | ○ | ○ | ○ | ○ | 4 |
| ホルン（フレンチホルン） | ○ | ○ | ○ | ○ | 4 |
| チューバ | ○ | ○ | ○ | ○ | 4 |
| フリューゲルホルン | ○ | — | ○ | ○ | 3 |
| ユーフォニアム | ○ | — | ○ | ○ | 3 |

## 段階2: Suno での実績

`../../../research/suno-profile.md` §5-1・生成後のスタイル文の観察（§末尾）を確認した。

個別の楽器名（Trumpet、Trombone 等）はSuno自身が書き換えたスタイル文に現れていないが、
**「brass」という総称語**が2件確認できる。

- §5-1 生成曲1:「brass koto strings」（和風戦闘BGM の入力に対する書き換え）
- §末尾「生成後のスタイル文の観察」:「low strings, brass などの伴奏楽器」が追加された（H-07 検証）

→ 個々の楽器を指定しない「金管楽器全体・総称」を表す語として **Brass** を追加する（判断ポイント168）。
ジャンルの `Orchestral`・`Cinematic`（Sunoの出力に現れた語を実績に数えた前例。`../README.md` 判断ポイント142）と同型の扱い。

## 段階3: 2資料以下の語の審査（V-03・V-15）

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| コルネット | 2 | **追加** | (i) 円錐管に近い形状による丸みを帯びた音色はトランペットでも代替されにくい。(ii) 他軸（質感・音質）でも打ち消せない音色差 |
| ワーグナーチューバ | 2 | **追加** | (i) ホルンとチューバの中間的な音色は両語の組み合わせでは表せない。(ii) 映画音楽での起用実績が多く需要も明確（用途上の需要。V-03の趣旨） |
| スーザフォン | 2 | 追加しない | 音響的にはチューバとほぼ同じ（V-15: 差は携行性という奏法上の特徴で、音像への影響が小さい） |
| ヘリコン | 2 | 追加しない | スーザフォンの前身で、音響的にはチューバと同型（同上） |
| バリトンホルン | 2 | 追加しない | ユーフォニアムと近い音色。資料に明確な音の区別の記述がない |
| ビューグル | 2 | 追加しない | バルブがなく自然倍音のみで演奏する点は奏法上の制約であり、音色自体はトランペット・コルネットで代替できる |
| 1資料のみの語（ナチュラルホルン、アルプホルン、ポストホルン、テナーホルン、ナチュラルトランペット、クラリーノ、セルパン、オフィクレイド、ホルンガイ） | 1 | 追加しない | 段階1・2で通過した語と他軸の組み合わせで表現でき、(ii) を満たさない可能性が高い |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a（軸違い）、R-b（歌唱による区別）に該当する語はない。
R-c（包含）は Brass（総称）と個別楽器の関係に相当するが、
ジャンルの代表項目の扱い（判断ポイント90 等）に準じ、**除外せず代表項目として扱う**（§結果）。

## 結果

```json
{
  "items": [
    { "id": "brass", "label": "Brass", "categories": ["brass-instrument-family"], "represents": "brass-instrument-family", "aliases": ["金管楽器", "金管"] },
    { "id": "trumpet", "label": "トランペット", "categories": ["brass-instrument-family"], "term": { "en": "Trumpet" } },
    { "id": "trombone", "label": "トロンボーン", "categories": ["brass-instrument-family"], "term": { "en": "Trombone" } },
    { "id": "french-horn", "label": "ホルン", "categories": ["brass-instrument-family"], "term": { "en": "French Horn" }, "aliases": ["フレンチホルン"] },
    { "id": "tuba", "label": "チューバ", "categories": ["brass-instrument-family"], "term": { "en": "Tuba" } },
    { "id": "flugelhorn", "label": "フリューゲルホルン", "categories": ["brass-instrument-family"], "term": { "en": "Flugelhorn" } },
    { "id": "euphonium", "label": "ユーフォニアム", "categories": ["brass-instrument-family"], "term": { "en": "Euphonium" } },
    { "id": "cornet", "label": "コルネット", "categories": ["brass-instrument-family"], "term": { "en": "Cornet" } },
    { "id": "wagner-tuba", "label": "ワーグナーチューバ", "categories": ["brass-instrument-family"], "term": { "en": "Wagner Tuba" } }
  ]
}
```

## 既定で非表示の語（V-16）

```json
{
  "items": [
    { "id": "sousaphone", "label": "スーザフォン", "categories": ["brass-instrument-family"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Tuba" } },
    { "id": "helicon", "label": "ヘリコン", "categories": ["brass-instrument-family"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Tuba" } },
    { "id": "baritone-horn", "label": "バリトンホルン", "categories": ["brass-instrument-family"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Euphonium" } },
    { "id": "bugle", "label": "ビューグル", "categories": ["brass-instrument-family"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Trumpet ／ Cornet" } }
  ]
}
```

## 他カテゴリへ送る語

| 語 | 送り先 | 備考 |
|---|---|---|
| ディジュリドゥ | 民族楽器系（オセアニア、未作成） | Sは金管（唇振動）に分類するが、通常の分類・利用者の直感的な検索先としては民族楽器系（オセアニア）が自然。V-14(5)によりまだ作成していないカテゴリの語として、審査を送る |

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 「Brass」を代表項目としたのは、ジャンルの `Cinematic`（判断ポイント143）等と同型の判断。個々の楽器を指定せず「金管楽器全体」を伴奏・アンサンブルとして指定したい場合の受け皿になる |
| 2 | ホルンはC「フレンチホルン」、O「French Horn」、G「フレンチホルン」、S「ホルン（フレンチホルン）」と表記が揺れるが、いずれも同一の楽器を指すため同一語として数えた（V-01） |
| 3 | ディジュリドゥの審査は保留し、民族楽器系の作成時に行う（V-14(5)） |
| 4 | 8語はすべて Suno v6 で未検証（DP-06）。「チャットAI への指定語として妥当か」の水準の選定 |
