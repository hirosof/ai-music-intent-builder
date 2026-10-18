# メタル系（`metal-family`）

- 作成日: 2026-09-17
- 語数: 13（既定で表示。段階4b の前）
- 既定で非表示の語: 12（V-16。2026-09-17 に遡って記録）
- 所属は V-14 で判定
- 見直し: 2026-09-17 に段階3 を V-15 で再判定した（Groove Metal を追加。Speed Metal・Gothic Metal・Industrial Metal の理由を訂正）
- 手順・細則・略号: `../README.md`

---

## 段階1: 3資料以上に登場する語

S はメタルを「ロック ＞ ヘヴィメタル系統」の下に置いているため、S の配置は rock と metal の両方になる。

| 語 | C | O | G | S | 数 | 所属 |
|---|---|---|---|---|---|---|
| Heavy Metal | metal | metal | rock | rock・metal | 4 | metal（3/4）。rock は 2/4 で過半数に届かない |
| Thrash Metal / Death Metal / Black Metal / Doom Metal / Metalcore / Nu Metal | metal | metal | — | rock・metal | 各3 | metal（3/3） |
| Power Metal / Symphonic Metal | metal | metal | — | rock・metal（S は併記） | 各3 | metal |
| Folk Metal | metal・country-folk | metal | — | rock・metal | 3 | metal（3/3）。country-folk は 1/3 |
| Viking Metal | metal | metal | — | rock・metal | 3 | metal |

## 段階2: Suno での実績

該当なし（`../../../research/suno-profile.md` にメタル系の実例がない）。

## 段階3: 2資料以下の語の審査（V-03）

| 語 | 判定 | 理由 |
|---|---|---|
| Melodic Death Metal | **追加** | (i) 旋律的なツインギターとブラストビートはインストでも成立する。(ii) 旋律性は Death Metal だけでは表現できず、旋律性を表すジャンル語もない |
| Djent | **追加** | (i) 成立する。(ii) 低音弦のパームミュートとポリリズムの音色は、他の語では代替できない（下位に置かれる Progressive Metal は採用していない） |
| Progressive Metal | 追加しない | 主ジャンル Heavy Metal と副ジャンル Progressive Rock で代替できる |
| Groove Metal | **追加**（V-15 で再判定） | (i) 成立する。(ii) 中速でシンコペーションを効かせた低音域のリフはリズムの型・奏法にあたり、表す軸がない。当初の代替「Thrash Metal ＋ テンポ感」は Thrash Metal の速さを打ち消す必要があり成り立たない |
| Speed Metal | 追加しない | Heavy Metal とテンポ感（速い）で代替できる。当初の代替 Thrash Metal は攻撃的なリフを持ち込むため外した（V-15） |
| Technical / Brutal Death Metal | 追加しない | Death Metal と、Progressive Rock または強度で代替できる |
| Symphonic Black Metal / Deathcore | 追加しない | 採用済みの2語の組み合わせで代替できる |
| Funeral Doom / Sludge Metal / Stoner Metal | 追加しない | Doom Metal とテンポ・音質で代替できる |
| Gothic Metal | 追加しない | Heavy Metal と情緒（暗い・哀愁）、テンポ感、伴奏（キーボード・ストリングス）で代替できる。当初の代替のうち Doom Metal は極端な遅さを、Symphonic Metal は管弦楽の壮大さを持ち込むため外した（V-15） |
| Industrial Metal | 追加しない | Heavy Metal と音質（機械的・歪んだ質感）、リズムの担い手（ドラムマシン）で代替できる。当初の理由「エレクトロニック系のインダストリアル系の語で代替」は、該当する語が採用されなかったため訂正した（`electronic.md`） |
| Grindcore / Kawaii Metal / NWOBHM / Neoclassical Metal ほか1資料の語 | 追加しない | 1資料のみ。Kawaii Metal はアイドル歌唱が区別の主因（R-b 相当） |

## 段階4a: 規則による刈り込み

| 語 | 規則 | 扱い |
|---|---|---|
| Viking Metal | R-c | **除外**。O と S が Folk Metal と併記しており、音像は Folk Metal に含まれる。区別は主に歌詞の主題（北欧神話） |

Death Metal と Black Metal にも R-b を検討したが、グロウルなどの歌唱は特徴の一部であり、
ブラストビート、トレモロピッキング、低音チューニングといった器楽的な特徴が主のため適用しない（判断ポイント43）。

## 結果

