# 少数の択一項目の語彙（7項目）

- 作成日: 2026-09-19
- 対象項目: `../input-items.md` の次の7項目（選択肢が少数で固定の項目）
  - 軸A: 想定する聴取環境
  - 軸B: 様式の寄せ方、年代・時代感
  - 軸C: 強度、明暗
  - 軸D: 声の扱い、編成の規模
- 資料の方針: 専用資料なし。`../input-items.md` の記述（選択肢が書かれているものはそのまま）と、
  `../../research/suno-profile.md`・`../request-text.md` の実例を材料とする。書かれていないものは一般的な知識による判定
- 辞典形式（R-19）を適用。すべて既定で表示し、既定で非表示の語は該当なし
- 判断ポイント210（`../../specifications/presets.md` §9）で「スキーマは同じ形で受ける。中身は別作業」とした作業の成果
- 既定値（②お任せのときの値、③既定値に従うときの値）は語彙ではなく項目の側で持つ（`../input-items.md` §2 のとおり）
- 「声を入れない」「年代を特定しない」「再生のされ方を想定しない」（`no-voice`・`no-era`・`no-playback`）は、
  その概念が曲になくてよい項目（声・年代・再生のされ方）にだけ持たせた（判断ポイント210の追記。2026-09-19、利用者の指摘とA案の選択）。
  これは①指定の値で、AIに足させないことを表す。②お任せ（AIが決めてよい）とは別。
  強度・明暗・編成の規模のように概念が必ず存在する項目には持たせない（中間の値があるため）
- 7項目はいずれも選択のみで、項目内に自由記述の逃げ道を持たない（教訓4-1）。
  追加したい要素は「その他・補足」（グループ8）に書ける。項目ごとの自由記述の要否は、入力項目の仕様で決める

---

## 1. 想定する聴取環境

項目名は「聴取環境」だが、独立させた理由は「ループ再生の有無が曲の終わり方の記述に影響するため」
（`../input-items.md` §2）。選択肢は再生のされ方の2択とした。
ヘッドホン・スピーカーなどの物理環境は、依頼文で終わり方以外に効かないため扱わない（補完・仮定）。
`term` は付けない（翻案可の項目）。

| 語 | 根拠 |
|---|---|
| 再生のされ方を想定しない | 「AIに足させない」値。②お任せのときは用途から導いてループや終わり方を書き足すため、それを止める手段がなかった（利用者の指摘）。ループも通して聴くことも前提にしない |
| ループ再生する | `../request-text.md` のレンダリング例の値「ループ再生する」。用途からの導出例（ゲームBGM→ループ寄り） |
| 通して聴く | 用途からの導出例（動画BGM→単体寄り）の対。曲として終わりのある聴き方 |

```json
{
  "items": [
    { "id": "no-playback", "label": "再生のされ方を想定しない", "categories": ["listening-environment"] },
    { "id": "loop",        "label": "ループ再生する",           "categories": ["listening-environment"] },
    { "id": "full-play",   "label": "通して聴く",               "categories": ["listening-environment"] }
  ]
}
```

## 2. 様式の寄せ方

地域・文化の様式で「使用する」にした地域を、どう寄せるか（`../input-items.md` §2 の「様式の寄せ方」、判断ポイント5〜7）。
選択肢と英語表記は、利用者の判断で決めた3択と P-05 の仮表記（`style`／`traditional`／`modern`）をそのまま採った。
表示名は仮。3択の差が Suno で音に出るかは未検証（H-09 は `style` と `traditional` のみ、`modern` は未試行）。

```json
{
  "items": [
    { "id": "style",       "label": "〜風",     "categories": ["style-lean"], "term": { "en": "style" } },
    { "id": "traditional", "label": "伝統寄り", "categories": ["style-lean"], "term": { "en": "traditional" } },
    { "id": "modern",      "label": "現代寄り", "categories": ["style-lean"], "term": { "en": "modern" } }
  ]
}
```

## 3. 年代・時代感

ポピュラー音楽の年代感を、10年区切り（西暦）と日本の元号（和暦）で表す（元号は 2026-10-28 に追加。判断ポイント214）。
単一選択なので、西暦と和暦は排他。表示では「西暦」「和暦」のグループに分ける（`groups`。判断ポイント214、UI 判断ポイント62）。
クラシックの時代（バロック・古典派など）はジャンル語彙にあるため、ここでは扱わない。
細かい指定（例: 1980年代後半、昭和50年代）は、項目の自由記述に書く（入力項目の判断ポイント29。2026-10-28 までは「その他・補足」に書いていた）。
`term` は年代の英語表記として自明なもの（`1980s` など）と、元号の英語表記（Suno の生成物の実例 `Showa-era` の形）に付けた。ジャンルから導く項目のため、②のときは
ジャンル側の手がかりで決まる（`../input-items.md` §2）。導かせたくないときは「年代を特定しない」（`no-era`。
①指定の値で、AIに年代を足させない）を選ぶ。②お任せ（AIが決めてよい）とは別。

