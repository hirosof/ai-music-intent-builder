# 日本・東アジア系（`east-asian-family`）

- 作成日: 2026-09-18
- 語数: 4（既定で表示。本カテゴリで審査した語。段階4b の前）
- 他カテゴリで審査済みで本カテゴリにも表示される語: 4（歌謡曲、City Pop、渋谷系、Anime Song。表示される語の計は 8 で、V-13 の閾値 25 以内のため分割しない）
- 既定で非表示の語: 7（V-16）
- 所属は V-14 で判定（(6)・(7) を含む）。段階3 の (ii) は V-15 で判定
- 伝統・現代の区別（和風の伝統寄り・現代寄りなど）は、ジャンルではなく入力項目「様式の寄せ方」で扱う（`../../presets.md` 判断ポイント117）
- 手順・細則・略号: `../README.md`

---

## 段階1: 3資料以上に登場する語

見出しの経路は V-14 (1) に従いすべて合わせて数えた。対応する見出しは、C の「POP ＞ 日本系POP派生」「東アジア伝統音楽（日本・中国・韓国）」、O の「POP ＞ J-POP / K-POP / C-POP」、S の「14 アフリカ・中東・アジア ＞ 東アジアの現代ポップ」「15 日本の音楽」。G には対応する見出しがない。
O の「ワールドミュージック ＞ アジア」は小見出しが対応なしのため、親の world だけが付く。

| 語 | C | O | G | S | 数 | 所属 |
|---|---|---|---|---|---|---|
| 演歌 | east（東アジア伝統音楽 ＞ 日本） | world（ワールド ＞ アジア） | — | east（日本の音楽 ＞ B） | 3 | east（2/3）。world は 1/3。`pop.md` から送られた語（判断ポイント24） |
| トロット | east（東アジア伝統音楽 ＞ 韓国） | pop・east（K-POP の子） | — | east・pop・world（東アジアの現代ポップ） | 3 | east（3/3）、pop（2/3）。`pop.md` から送られた語（判断ポイント24） |
| Game Music | 対応なし（映画・TV・ゲーム音楽） | 対応なし（映画・ゲーム・機能性音楽） | — | east（日本の音楽 ＞ C「ゲームミュージック」）。§16 は対応なし | 3 | 過半数なし（east 1/3）。配置が east にしかないため、判断で本カテゴリで審査した（判断ポイント123） |

3資料以上に登場するが、他のカテゴリで審査済みの語（V-14 (5)）:

| 語 | 所属 | 扱い |
|---|---|---|
| City Pop、渋谷系、歌謡曲、Anime Song | pop・east | `pop.md` で採用済み。本カテゴリにも表示される |
| Vocaloid | pop・east | `pop.md` で保留（`hold`）。表示されない |
| J-POP、K-POP | pop | `pop.md` で採用済み。east は 1/4 でタグは付かない |
| Idol Pop、C-POP、Mandopop、Cantopop | pop | `pop.md` で既定で非表示（`vocal`） |
| J-rock、ヴィジュアル系 | rock | `rock.md` で既定で非表示 |

## 段階2: Suno での実績

`../../../research/suno-profile.md` §5 の実例と突き合わせた。

| 実例の語 | 扱い |
|---|---|
| `和風音頭`（§5-2。歌ありの派生生成で採用したスタイル） | 「和風」は地域・文化の様式、「音頭」をジャンル語として扱う。**音頭を追加**（S の民謡の列挙にもある。1資料） |
| `演歌`（§5-2。自動キャプションに「演歌風」と反映） | 段階1 を通過済み。段階4a で判定する |
| `Japanese Traditional`（§5-2） | C の一覧にもある（1資料）。段階4a で判定する |
| `和風戦闘BGM`（§5-1） | 用途（軸A）と様式の組み合わせで、ジャンル語を含まない。対象外 |

実例はいずれも歌ありの派生生成か、ジャンル語を含まないスタイルであり、インストでの効き方の根拠にはならない（判断ポイント120）。

## 段階3: 2資料以下の語の審査（V-03、V-15）

