# 用途（軸A）の語彙

- 作成日: 2026-09-18
- 語数: 23（既定で表示）
- 既定で非表示の語: 0
- 手順・細則・略号: `../README.md`（V-xx）、`../input-items.md` グループ1「用途」「用途の詳細」「想定する聴取環境」
- 資料の方針: 専用資料なし。`genres/*.md` で V-11 により軸Aへ送られた語を主な材料とする（判断ポイント162 案Bの変形）
- 辞典形式（R-19）を適用（判断ポイント167・190・192の方針を継続。判断ポイント194）
- **これ以上の場面レベルの細分化は自由記述に任せる**（判断ポイント199）。既に一般的に認知された
  典型場面（勝利、タイトル、オープニング等）はプリセットとして残すが、さらに細かい場面
  （敗北、ゲームオーバー、ショップ、会話シーン等）をプリセットとして追加することはせず、
  「用途の詳細」（自由記述）に書かせる

---

## 0. 位置づけ

「用途」は選択＋自由記述、拡張可の項目（`../input-items.md` グループ1）。
ジャンルの語彙作成の過程で、ジャンルではなく軸Aとして扱うと決めた語（V-11、R-a）を主な材料とする。
専用資料がないため、地域・文化の様式・情緒と同様、根拠の区分を明示して記録する。

## 1. 材料の収集

### 1-1. ジャンル資料の見出しの振り分け（`../README.md` §1-1）

骨格を決める段階で、資料の記載から軸Aへの行き先と決めた語（`../README.md` §1-1 の表）。

| 資料上の記載 | 行き先 |
|---|---|
| Boss Battle, Town Theme, Ending Theme | 軸A 用途 |

### 1-2. ジャンルの骨格・段階4a でR-aとして軸Aへ送られた語

| 語 | 出典 |
|---|---|
| Game Music | `genres/east-asian.md`（判断ポイント123。R-a、`targetAxis: "軸A（用途）"`） |
| Sufi Music | `genres/world.md`（判断ポイント131。ただし主題が宗教で音像が地域により大きく異なるため、本ツールでの用途語としては採用しない。判定の注記1） |
| Comedy、Children's、Holiday | 骨格の集計（`../README.md` §3-1・§3-2）で「V-11（軸Aへ）」と分類された、Cの1資料のみの大分類 |
| Soundtrack、Film Score、Easy Listening、Christmas、Battle Theme 等 | `../README.md` 判断ポイント146「配置のない用途の語」 |
| 「作業用」「瞑想用」 | `../README.md` §3-3 アンビエント系の「含まないもの（行き先）」列 |

### 1-3. 初版レビューでの追加・分割（判断ポイント197・198）

初版（16語）を利用者がレビューし、2つの見落としを指摘した。

1. **「動画のBGM」に対応する項目がなかった**。`../input-items.md` グループ1の設計時の例
   「ゲームの戦闘BGM、動画のBGM」のうち、ゲームBGM側は場面別に細かく分けていたが、
   動画BGM側は対応する粒度の項目がなく非対称だった。動画コンテンツ（YouTube、配信、広告等）向けに
   **動画BGM全般・実況/配信BGM・広告/CM BGM・Vlog/日常動画BGM** の4語を追加した
2. **「街・村のテーマ」の粒度が粗かった**。Suno実験（`../../examples/suno-test-03-village-town-city.md`）で
   音像の違いを確認し、村・街・都市の3語に分割した。あわせて「勝利のテーマ」「タイトル・オープニング」
   （後に「タイトル画面BGM」「オープニングBGM」に分割）を、ボス戦BGM・エンディングテーマとの
   対称性から一般的な知識で追加した

### 1-4. 場面レベルの細分化に歯止めをかけた判断（判断ポイント199）

1-3 で対称性を根拠に「勝利のテーマ」等を追加した際、利用者から「敗北・ゲームオーバーは
どうなるのか」「きりがないのでは」との指摘を受けた。確認すると、この語群は村・街・都市
（実際にSunoで確認した）とは異なり、裏付けのない対称性の推測で追加したものだった。

いったんは3語（勝利のテーマ、タイトル画面BGM、オープニングBGM）を削除したが、
利用者から「削除は行き過ぎ」との判断を受け、**追加済みの語は残し、これ以上の場面の
追加だけを止める**方針に修正した。勝利・タイトル・オープニングは既に広く認知された
典型場面であり、村・街・都市ほどの実測根拠がなくても残す価値がある。一方、敗北・
ゲームオーバー・ショップ・会話シーンのように、対称性を辿れば際限なく増やせる場面は
プリセットに追加せず、「用途の詳細」の自由記述に任せる。

**結論**: 23語（1-3までの内容）を維持する。今後、新たに場面を思いついても、
本節の境界（実際に資料にある語、実測で確認した語、設計例に明示された語、構造的な
非対称を埋める語）を満たさない限りプリセットには追加しない。

## 2. 判断ポイント156の再検討

`../README.md` 判断ポイント156で「軸A（用途）の語彙を作るときに再検討する」とされていた
1資料のみで需要を注記した語（Boogie-woogie、琉球音楽、吹奏楽・マーチ、Cha-Cha-Cha、
Neoclassical の現代の用法、Epic Orchestral、Hybrid Orchestral）を確認した。