```json
{
  "groups": [
    { "id": "gregorian",    "label": "西暦" },
    { "id": "japanese-era", "label": "和暦" }
  ],
  "items": [
    { "id": "no-era",           "label": "年代を特定しない", "categories": ["era"] },
    { "id": "1950s-or-earlier", "label": "1950年代以前", "categories": ["era"], "group": "gregorian", "term": { "en": "1950s or earlier" } },
    { "id": "1960s",            "label": "1960年代",     "categories": ["era"], "group": "gregorian", "term": { "en": "1960s" } },
    { "id": "1970s",            "label": "1970年代",     "categories": ["era"], "group": "gregorian", "term": { "en": "1970s" } },
    { "id": "1980s",            "label": "1980年代",     "categories": ["era"], "group": "gregorian", "term": { "en": "1980s" } },
    { "id": "1990s",            "label": "1990年代",     "categories": ["era"], "group": "gregorian", "term": { "en": "1990s" } },
    { "id": "2000s",            "label": "2000年代",     "categories": ["era"], "group": "gregorian", "term": { "en": "2000s" } },
    { "id": "2010s",            "label": "2010年代",     "categories": ["era"], "group": "gregorian", "term": { "en": "2010s" } },
    { "id": "2020s",            "label": "2020年代",     "categories": ["era"], "group": "gregorian", "term": { "en": "2020s" } },
    { "id": "meiji",            "label": "明治",         "categories": ["era"], "group": "japanese-era", "term": { "en": "Meiji-era" } },
    { "id": "taisho",           "label": "大正",         "categories": ["era"], "group": "japanese-era", "term": { "en": "Taisho-era" } },
    { "id": "showa",            "label": "昭和",         "categories": ["era"], "group": "japanese-era", "term": { "en": "Showa-era" } },
    { "id": "heisei",           "label": "平成",         "categories": ["era"], "group": "japanese-era", "term": { "en": "Heisei-era" } },
    { "id": "reiwa",            "label": "令和",         "categories": ["era"], "group": "japanese-era", "term": { "en": "Reiwa-era" } }
  ]
}
```

## 4. 強度

`../input-items.md` §2 の3択（控えめ／中程度／強い）。②なら「中程度」（項目側の既定）。
`term` は付けない（翻案可）。
id を `medium` としたのは、テンポ感の `moderate`（`temporal-structure.md`）と語彙をまたいで重複させないため（判断ポイント205）。

```json
{
  "items": [
    { "id": "subdued",  "label": "控えめ", "categories": ["intensity"] },
    { "id": "medium",   "label": "中程度", "categories": ["intensity"] },
    { "id": "intense",  "label": "強い",   "categories": ["intensity"] }
  ]
}
```

## 5. 明暗

`../input-items.md` §2 の3択（明るい／中間／暗い）。情緒から導く。導けない場合は「中間」（項目側の既定）。
`term` は付けない（翻案可）。

```json
{
  "items": [
    { "id": "bright",  "label": "明るい", "categories": ["brightness"] },
    { "id": "neutral", "label": "中間",   "categories": ["brightness"] },
    { "id": "dark",    "label": "暗い",   "categories": ["brightness"] }
  ]
}
```

## 6. 声の扱い

インストでも使える声の質感を選ぶ（`../input-items.md` §2 の「なし／言葉のない合唱／ハミング等」の「等」を埋め、
「なし」は「声を入れない」とした）。具体化は「保持」。拡張を許すと歌が入るリスクがあるため。

| 語 | 根拠 |
|---|---|
| 声を入れない | 声を入れないと決めた（①指定）。AIに足させない。②お任せ（AIが決めてよい）とは別で、②の既定でもない（項目側では②を「AIが決めてよい（歌詞のない形に限る）」、既定を③「声を入れない」とする。`../input-items.md` 判断ポイント9）。この選択が除外を兼ねる（3値にしない理由。`../input-items.md` §1-2） |
| 合唱 | 利用者の提案（2026-09-19）。合唱そのもの（`choir`）。クワイヤ音源としても扱われる語だが、楽器語彙には入れない（下記の判定の注記） |
| 言葉のない合唱 | `../input-items.md` 記載。実例の `layered wordless choir`。Suno 実機で歌詞が付かないことを確認済み（`../request-text.md` 判断ポイント9） |
| 言葉のない独唱 | 補完。「言葉のない合唱」の対（独唱）。映画・ゲーム音楽で使われる形 |
| ハミング | `../input-items.md` 記載 |
| スキャット | 補完。意味のない音節で歌う形。ハミングとは発声法が異なる |

