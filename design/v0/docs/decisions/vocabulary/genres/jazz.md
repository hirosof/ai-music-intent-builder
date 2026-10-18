# ジャズ系（`jazz-family`）

- 作成日: 2026-09-17
- 語数: 14（既定で表示。段階4b の前。V-13 の閾値 25 以内のため分割しない）
- 既定で非表示の語: 6（V-16）
- 所属は V-14 で判定。段階3 の (ii) は V-15 で判定
- 見直し: 2026-09-17 に V-14 (7) を定めて適用した（Jazz のワールド系のタグを外した。採否は変更なし。判断ポイント80）
- 手順・細則・略号: `../README.md`

---

## 段階1: 3資料以上に登場する語

見出しの経路は V-14 (1) に従いすべて合わせて数えた。対応する見出しは C の「Jazz」、O の「ジャズ」、G の「ジャズ」、S の「5 ジャズ」。他のジャンルとの関係を説明する本文の言及は、出現には数えるが配置には数えない（V-14 (7)）。

| 語 | C | O | G | S | 数 | 所属 |
|---|---|---|---|---|---|---|
| Jazz | jazz（最上位・一覧） | jazz（最上位）。アフリカの節の Amapiano・Afrobeat の説明は配置に数えない | jazz（最上位・本文）。ダンス・ヒップホップ・ラテンの節の言及は同上 | jazz（最上位・本文）。ブルース・ロック・ヒップホップ・カントリー・ラテン・ワールドの節の言及は同上 | 4 | jazz（4/4）。当初は本文の言及で world 3/4 としてタグを付けた（判断ポイント80） |
| Dixieland / Swing / Bebop / Hard Bop / Cool Jazz / Modal Jazz / Free Jazz / Jazz Fusion / Smooth Jazz | jazz | jazz | jazz | jazz | 各4 | jazz。S のウェスタンスウィングの説明の Swing は関係の説明で、配置に数えない |
| Big Band | jazz | jazz（「Swing / Big band」） | jazz（「Swing / Big Band」） | jazz（スウィングの説明の本文） | 4 | jazz |
| Acid Jazz | jazz（Psychedelic の節は対応なし） | jazz | jazz | jazz | 4 | jazz |
| Latin Jazz | jazz・latin | jazz（「Latin jazz / Afro-Cuban jazz」） | jazz | jazz | 4 | jazz（4/4）。latin は 1/4 |
| Traditional Jazz | jazz | — | jazz（「Dixieland / Traditional Jazz」） | jazz（「ディキシーランド／トラディショナル」） | 3 | jazz（判断ポイント81） |

## 段階2: Suno での実績

該当なし（`../../../research/suno-profile.md` にジャズ系の実例がない）。

## 段階3: 2資料以下の語の審査（V-03、V-15）

| 語 | 判定 | 理由 |
|---|---|---|
| Gypsy Jazz | **追加** | (i) 器楽主体。(ii) 刻むリズムギター（ラ・ポンプ）は奏法・リズムの型で、表す軸がない。Swing はビッグバンドの管楽器を持ち込むため代替にならない（V-15。判断ポイント83） |
| New Orleans Jazz | 追加しない | Dixieland で代替できる（O が併記） |
| Post-bop | 追加しない | Hard Bop と副ジャンル Modal Jazz で代替できる。両方の特徴（ハードバップの編成と語法、旋法に基づく和声）が対象に含まれる |
| Afro-Cuban Jazz | 追加しない | Latin Jazz で代替できる（O が併記） |
| Nu Jazz | 追加しない | Jazz と副ジャンル Electronic で代替できる。どちらも広義の代表項目で、対象にない特徴を持ち込まない |
| Vocal Jazz | 追加しない | R-b 相当。歌唱の有無で区別される語 |
| 1資料のみの語（Contemporary Jazz、Avant-Garde Jazz、Jazz Rock、Dark Jazz、Spiritual Jazz、Soul Jazz、Ragtime ほか） | 追加しない | 1資料のみ。語ごとの判定がないため辞典に記録しない（V-16） |

Jazz-Funk（C のみ。jazz・rnb-soul）は先に作成した R&B・ソウル系の1資料の語として扱った（`rnb-soul.md`）。

## 段階4a: 規則による刈り込み

| 語 | 規則 | 扱い |
|---|---|---|
| Traditional Jazz | R-c | **除外**。G・S が Dixieland と併記しており、音像は Dixieland に含まれる。C は別の項目として並べるが、音の違いの記述はない（判断ポイント81） |

次の適用も検討したが、適用しない。

- Big Band への R-a: 編成を表す語だが、判断ポイント16（`../README.md` §1-1）で軸B に置くと決めている。Swing と O・G が併記するが、一方は様式、一方は編成で、同義ではない（判断ポイント82）
- Latin Jazz への V-11（地域の形容）: 4資料ともジャズの一様式として扱い、S にリズムの記述（キューバ等のリズムとの交差）がある（`pop.md` の Latin Pop と同じ扱い。判断ポイント84）
- Smooth Jazz への R-a: 商業的な呼称の面があるが、G・S が音の方向（聴きやすさ、リラクゼーション）を記述している（`rnb-soul.md` の Quiet Storm と同じ扱い）
- Swing への R-a: リズムの感覚（スウィング感）を表す語としても読めるが、4資料とも1930年代の様式として扱っている

## 結果

### 既定で表示する語