```json
{
  "items": [
    { "id": "heavy-metal",         "label": "Heavy Metal",         "categories": ["metal-family"], "represents": "metal-family", "aliases": ["ヘヴィメタル", "ヘビーメタル"] },
    { "id": "thrash-metal",        "label": "Thrash Metal",        "categories": ["metal-family"], "aliases": ["スラッシュメタル"] },
    { "id": "groove-metal",        "label": "Groove Metal",        "categories": ["metal-family"], "aliases": ["グルーヴメタル", "グルーブメタル"] },
    { "id": "power-metal",         "label": "Power Metal",         "categories": ["metal-family"], "aliases": ["パワーメタル"] },
    { "id": "symphonic-metal",     "label": "Symphonic Metal",     "categories": ["metal-family"], "aliases": ["シンフォニックメタル"] },
    { "id": "death-metal",         "label": "Death Metal",         "categories": ["metal-family"], "aliases": ["デスメタル"] },
    { "id": "melodic-death-metal", "label": "Melodic Death Metal", "categories": ["metal-family"], "aliases": ["メロディックデスメタル"] },
    { "id": "black-metal",         "label": "Black Metal",         "categories": ["metal-family"], "aliases": ["ブラックメタル"] },
    { "id": "doom-metal",          "label": "Doom Metal",          "categories": ["metal-family"], "aliases": ["ドゥームメタル"] },
    { "id": "folk-metal",          "label": "Folk Metal",          "categories": ["metal-family"], "aliases": ["フォークメタル"] },
    { "id": "nu-metal",            "label": "Nu Metal",            "categories": ["metal-family"], "aliases": ["ニューメタル", "ヌーメタル"] },
    { "id": "metalcore",           "label": "Metalcore",           "categories": ["metal-family"], "aliases": ["メタルコア"] },
    { "id": "djent",               "label": "Djent",               "categories": ["metal-family"], "aliases": ["ジェント"] }
  ]
}
```

## 既定で非表示の語（V-16）

段階3・4a の表から、語ごとの判定がある語を記録した。「ほか1資料の語」のまとめ行（Grindcore、Kawaii Metal など）は記録しない。

```json
{
  "items": [
    { "id": "progressive-metal", "label": "Progressive Metal", "categories": ["metal-family"], "aliases": ["プログレッシブメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Heavy Metal ＋ 副ジャンル Progressive Rock" } },
    { "id": "speed-metal", "label": "Speed Metal", "categories": ["metal-family"], "aliases": ["スピードメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Heavy Metal ＋ テンポ感（速い）" } },
    { "id": "technical-death-metal", "label": "Technical Death Metal", "categories": ["metal-family"], "aliases": ["テクニカルデスメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Death Metal ＋ 副ジャンル Progressive Rock" } },
    { "id": "brutal-death-metal", "label": "Brutal Death Metal", "categories": ["metal-family"], "aliases": ["ブルータルデスメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Death Metal ＋ 強度" } },
    { "id": "symphonic-black-metal", "label": "Symphonic Black Metal", "categories": ["metal-family"], "aliases": ["シンフォニックブラックメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Black Metal ＋ 副ジャンル Symphonic Metal" } },
    { "id": "deathcore", "label": "Deathcore", "categories": ["metal-family"], "aliases": ["デスコア"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Death Metal ＋ 副ジャンル Metalcore" } },
    { "id": "funeral-doom", "label": "Funeral Doom", "categories": ["metal-family"], "aliases": ["フューネラルドゥーム"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Doom Metal ＋ テンポ感（より遅い）" } },
    { "id": "sludge-metal", "label": "Sludge Metal", "categories": ["metal-family"], "aliases": ["スラッジメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Doom Metal ＋ 音質・強度" } },
    { "id": "stoner-metal", "label": "Stoner Metal", "categories": ["metal-family"], "aliases": ["ストーナーメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Doom Metal ＋ 音質（ファズ）" } },
    { "id": "gothic-metal", "label": "Gothic Metal", "categories": ["metal-family"], "aliases": ["ゴシックメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Heavy Metal ＋ 情緒（暗い・哀愁）・テンポ感・伴奏（キーボード・ストリングス）" } },
    { "id": "industrial-metal", "label": "Industrial Metal", "categories": ["metal-family"], "aliases": ["インダストリアルメタル"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Heavy Metal ＋ 音質（機械的・歪んだ質感）・リズムの担い手（ドラムマシン）" } },
    { "id": "viking-metal", "label": "Viking Metal", "categories": ["metal-family"], "aliases": ["ヴァイキングメタル", "バイキングメタル"], "defaultVisible": false,
      "exclusion": { "kind": "contained", "note": "区別は主に歌詞の主題（北欧神話）", "substitute": "Folk Metal" } }
  ]
}
```

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 代表項目 Heavy Metal は「メタル全般」と「正統派（トラディショナル）」の2つの意味を持つ（O は併記）。正統派を別語として立てた資料は C（Traditional Heavy Metal）と S（NWOBHM）の各1件で、分ける根拠が弱いため代表項目とした（判断ポイント42） |
| 2 | Progressive Metal を採らず Melodic Death Metal と Djent を採るのは、段階3 (ii) の規則どおりの結果（判断ポイント44） |
| 3 | S の「パワー／シンフォニックメタル」「フォークメタル／ヴァイキングメタル」は各語を1回ずつ数えた（V-01） |
| 4 | 別名に「メロデス」を付けない（判断ポイント39） |
| 5 | 表示順は、代表項目の後に スラッシュ・パワー系 → デス・ブラック・ドゥーム系 → 融合・現代系 |
| 6 | Symphonic Metal はクラシック系・シネマティック系と音が近いが、資料の配置は4資料ともメタルのみのためタグは付けない。TreeTable の検索では見つかる |
| 7 | `term` はなし |
| 8 | メタル系の独立は維持する。刈り込み後もロック系24語＋メタル系13語で V-13 の閾値 25 を超える（判断ポイント45） |
| 9 | 13語はすべて Suno v6 で未検証（DP-06） |
| 10 | Melodic Death Metal の判定は、V-15（旋律の性格を表す軸がない）の元になった先例。Groove Metal は表示順で Thrash Metal の直後に置いた |