| 語 | 判定 | 理由 |
|---|---|---|
| 雅楽 | **追加** | C（東アジア伝統音楽 ＞ 日本）・S（日本の音楽 ＞ A。§3 の「西洋以外の古典」にも名前がある）。(i) 管楽器と打楽器の合奏でインストが成立する。(ii) 笙の和音と篳篥・龍笛の旋律の性格は和声・旋律で、表す軸がない。「様式 Japanese ＋ 伝統寄り ＋ 楽器」では雅楽に限らない和風の音になる（V-15。判断ポイント121） |
| 能楽 | **追加** | C・S（「謡と囃子」）。(i) 囃子（能管・小鼓・大鼓・太鼓）の器楽で成立する。(ii) 間を置いたリズムと能管の音色の組み合わせはリズムの型・奏法で、表す軸がない（V-15。判断ポイント121） |
| 民謡 | **追加** | C・S（日本の音楽 ＞ A。追分・音頭・甚句などを列挙）。(i) 三味線・尺八・太鼓による民謡の器楽編曲は一般的で、成立すると判断した。(ii) 民謡音階による旋律の性格と節回しは表す軸がない（V-15。判断ポイント121） |
| 音頭 | **追加** | 段階2（Suno の実績）で追加。S は民謡の一種として列挙（1資料）。(i) 盆踊りの舞曲で、太鼓と三味線の器楽で成立する。(ii) 踊りの二拍子のリズムはリズムの型で、表す軸がない。民謡とは舞曲のリズムの有無で区別される |
| 声明 | 追加しない | C・S（S は §16 の「仏教声明」にも名前がある。対応なし）。(i) を満たさない。仏教の声楽 |
| 箏曲 | 追加しない | C（「Koto Music」）・S（三曲の「箏曲」）。R-a 相当。楽器（箏）で定義される語で、主旋律を担う楽器などの項目で表す（判断ポイント122） |
| 尺八楽 | 追加しない | C（「Shakuhachi」）・S（三曲の「尺八」）。R-a 相当。楽器（尺八）で定義される語（判断ポイント122） |
| 1資料のみの語（中国: Chinese Classical、Guoyue、Jiangnan Sizhu、Chinese Opera、Peking Opera、Kunqu、Guzheng Music、Erhu Music。韓国: Gugak、Pansori、Samul Nori、K-ballad。日本: 琵琶楽、三味線音楽、長唄、義太夫節、地歌、琉球音楽・沖縄民謡、アイヌの音楽、グループ・サウンズ、ニューミュージック、日本語ラップ、Taiko、Neo City Pop、Denpa Song、Moe Song ほか） | 追加しない | 1資料のみ。語ごとの判定がないため辞典に記録しない（V-16）。中国・韓国の伝統音楽の語はすべて C の1資料のみ（判断ポイント124） |

## 段階4a: 規則による刈り込み

| 語 | 規則 | 扱い |
|---|---|---|
| 演歌 | R-b | **除外**。S の説明が「こぶし、五音的な旋律、義理・人情・望郷」で、区別の主因は歌唱技法（こぶし）と歌詞の主題。旋律の五音性は民謡・歌謡曲と共有する。Suno の実績（段階2）は歌ありの生成で、インストの初版では 4a を上書きしない。歌あり対応時に再評価する（`pop.md` 注記3、判断ポイント119） |
| トロット | R-b | **除外**。3資料とも名称のみで音像の記述がない。演歌と同じ論点としてまとめて判定した（判断ポイント24・119）。二拍子の伴奏のリズムを器楽側の特徴と見て採用する解釈もある |
| Game Music | R-a | **除外**（`other-axis`）。用途で定義される語で、S の説明は「チップチューンからオーケストラまで」と音の系統を特定しない。行き先は軸A（用途）。名前は用途由来でも音像の記述があった Anime Song（判断ポイント23）とは異なる（判断ポイント123） |
| Japanese Traditional | R-a | **除外**（`other-axis`）。地域・文化の様式と様式の寄せ方の組み合わせ（`Japanese` ＋ 伝統寄り）で表す語 |

次の適用も検討したが、適用しない。

- 雅楽への R-b: 歌物（催馬楽・朗詠）もあるが、管絃・舞楽の器楽が中心
- 能楽への R-b: 謡は要素の一つで、囃子の器楽側の特徴が残る（`rock.md` の Emo と同型）
- 民謡への R-b: 歌唱が中心の様式だが、区別の主因は旋律の音階と伴奏の楽器で、器楽の編曲でも区別が残ると判断した（判断ポイント121）
- 音頭と民謡の重なりへの R-c: S は音頭を民謡の一種とするが、舞曲のリズムという音の違いがある（判断ポイント52）

## 結果

### 既定で表示する語

```json
{
  "items": [
    { "id": "gagaku",    "label": "雅楽", "categories": ["east-asian-family"], "jpNative": true, "term": { "en": "gagaku" },     "aliases": ["Gagaku"] },
    { "id": "noh-music", "label": "能楽", "categories": ["east-asian-family"], "jpNative": true, "term": { "en": "Noh music" },  "aliases": ["Noh Music"] },
    { "id": "minyo",     "label": "民謡", "categories": ["east-asian-family"], "jpNative": true, "term": { "en": "min'yō" },     "aliases": ["Min'yo", "Minyo", "日本民謡"] },
    { "id": "ondo",      "label": "音頭", "categories": ["east-asian-family"], "jpNative": true, "term": { "en": "ondo" },       "aliases": ["Ondo"] }
  ]
}
```

代表項目（`represents`）は置かない（判断ポイント118）。

他カテゴリで定義済みで、本カテゴリにも表示される語: `kayokyoku`、`city-pop`、`shibuya-kei`、`anime-song`（`pop.md`）。

カテゴリの定義:

```json
{ "id": "east-asian-family", "label": "日本・東アジア系", "order": 120, "aliases": ["東アジア", "日本", "中国", "韓国", "日本の音楽", "邦楽"] }
```

### 既定で非表示の語（V-16）

段階3・4a の表から、語ごとの判定がある語を記録した。「1資料のみの語」のまとめ行は記録しない。