`term` は「合唱」（`choir`）と「言葉のない合唱」（`wordless choir`）にだけ付けた。
「言葉のない独唱」「ハミング」「スキャット」は Suno での動作が未検証のため付けていない。
「声を入れない」には付けない（スタイル欄に否定形を書かせない。`../request-text.md` B-05）。

```json
{
  "items": [
    { "id": "no-voice",       "label": "声を入れない",   "categories": ["voice-treatment"] },
    { "id": "choir",          "label": "合唱",           "categories": ["voice-treatment"], "term": { "en": "choir" } },
    { "id": "wordless-choir", "label": "言葉のない合唱", "categories": ["voice-treatment"], "term": { "en": "wordless choir" } },
    { "id": "wordless-solo",  "label": "言葉のない独唱", "categories": ["voice-treatment"] },
    { "id": "humming",        "label": "ハミング",       "categories": ["voice-treatment"] },
    { "id": "scat",           "label": "スキャット",     "categories": ["voice-treatment"] }
  ]
}
```

## 7. 編成の規模

`../input-items.md` §2 の3択（独奏／小編成／大編成）。用途とジャンルから導く。導けない場合は「小編成」（項目側の既定）。
小編成と大編成の境目は決めない（翻案可。チャットAI が用途とジャンルに合わせて解釈する）。`term` は付けない。

```json
{
  "items": [
    { "id": "solo",           "label": "独奏",   "categories": ["ensemble-size"] },
    { "id": "small-ensemble", "label": "小編成", "categories": ["ensemble-size"] },
    { "id": "large-ensemble", "label": "大編成", "categories": ["ensemble-size"] }
  ]
}
```

---

## 既定で非表示の語（V-16）

該当なし。

## 判定の注記

1. **「合唱」と楽器語彙**: 合唱（クワイヤ）は楽器語彙（`instruments/`）には入れていない。声楽系は不採用（判断ポイント165。
   `instruments/README.md` §1-3）。「声の扱い」が独立項目として少数固定で存在し、プリセット式の語彙を別に持つ必要がないため。
   ジャンル語彙の `choral` も、行き先を「軸D（声の扱い）」とする `other-axis` の非表示語になっている。
   将来「声」のプリセット式語彙が必要になったら見直す余地がある（`instruments/README.md` §4 の補完・仮定3）
2. **「合唱」と「言葉のない合唱」**: インストでは歌詞欄を空にすることで歌詞のない曲になる（`../request-text.md` B-01i）。
   このため両者は近い意味になるが、後者は「言葉がない」ことを明示する。前者を「保持」で使ったとき、
   依頼文が `choir` のまま書くか、歌にならない表現（`wordless` など。B-05 の記述）に置き換えるかは、依頼文の検証で確かめる課題
3. **未検証の語**: 「合唱」「言葉のない独唱」「ハミング」「スキャット」は、Suno で歌詞が付かないことを確認していない
   （確認済みは「言葉のない合唱」のみ）。依頼文の検証（H-シリーズ）の候補
4. **「〜しない」の値と②お任せ**: 単一選択の項目では、AIが決めてよい（②お任せ）と、AIに足させない（①指定の
   「〜しない」の値）は別の意味である。状態②が両方を兼ねていた（RP-11で項目ごとに「足さない」側にした）ため、
   声では前者が、年代・聴取環境では後者が表せなかった。前者は項目側の②の定義で、後者は語彙の値（`no-voice`・`no-era`・
   `no-playback`）で表す（A案）。「足さない」を状態として持つ案（B案）は、原則（RP-02・RP-11）の変更が大きいため採らなかった。
   副ジャンル・地域の様式・BPM・構成など、他の RP-11 の項目にある同種の空白は、この対応の対象外（入力項目の仕様で扱う）
5. **項目内の自由記述**: 上記のとおり、7項目には項目内の自由記述がない。声の扱いは1つしか選べないため、
   組み合わせ（例: 合唱とハミング）は「その他・補足」で書く。要否は入力項目の仕様で決める