```json
{
  "items": [
    { "id": "jazz",         "label": "Jazz",         "categories": ["jazz-family"], "represents": "jazz-family", "aliases": ["ジャズ"] },
    { "id": "dixieland",    "label": "Dixieland",    "categories": ["jazz-family"], "aliases": ["ディキシーランド", "ディキシーランドジャズ"] },
    { "id": "swing",        "label": "Swing",        "categories": ["jazz-family"], "aliases": ["Swing Jazz", "スウィング", "スイング"] },
    { "id": "big-band",     "label": "Big Band",     "categories": ["jazz-family"], "aliases": ["ビッグバンド"] },
    { "id": "bebop",        "label": "Bebop",        "categories": ["jazz-family"], "aliases": ["Be-bop", "ビバップ"] },
    { "id": "cool-jazz",    "label": "Cool Jazz",    "categories": ["jazz-family"], "aliases": ["クールジャズ"] },
    { "id": "hard-bop",     "label": "Hard Bop",     "categories": ["jazz-family"], "aliases": ["ハードバップ"] },
    { "id": "modal-jazz",   "label": "Modal Jazz",   "categories": ["jazz-family"], "aliases": ["モードジャズ", "モーダルジャズ"] },
    { "id": "free-jazz",    "label": "Free Jazz",    "categories": ["jazz-family"], "aliases": ["フリージャズ"] },
    { "id": "latin-jazz",   "label": "Latin Jazz",   "categories": ["jazz-family"], "aliases": ["ラテンジャズ"] },
    { "id": "gypsy-jazz",   "label": "Gypsy Jazz",   "categories": ["jazz-family"], "aliases": ["Jazz Manouche", "ジプシージャズ", "マヌーシュ・ジャズ"] },
    { "id": "jazz-fusion",  "label": "Jazz Fusion",  "categories": ["jazz-family"], "aliases": ["ジャズフュージョン"] },
    { "id": "smooth-jazz",  "label": "Smooth Jazz",  "categories": ["jazz-family"], "aliases": ["スムースジャズ", "スムーズジャズ"] },
    { "id": "acid-jazz",    "label": "Acid Jazz",    "categories": ["jazz-family"], "aliases": ["アシッドジャズ"] }
  ]
}
```

### 既定で非表示の語（V-16）

段階3・4a の表から、語ごとの判定がある語を記録した。「1資料のみの語」のまとめ行は記録しない。

```json
{
  "items": [
    { "id": "new-orleans-jazz", "label": "New Orleans Jazz", "categories": ["jazz-family"], "aliases": ["ニューオーリンズジャズ"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Dixieland" } },
    { "id": "post-bop", "label": "Post-bop", "categories": ["jazz-family"], "aliases": ["ポストバップ"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Hard Bop ＋ 副ジャンル Modal Jazz" } },
    { "id": "afro-cuban-jazz", "label": "Afro-Cuban Jazz", "categories": ["jazz-family"], "aliases": ["アフロキューバンジャズ"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Latin Jazz" } },
    { "id": "nu-jazz", "label": "Nu Jazz", "categories": ["jazz-family"], "aliases": ["ヌージャズ", "ニュージャズ"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Jazz ＋ 副ジャンル Electronic" } },
    { "id": "vocal-jazz", "label": "Vocal Jazz", "categories": ["jazz-family"], "aliases": ["ボーカルジャズ", "ヴォーカルジャズ"], "defaultVisible": false,
      "exclusion": { "kind": "vocal", "note": "歌唱の有無で区別される語", "substitute": "Jazz" } },
    { "id": "traditional-jazz", "label": "Traditional Jazz", "categories": ["jazz-family"], "aliases": ["Trad Jazz", "トラディショナルジャズ"], "defaultVisible": false,
      "exclusion": { "kind": "contained", "note": "G・S が Dixieland と併記", "substitute": "Dixieland" } }
  ]
}
```

## 他カテゴリへ送る語

なし。

当初は Jazz にワールド系のタグを付けていたが、判断ポイント80 で V-14 (7) を定めて外した。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 表示順: 代表項目 → 初期（Dixieland〜Big Band）→ モダン（Bebop〜Free Jazz）→ 地域の融合（Latin Jazz、Gypsy Jazz）→ 電化以降（Jazz Fusion〜Acid Jazz）。非表示の語は段階3 → 段階4a の表の順 |
| 2 | 代表項目は最上位の見出し名 Jazz（4資料とも単独の系統名で、まとめた系統はない）。V-14 (6) によるカテゴリの別名はない |
| 3 | S の「ディキシーランド／トラディショナル」の「トラディショナル」はジャズの節の表の行であり、Traditional Jazz の表記揺れとして数えた（`hiphop.md` の判断ポイント65 と同じ扱い）。数えなければ2資料で段階3 になり、Dixieland で代替できるため結果は変わらない |
| 4 | S の「フュージョン」は Jazz Fusion と同じ語に数えた。別名に「フュージョン」単独は付けない（複数の融合様式を指し得る。判断ポイント21・39）。検索では別名「ジャズフュージョン」の部分一致で見つかる想定 |
| 5 | `Afro-Cuban Jazz` は V-06（ハイフンの後は小文字）の例外として、固有名詞の Cuban を大文字のままにした。V-06 は固有名詞を想定していない |
| 6 | Gypsy Jazz の「Gypsy」はロマの人々への呼称として差別的と受け取られる場合がある。資料の表記（C・O とも Gypsy jazz）と、ジャンル名としての定着度からラベルは資料どおりとし、同義の Jazz Manouche を別名に置いた（判断ポイント83） |
| 7 | Swing・Cool Jazz・Smooth Jazz・Free Jazz は英語の一般語や形容を含むが、`term` を付けない（判断ポイント40） |
| 8 | 段階3・4a の音像の説明の一部（Gypsy Jazz のリズムギター、Post-bop の和声など）は資料の記述ではなく一般的な知識による。14語はすべて Suno v6 で未検証（DP-06） |
