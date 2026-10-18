# ロック系（`rock-family`）

- 作成日: 2026-09-17
- 語数: 24（既定で表示。段階4b の前。V-13 の閾値 25 以内）
- 既定で非表示の語: 19（V-16。2026-09-17 に遡って記録）
- 所属は V-14 で判定
- 見直し: 2026-09-17 に段階3 を V-15 で再判定した（Melodic Hardcore を追加。他の不採用の理由を訂正）
- 手順・細則・略号: `../README.md`（分割前は `presets.md` §12-2）

---

## 段階1: 3資料以上に登場する語

| 語 | C | O | G | S | 数 | 所属 |
|---|---|---|---|---|---|---|
| Rock | rock | rock（最上位） | rock（最上位） | rock（最上位） | 4 | rock |
| Rock & Roll / Hard Rock / Alternative Rock / Indie Rock / Glam Rock / Progressive Rock / Psychedelic Rock / Post-rock / Punk Rock | rock | rock | rock | rock | 各4 | rock |
| Folk Rock | rock・country-folk | rock・country-folk | blues・country-folk | rock・country-folk | 4 | rock（3/4）、country-folk（4/4） |
| Blues Rock | rock・blues | rock・blues | — | blues | 3 | rock（2/3）、blues（3/3） |
| Rockabilly | country-folk | rock・country-folk | — | rock | 3 | rock（2/3）、country-folk（2/3） |
| Country Rock | rock・country-folk | rock | — | rock | 3 | rock（3/3） |
| Soft Rock / Garage Rock / Surf Rock / Hardcore Punk / Post-punk / Emo | rock | rock | — | rock | 各3 | rock |
| Grunge / Shoegaze | — | rock | rock | rock | 各3 | rock |

Heavy Metal（G はロックの下に置く）はメタル系で扱う（`metal.md`）。

## 段階2: Suno での実績

該当なし（`../../../research/suno-profile.md` にロック系の実例がない）。

## 段階3: 2資料以下の語の審査（V-03）

| 語 | 判定 | 理由 |
|---|---|---|
| Math Rock | **追加** | (i) インスト曲が多い様式。(ii) 変拍子やタッピングなどの特徴は他の語では代替できない |
| Classic Rock / Arena Rock | 追加しない | 年代や演奏の場所を表すラベル。Classic Rock は Rock と年代・時代感、Arena Rock は Hard Rock と空間の質感で代替できる。Classic Rock の当初の代替 Hard Rock は歪んだ重さを持ち込むため外した（V-15） |
| Art Rock | 追加しない | Rock と展開の形・楽器編成で代替できる。当初の代替 Progressive Rock は長大な構成と演奏技巧を持ち込むため外した（V-15） |
| Acid Rock / Space Rock | 追加しない | Psychedelic Rock と、強度・音質（Acid Rock）、空間の質感・展開（Space Rock）で代替できる。O が Psychedelic Rock の下位に置いている |
| Southern Rock | 追加しない | Blues Rock と副ジャンル Country Rock、地域・文化の様式で代替できる（S が Country Rock と併記） |
| Gothic Rock | 追加しない | Post-punk と情緒（暗い）で代替できる |
| Britpop | 追加しない | Alternative Rock / Indie Rock と年代、地域・文化の様式で代替できる |
| Melodic Hardcore | **追加**（V-15 で再判定） | (i) 成立する。(ii) 旋律の性格を表す軸がなく、Hardcore Punk だけでは表せない。旋律的な既存の語（Emo、Power Pop など）は、静と動の切り替えや軽快なポップ性など対象にない特徴を持ち込む（`metal.md` の Melodic Death Metal と同型） |
| Pop Punk / Skate Punk / Proto-Punk / Powerviolence | 追加しない | Punk Rock・Hardcore Punk・Garage Rock と、副ジャンル Pop、テンポ感・強度・年代で代替できる。いずれも特徴を付け加える方向 |
| Post-Hardcore | 追加しない | Emo と強度で代替できる |
| Folk Punk | 追加しない | 副ジャンル Folk（カントリー・フォーク系で審査予定）と強度・テンポ感で代替できる。Punk Rock はエレキギターの歪みを持ち込むため代替に使わない（V-15） |
| Screamo | 追加しない | R-b 相当（区別の主因が叫ぶ歌唱） |
| Anarcho-Punk / Horror Punk | 追加しない | 区別が歌詞の主題による |
| J-rock | 追加しない | 所属は rock と east で1対1 の同数のため、V-14 (5) で審査先をロック系と判断した。S の説明は系譜と言語のみで (ii) を満たさない |
| Visual Kei | 追加しない | 所属は rock（2/2）。S の説明が「外見と世界観」で、音以外の区別（R-a 相当） |
| Funk Rock | ここでは審査しない | 所属が rnb-soul（2/2）のため、R&B・ソウル系で審査する |