```json
{
  "items": [
    { "id": "shomyo", "label": "声明", "categories": ["east-asian-family"], "jpNative": true, "term": { "en": "shōmyō" }, "aliases": ["Shomyo"], "defaultVisible": false,
      "exclusion": { "kind": "not-instrumental", "note": "仏教の声楽" } },
    { "id": "sokyoku", "label": "箏曲", "categories": ["east-asian-family"], "jpNative": true, "aliases": ["Koto Music"], "defaultVisible": false,
      "exclusion": { "kind": "other-axis", "note": "楽器（箏）で定義される語。主旋律を担う楽器などの項目で指定する", "targetAxis": "軸D（音の構成）" } },
    { "id": "shakuhachi-music", "label": "尺八楽", "categories": ["east-asian-family"], "jpNative": true, "aliases": ["Shakuhachi Music"], "defaultVisible": false,
      "exclusion": { "kind": "other-axis", "note": "楽器（尺八）で定義される語。主旋律を担う楽器などの項目で指定する", "targetAxis": "軸D（音の構成）" } },
    { "id": "enka", "label": "演歌", "categories": ["east-asian-family"], "jpNative": true, "term": { "en": "enka" }, "aliases": ["Enka"], "defaultVisible": false,
      "exclusion": { "kind": "vocal", "note": "こぶしなどの歌唱技法と歌詞の主題で区別される語。Suno では歌ありの生成で実績がある", "substitute": "歌謡曲 ＋ 情緒（哀愁）" } },
    { "id": "trot", "label": "Trot", "categories": ["east-asian-family", "pop-family"], "aliases": ["トロット"], "defaultVisible": false,
      "exclusion": { "kind": "vocal", "note": "資料に音像の記述がなく、演歌と同じ論点として判定した" } },
    { "id": "game-music", "label": "Game Music", "categories": ["east-asian-family"], "aliases": ["Video Game Music", "VGM", "ゲーム音楽", "ゲームミュージック"], "defaultVisible": false,
      "exclusion": { "kind": "other-axis", "note": "用途で定義される語で、音の系統を特定しない", "targetAxis": "軸A（用途）" } },
    { "id": "japanese-traditional", "label": "Japanese Traditional", "categories": ["east-asian-family"], "defaultVisible": false,
      "exclusion": { "kind": "other-axis", "note": "地域・文化の様式（Japanese）と様式の寄せ方（伝統寄り）の組み合わせで表す語", "targetAxis": "地域・文化の様式 ＋ 様式の寄せ方" } }
  ]
}
```

## 他カテゴリへ送る語

なし。`../README.md` §4 の送られた語（演歌、トロット）は本カテゴリで判定した。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 表示順: 伝統音楽（雅楽 → 能楽 → 民謡 → 音頭）→ 大衆歌謡・現代ポップ（歌謡曲、City Pop、渋谷系、Anime Song。`pop.md`）。非表示の語は段階3 → 段階4a の表の順 |
| 2 | 代表項目を置かない（判断ポイント118）。カテゴリの別名は、見出しにしか現れない名称（C の「東アジア伝統音楽」の日本・中国・韓国、S の「日本の音楽」「純邦楽」）から付けた（V-14 (6)、`../../presets.md` §11-4） |
| 3 | ラベルは V-06 により日本語（漢字を含む日本発祥の通称）とし、`jpNative` を付けた。`term.en` は C の表記（`Gagaku`、`Min'yō`、`Noh Music`、`Shōmyō`、`Enka`）に合わせ、`pop.md` の `kayōkyoku` と同じくマクロンを残して小文字にした。音頭は資料に英語表記がないため `ondo` とした。トロットは韓国発祥のため英語ラベル `Trot` |
| 4 | S のフォークの節の「本来は各地の民謡・口承音楽の総称」は Folk の定義であり、日本の民謡としては数えない |
| 5 | S の §3「西洋以外の古典」にある「日本の雅楽：後述」は、その節の一員の列挙として classical の配置に数えた。雅楽の所属は east（2/2）、classical（1/2）で変わらない |
| 6 | `pop.md` で審査済みの Technopop は、V-14 で読み直すと O（J-POP の子）と S（日本の音楽 ＞ C）で east が 2/2 になる。審査は1回だけで（V-14 (5)）、V-16 の `categories` は審査したカテゴリを入れる規則のため、記録は変えない |
| 7 | 琉球音楽・沖縄民謡（S のみ）は三線と琉球音階による特徴的な音像を持ち、BGM の需要も見込まれるが、1資料のみのため個別に審査していない（`blues.md` の Boogie-woogie と同じ扱い）。後から語を足してもデータは壊れない（判断ポイント38） |
| 8 | 既定で非表示の `japanese-traditional` は、ジャンルとして使われた語の記録である。地域・文化の様式の語彙を作るときは、地域の項目（`japanese` など）に別の `id` を使う（V-08） |
| 9 | 音像の説明の一部（雅楽の笙、能楽の囃子、音頭のリズムなど）は資料の記述ではなく一般的な知識による。4語はすべて Suno v6 のインストで未検証（DP-06） |
