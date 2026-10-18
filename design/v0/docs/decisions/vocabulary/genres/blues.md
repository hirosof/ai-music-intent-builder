# ブルース系（`blues-family`）

- 作成日: 2026-09-17
- 語数: 8（既定で表示。本カテゴリで審査した語。段階4b の前）
- 他カテゴリで審査済みで本カテゴリにも表示される語: 1（Blues Rock。表示される語の計は 9 で、V-13 の閾値 25 以内のため分割しない。判断ポイント89）
- 既定で非表示の語: 1（V-16）
- 所属は V-14 で判定（(6)・(7) を含む）。段階3 の (ii) は V-15 で判定
- 手順・細則・略号: `../README.md`

---

## 段階1: 3資料以上に登場する語

見出しの経路は V-14 (1) に従いすべて合わせて数えた。対応する見出しは C の「Blues」、O の「ブルース」、G の「ブルース／カントリー／フォーク」（blues と country-folk に対応）、S の「4 ブルース」。他のジャンルとの関係を説明する本文の言及は、出現には数えるが配置には数えない（V-14 (7)）。

| 語 | C | O | G | S | 数 | 所属 |
|---|---|---|---|---|---|---|
| Blues | blues（最上位・一覧） | blues（最上位）。アフリカの節の Afrobeat の説明は配置に数えない | blues・country-folk（最上位・本文）。ロック・ジャズ・R&B の節の言及は配置に数えない | blues（最上位・本文）。ジャズ・R&B の節の言及は同上 | 4 | blues（4/4）。country-folk は 1/4 |
| Delta Blues / Chicago Blues | blues | blues | blues・country-folk（一覧・本文） | blues | 各4 | blues（4/4）。country-folk は 1/4 |
| Electric Blues | blues | blues | blues・country-folk（一覧・本文の「Chicago / Electric Blues」） | rnb-soul（R&B の節の本文。当初の R&B に含まれた様式としての列挙） | 4 | blues（3/4）。country-folk・rnb-soul は各 1/4 |
| Country Blues | blues | blues | — | blues | 3 | blues |
| Jump Blues | blues | blues | — | blues・rnb-soul（ブルースの表、R&B の節の本文） | 3 | blues（3/3）。rnb-soul は 1/3 |

3資料以上に登場するが、他のカテゴリで審査済みの語（V-14 (5)）:

| 語 | 所属 | 扱い |
|---|---|---|
| Blues Rock | rock（2/3）、blues（3/3） | `rock.md` で審査・採用済み。本カテゴリにも表示される。再審査しない |
| Rhythm & Blues（C の Blues の一覧） | R&B と同じ語（rnb-soul 4/4、blues 1/4） | `rnb-soul.md` で審査済み。ブルース系のタグは付かない（判断ポイント74・80） |

## 段階2: Suno での実績

該当なし（`../../../research/suno-profile.md` にブルース系の実例がない）。

## 段階3: 2資料以下の語の審査（V-03、V-15）

| 語 | 判定 | 理由 |
|---|---|---|
| Piedmont Blues | **追加** | C・O（blues 2/2）。(i) ギターの独奏でインストが成立する。(ii) 交互に低音を刻むフィンガーピッキングとラグタイム由来の和声は奏法・和声で、表す軸がない。Country Blues は対象にない特徴を持ち込まないが、区別の主因を表せない（V-15。判断ポイント86） |
| Texas Blues | **追加** | C・S（blues 2/2）。(i) 成立する。(ii) S の説明「より洗練されたギターワークやスウィング感」は奏法・リズムの型で、表す軸がない。Jump Blues はホーンを含むダンスバンドの編成を、副ジャンル Swing はビッグバンドの管楽器を持ち込むため代替にならない（V-15。判断ポイント86） |
| Acoustic Blues | 追加しない | C・G（blues 2/2）。Blues と楽器（アコースティックギターなど）で代替できる。代表項目 Blues は対象にない特徴を持ち込まない（判断ポイント87） |
| 1資料のみの語（Traditional Blues、Hill Country Blues、Louisiana Blues、New Orleans Blues、Modern Blues、West Coast Blues、Boogie-woogie、Desert Blues、African Blues ほか） | 追加しない | 1資料のみ。語ごとの判定がないため辞典に記録しない（V-16）。Boogie-woogie は注記6 |

## 段階4a: 規則による刈り込み

除外なし。次の適用も検討したが、適用しない。