**結論**: いずれも用途語ではなくジャンル・様式語であり、軸Aの語彙の存在は
ジャンル語彙への追加基準（V-03・V-12）を変えない。ジャンル側の「1資料のみの語」の
扱い（まとめて記録・辞典に個別記載しない）は変更しない（判断ポイント195）。

## 3. 結果

代表項目は置かない（判断ポイント196。各用途語は独立した選択肢で、束ねる総称語の概念がない）。

```json
{
  "items": [
    { "id": "boss-battle-theme", "label": "ボス戦BGM",       "categories": ["usage"], "term": { "en": "Boss Battle Theme" } },
    { "id": "battle-theme",      "label": "戦闘BGM",         "categories": ["usage"], "term": { "en": "Battle Theme" } },
    { "id": "village-theme",     "label": "村のテーマ",       "categories": ["usage"], "term": { "en": "Village Theme" } },
    { "id": "town-theme",        "label": "街のテーマ",       "categories": ["usage"], "term": { "en": "Town Theme" } },
    { "id": "metropolis-theme",  "label": "都市のテーマ",     "categories": ["usage"], "term": { "en": "City Theme" } },
    { "id": "victory-theme",     "label": "勝利のテーマ",     "categories": ["usage"], "term": { "en": "Victory Theme" } },
    { "id": "title-screen-theme","label": "タイトル画面BGM",  "categories": ["usage"], "term": { "en": "Title Screen Theme" } },
    { "id": "opening-theme",     "label": "オープニングBGM",  "categories": ["usage"], "term": { "en": "Opening Theme" } },
    { "id": "ending-theme",      "label": "エンディングテーマ", "categories": ["usage"], "term": { "en": "Ending Theme" } },
    { "id": "game-music",        "label": "ゲーム音楽全般",   "categories": ["usage"], "term": { "en": "Game Music" } },
    { "id": "video-bgm-general", "label": "動画BGM全般",     "categories": ["usage"], "term": { "en": "Video Background Music" } },
    { "id": "streaming-bgm",     "label": "実況・配信BGM",   "categories": ["usage"], "term": { "en": "Streaming Background Music" } },
    { "id": "ad-cm-bgm",         "label": "広告・CM BGM",    "categories": ["usage"], "term": { "en": "Advertisement/Commercial Music" } },
    { "id": "vlog-bgm",          "label": "Vlog・日常動画BGM", "categories": ["usage"], "term": { "en": "Vlog Background Music" } },
    { "id": "soundtrack",        "label": "映像作品のサウンドトラック", "categories": ["usage"], "term": { "en": "Soundtrack" } },
    { "id": "film-score",        "label": "映画音楽",         "categories": ["usage"], "term": { "en": "Film Score" } },
    { "id": "holiday-music",     "label": "ホリデー音楽",     "categories": ["usage"], "term": { "en": "Holiday Music" } },
    { "id": "christmas-music",   "label": "クリスマス音楽",   "categories": ["usage"], "term": { "en": "Christmas Music" } },
    { "id": "easy-listening",    "label": "イージーリスニング", "categories": ["usage"], "term": { "en": "Easy Listening" } },
    { "id": "comedy",            "label": "コミカル・ユーモラスな用途", "categories": ["usage"], "term": { "en": "Comedy" } },
    { "id": "childrens-music",   "label": "子供向け",         "categories": ["usage"], "term": { "en": "Children's Music" } },
    { "id": "work-background",   "label": "作業用BGM",       "categories": ["usage"], "term": { "en": "Work/Study Background" } },
    { "id": "meditation-music",  "label": "瞑想用BGM",       "categories": ["usage"], "term": { "en": "Meditation Music" } }
  ]
}
```

## 既定で非表示の語（V-16）

該当なし。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | Sufi Music は採用しない。R-aで軸Aへの言及があるが、`genres/world.md` の説明どおり「宗教の文脈で定義され、音像が地域によって大きく異なる」ため、本ツールの用途語（ゲームBGM・動画BGM等の文脈）としては性質が異なる |
| 2 | Trailer Music は用途語ではなくジャンル語として `genres/cinematic.md` で既に採用済み（判断ポイント144）。本カテゴリでは重複して扱わない |
| 3 | 村のテーマ・街のテーマ・都市のテーマは、Suno実験（`../../examples/suno-test-03-village-town-city.md`）で音像の違いを確認して分割した。村＝マリンバ・アコースティックピアノ等の生楽器の牧歌的な響き、街＝チップチューン・FMベル等のアーケード的な軽快さ、都市＝サブベース・アナログパッド等のローファイ電子音の夜の雰囲気と、Sunoが書き換えたスタイルが一貫して異なった（実際に確認できた事例のため、資料に基づく段階3の他の語より根拠が強い） |
| 4 | 勝利のテーマ・タイトル画面BGM・オープニングBGM・動画BGM全般・実況/配信BGM・広告/CM BGM・Vlog/日常動画BGMは一般的な知識による。資料や実測の裏付けはないが、いずれもゲーム・動画制作で広く認知された典型場面であり、利用者の判断で維持している（判断ポイント199） |
| 5 | これ以降、新たな場面（敗北、ゲームオーバー、ショップ、会話シーン等）をプリセットとして追加することはしない（判断ポイント199）。追加の要否を毎回吟味するより、境界を明確にして自由記述に任せるほうが運用として安定する |
| 6 | 23語はすべて Suno v6 で未検証（DP-06）。ただし村・街・都市の3語（注記3）は初回のSuno生成で実際に異なる音像を確認済み |