## 段階4a: 規則による刈り込み

除外なし。Emo は R-b に当たるか検討したが、S の説明「感情を前面に出したハードコア由来の流れ」は
歌唱に限定した記述ではなく、インストでも静と動の急な切り替えなどの特徴が残るため適用しない（判断ポイント36）。

## 結果

```json
{
  "items": [
    { "id": "rock",             "label": "Rock",             "categories": ["rock-family"], "represents": "rock-family", "aliases": ["ロック"] },
    { "id": "rock-and-roll",    "label": "Rock & Roll",      "categories": ["rock-family"], "aliases": ["ロックンロール"] },
    { "id": "rockabilly",       "label": "Rockabilly",       "categories": ["rock-family", "country-folk-family"], "aliases": ["ロカビリー"] },
    { "id": "surf-rock",        "label": "Surf Rock",        "categories": ["rock-family"], "aliases": ["サーフロック"] },
    { "id": "garage-rock",      "label": "Garage Rock",      "categories": ["rock-family"], "aliases": ["ガレージロック"] },
    { "id": "hard-rock",        "label": "Hard Rock",        "categories": ["rock-family"], "aliases": ["ハードロック"] },
    { "id": "psychedelic-rock", "label": "Psychedelic Rock", "categories": ["rock-family"], "aliases": ["サイケデリックロック"] },
    { "id": "progressive-rock", "label": "Progressive Rock", "categories": ["rock-family"], "aliases": ["プログレッシブロック"] },
    { "id": "glam-rock",        "label": "Glam Rock",        "categories": ["rock-family"], "aliases": ["グラムロック"] },
    { "id": "soft-rock",        "label": "Soft Rock",        "categories": ["rock-family"], "aliases": ["ソフトロック"] },
    { "id": "blues-rock",       "label": "Blues Rock",       "categories": ["rock-family", "blues-family"], "aliases": ["ブルースロック"] },
    { "id": "folk-rock",        "label": "Folk Rock",        "categories": ["rock-family", "country-folk-family"], "aliases": ["フォークロック"] },
    { "id": "country-rock",     "label": "Country Rock",     "categories": ["rock-family"], "aliases": ["カントリーロック"] },
    { "id": "punk-rock",        "label": "Punk Rock",        "categories": ["rock-family"], "aliases": ["パンクロック", "パンク"] },
    { "id": "hardcore-punk",    "label": "Hardcore Punk",    "categories": ["rock-family"], "aliases": ["ハードコアパンク"] },
    { "id": "melodic-hardcore", "label": "Melodic Hardcore", "categories": ["rock-family"], "aliases": ["メロディックハードコア"] },
    { "id": "post-punk",        "label": "Post-punk",        "categories": ["rock-family"], "aliases": ["ポストパンク"] },
    { "id": "emo",              "label": "Emo",              "categories": ["rock-family"], "aliases": ["エモ"] },
    { "id": "alternative-rock", "label": "Alternative Rock", "categories": ["rock-family"], "aliases": ["オルタナティブロック"] },
    { "id": "indie-rock",       "label": "Indie Rock",       "categories": ["rock-family"], "aliases": ["インディーロック"] },
    { "id": "grunge",           "label": "Grunge",           "categories": ["rock-family"], "aliases": ["グランジ"] },
    { "id": "shoegaze",         "label": "Shoegaze",         "categories": ["rock-family"], "aliases": ["シューゲイザー"] },
    { "id": "post-rock",        "label": "Post-rock",        "categories": ["rock-family"], "aliases": ["ポストロック"] },
    { "id": "math-rock",        "label": "Math Rock",        "categories": ["rock-family"], "aliases": ["マスロック"] }
  ]
}
```

## 既定で非表示の語（V-16）

段階3 の表から、語ごとの判定がある語を記録した。Funk Rock は送り先で記録する。