- Electric Blues への R-a: 楽器（電化）を含むラベルだが、3資料が一覧でジャンルとして扱っている（`hiphop.md` の Lo-fi Hip Hop、`jazz.md` の Big Band と同じ扱い）
- Electric Blues と Chicago Blues の重なりへの R-c: G が本文で併記するが、Electric Blues は電化したブルースの広義、Chicago Blues はバンド編成の特定の様式で、同義ではない（判断ポイント85）
- Delta Blues・Country Blues への R-b: S の説明（生々しい独唱とギター、個人演奏中心）は歌唱を含むが、スライドギターなど器楽側の特徴が残る（`rock.md` の Emo と同型）
- 地域名のラベル（Delta・Chicago・Texas・Piedmont）への R-c: 地域で名付けられているが、音像が互いに別物（`hiphop.md` の UK Drill と同型。判断ポイント52）
- Jump Blues への R-b: S の説明が「ダンス向けの軽快なブルース」で、器楽側の記述

## 結果

### 既定で表示する語

```json
{
  "items": [
    { "id": "blues",          "label": "Blues",          "categories": ["blues-family"], "represents": "blues-family", "aliases": ["ブルース"] },
    { "id": "country-blues",  "label": "Country Blues",  "categories": ["blues-family"], "aliases": ["カントリーブルース"] },
    { "id": "delta-blues",    "label": "Delta Blues",    "categories": ["blues-family"], "aliases": ["デルタブルース"] },
    { "id": "piedmont-blues", "label": "Piedmont Blues", "categories": ["blues-family"], "aliases": ["ピードモントブルース"] },
    { "id": "jump-blues",     "label": "Jump Blues",     "categories": ["blues-family"], "aliases": ["ジャンプブルース"] },
    { "id": "electric-blues", "label": "Electric Blues", "categories": ["blues-family"], "aliases": ["エレクトリックブルース"] },
    { "id": "chicago-blues",  "label": "Chicago Blues",  "categories": ["blues-family"], "aliases": ["シカゴブルース"] },
    { "id": "texas-blues",    "label": "Texas Blues",    "categories": ["blues-family"], "aliases": ["テキサスブルース"] }
  ]
}
```

他カテゴリで定義済みで、本カテゴリにも表示される語: `blues-rock`（`rock.md`。`categories` に `blues-family` を含む）。

### 既定で非表示の語（V-16）

段階3 の表から、語ごとの判定がある語を記録した。「1資料のみの語」のまとめ行は記録しない。

```json
{
  "items": [
    { "id": "acoustic-blues", "label": "Acoustic Blues", "categories": ["blues-family"], "aliases": ["アコースティックブルース"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Blues ＋ 主旋律・伴奏の楽器（アコースティックギターなど）" } }
  ]
}
```

## 他カテゴリへ送る語

なし。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 表示順: 代表項目 → 農村・アコースティックの系譜（Country Blues〜Piedmont Blues）→ Jump Blues → 電化の系譜（Electric Blues〜Texas Blues）→ Blues Rock（`rock.md`）。複数ファイルで定義された語の並べ方は `../../presets.md` §8 の8（単一の配列を前提）で決まっておらず、実装時に決める |
| 2 | 代表項目は最上位の見出し名 Blues（4資料とも系統名として挙げる）。G の見出しは「ブルース／カントリー／フォーク」だが、本ツールはブルース系を独立させており（`../README.md` §3-1）、Country・Folk はカントリー・フォーク系の語として数える。V-14 (6) によるカテゴリの別名はない |
| 3 | S の「テキサス／ウエストコースト・ブルース」は、Texas Blues と West Coast Blues を1回ずつ数えた（V-01）。West Coast Blues は1資料のみ |
| 4 | G の本文「アコースティックな「Delta Blues」」の「アコースティック」は形容であり、Acoustic Blues として数えない |
| 5 | Electric Blues の集計により、`rnb-soul.md` の「Electric Blues（blues 2/3）」を「blues 3/4」に訂正した（G の一覧の分の漏れ）。所属と審査先は変わらない |
| 6 | Boogie-woogie（O のみ）はピアノ主体の器楽様式でインストの需要が見込まれるが、1資料のみのため個別に審査していない（`jazz.md` の Ragtime と同じ扱い）。後から語を足してもデータは壊れない（判断ポイント38） |
| 7 | Country Blues の「Country」はカントリー音楽と誤読され得るが、`term` を付けない（判断ポイント40・88） |
| 8 | 段階3・4a の音像の説明の一部（Piedmont Blues の奏法、Chicago Blues の編成など）は資料の記述ではなく一般的な知識による。Piedmont Blues は C・O とも説明がない。8語はすべて Suno v6 で未検証（DP-06） |