```json
{
  "items": [
    { "id": "classic-rock", "label": "Classic Rock", "categories": ["rock-family"], "aliases": ["クラシックロック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "note": "年代を表すラベル", "substitute": "Rock ＋ 年代・時代感" } },
    { "id": "arena-rock", "label": "Arena Rock", "categories": ["rock-family"], "aliases": ["アリーナロック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "note": "演奏の場所を表すラベル", "substitute": "Hard Rock ＋ 空間の質感" } },
    { "id": "art-rock", "label": "Art Rock", "categories": ["rock-family"], "aliases": ["アートロック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Rock ＋ 展開の形・楽器編成" } },
    { "id": "acid-rock", "label": "Acid Rock", "categories": ["rock-family"], "aliases": ["アシッドロック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Psychedelic Rock ＋ 強度・音質" } },
    { "id": "space-rock", "label": "Space Rock", "categories": ["rock-family"], "aliases": ["スペースロック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Psychedelic Rock ＋ 空間の質感・展開" } },
    { "id": "southern-rock", "label": "Southern Rock", "categories": ["rock-family"], "aliases": ["サザンロック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Blues Rock ＋ 副ジャンル Country Rock ＋ 地域・文化の様式" } },
    { "id": "gothic-rock", "label": "Gothic Rock", "categories": ["rock-family"], "aliases": ["ゴシックロック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Post-punk ＋ 情緒（暗い）" } },
    { "id": "britpop", "label": "Britpop", "categories": ["rock-family"], "aliases": ["ブリットポップ"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Alternative Rock / Indie Rock ＋ 年代・地域・文化の様式" } },
    { "id": "pop-punk", "label": "Pop Punk", "categories": ["rock-family"], "aliases": ["Pop-punk", "ポップパンク"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Punk Rock ＋ 副ジャンル Pop" } },
    { "id": "skate-punk", "label": "Skate Punk", "categories": ["rock-family"], "aliases": ["スケートパンク"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Punk Rock ＋ テンポ感（速い）" } },
    { "id": "proto-punk", "label": "Proto-punk", "categories": ["rock-family"], "aliases": ["プロトパンク"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Garage Rock ＋ 年代" } },
    { "id": "powerviolence", "label": "Powerviolence", "categories": ["rock-family"], "aliases": ["パワーヴァイオレンス"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Hardcore Punk ＋ テンポ感・強度" } },
    { "id": "post-hardcore", "label": "Post-hardcore", "categories": ["rock-family"], "aliases": ["ポストハードコア"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Emo ＋ 強度" } },
    { "id": "folk-punk", "label": "Folk Punk", "categories": ["rock-family"], "aliases": ["フォークパンク"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "副ジャンル Folk ＋ 強度・テンポ感" } },
    { "id": "screamo", "label": "Screamo", "categories": ["rock-family"], "aliases": ["スクリーモ"], "defaultVisible": false,
      "exclusion": { "kind": "vocal", "note": "叫ぶ歌唱が区別の主因" } },
    { "id": "anarcho-punk", "label": "Anarcho-punk", "categories": ["rock-family"], "aliases": ["アナルコパンク"], "defaultVisible": false,
      "exclusion": { "kind": "contained", "note": "区別が歌詞の主題による", "substitute": "Punk Rock" } },
    { "id": "horror-punk", "label": "Horror Punk", "categories": ["rock-family"], "aliases": ["ホラーパンク"], "defaultVisible": false,
      "exclusion": { "kind": "contained", "note": "区別が歌詞の主題による", "substitute": "Punk Rock" } },
    { "id": "j-rock", "label": "J-rock", "categories": ["rock-family"], "aliases": ["J-ROCK", "邦ロック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "note": "資料の説明は系譜と言語のみ", "substitute": "Rock ＋ 地域・文化の様式" } },
    { "id": "visual-kei", "label": "ヴィジュアル系", "categories": ["rock-family"], "jpNative": true, "aliases": ["Visual Kei", "ビジュアル系"], "defaultVisible": false,
      "exclusion": { "kind": "other-axis", "note": "外見と世界観による区別で、音の系統を表さない", "targetAxis": null } }
  ]
}
```

## 判定の注記

| # | 内容 |
|---|---|
| 1 | `term` はなし。すべて英語ラベルで、訳し方で結果が変わる語がない |
| 2 | Punk と Punk Rock を同じ語として数えた（V-01。C は両方を並べている） |
| 3 | 表示順は、代表項目の後に 初期 → クラシック期 → パンクの系譜 → オルタナティブの系譜 |
| 4 | ラベル `Post-rock` `Post-punk` `Rock & Roll` は V-06（ハイフンの後は小文字、綴りは資料の多数表記） |
| 5 | 別名に略称を付けない（判断ポイント39） |
| 6 | Rockabilly、Folk Rock、Blues Rock はカントリー・フォーク系・ブルース系にも表示される。それらのカテゴリでは再審査しない（V-14 (5)） |
| 7 | 24語はすべて Suno v6 で未検証（DP-06） |
| 8 | Melodic Hardcore の所属は C・O とも rock（2/2）。表示順で Hardcore Punk の直後に置いた |
| 9 | 非表示の語のラベルは V-06 で整えた（`Proto-punk`、`Post-hardcore`、`Anarcho-punk`。段階3 の表では `Proto-Punk` など）。Visual Kei は V-06（日本発祥で漢字を含む通称）により `ヴィジュアル系` とし、`jpNative` を付けた。Anarcho-punk と Horror Punk は区別が歌詞にあり音像が Punk Rock に含まれるため、`metal.md` の Viking Metal に合わせて `contained` とした |
