# プリセット（語彙）データ仕様

- 作成日: 2026-09-19
- 状態: 暫定（判断ポイント203〜210・213。承認済みの既定案）
- 対象: 軸A〜F・G（歌詞の構成セクション。2026-10-16 追加）の語彙（`decisions/vocabulary/` の json ブロック）を、語彙ごとのファイル（`presets/<語彙 id>.json`）と索引（`presets/index.json`）にまとめたもの
- 関連: `../decisions/presets.md`（選択肢の設計）、`../decisions/vocabulary/README.md`（語彙の選定。判断ポイント203〜210 の記録先）、`../decisions/ui-and-nonfunctional.md` §4-4（保存データ）

---

## 0. 位置づけ

`decisions/vocabulary/**/*.md` に散在していた json ブロック（35ファイル・71ブロック）を、実装が読むデータ構造にまとめる。
本書はその構造・生成規則・検証規則・利用側の規約を定める。

含まないもの: 入力項目の定義（項目 id、状態、既定値、具体化の許容度、項目と語彙の対応）。これは入力項目の仕様の側で持つ（§10）。

---

## 1. ファイル構成

| パス | 内容 | 編集 |
|---|---|---|
| `docs/decisions/vocabulary/**/*.md` | 語彙の**正**。各ファイルの ```json ブロック | 語彙の変更はここで行う |
| `docs/specifications/presets.md` | 本書 | 手書き |
| `docs/specifications/presets.schema.json` | 語彙ファイル（1語彙分）の JSON Schema（draft 2020-12） | 手書き |
| `docs/specifications/presets-index.schema.json` | `index.json` の JSON Schema | 手書き |
| `docs/specifications/presets/index.json` | 生成物。語彙ファイルの一覧（順序つき） | **手で編集しない** |
| `docs/specifications/presets/<語彙 id>.json` | 生成物。**1語彙1ファイル**（19ファイル。2026-10-16 に `section-vocal` を追加） | **手で編集しない** |
| `tools/build-presets/build_presets.py` | 統合と検証のスクリプト（Python 標準ライブラリのみ。jsonschema があればスキーマ検証も行う） | 手書き |

### 生成の向き（判断ポイント203）

md の json ブロックを正とし、`presets/` の JSON はスクリプトで再生成する。

- `docs/README.md` の「decisions が正、specifications は decisions から導く」に従う
- 631語の二重管理を避ける。段階4b（数による非表示）や判断ポイントの追記は今後も md に入る
- 生成物は日時を持たない（同じ入力から同じ出力。差分が語彙の変更だけになる）。UTF-8・LF・1語（カテゴリ・警告ペア・index の行）1行の整形（判断ポイント204）

```
python tools/build-presets/build_presets.py           # 検証して生成（生成先の古い JSON は削除する）
python tools/build-presets/build_presets.py --check   # 生成せず、生成先が最新か確認（最新でなければ終了コード2）
```

語彙（md）を変更したら再生成して、`presets/` の JSON を一緒にコミットする。生成先にある生成対象でない `*.json`（分割前の `presets.json` など）は、再生成時に削除される。

---

## 2. データ構造

### 2-1. 最上位（判断ポイント204）

**語彙（種類）ごとに1ファイル**とし、一覧を `index.json` に持つ。語彙間で共有する実行時の参照はない（警告ペアも語彙のファイルの中で完結する）。

```
presets/
  index.json        語彙ファイルの一覧（順序つき）
  usage.json  listening-environment.json
  genre.json  region-style.json  style-lean.json  era.json
  emotion.json  intensity.json  brightness.json
  instrument.json  voice-treatment.json  ensemble-size.json
  tempo-feel.json  development-shape.json  section.json
  section-vocal.json（軸G。2026-10-16 追加）
  spatial-texture.json  recording-texture.json  mix-direction.json
```

`index.json`（`presets-index.schema.json`）:

```json
{ "schemaVersion": 1, "vocabularies": [ { "id": "usage", "file": "usage.json" }, ... ] }
```

語彙ファイル（`presets.schema.json`）の最上位は、`schemaVersion` と §2-2 の語彙のフィールド、および任意の `warningPairs`（§2-6）。

`schemaVersion` はプリセットのファイル構造の版であり、全ファイルで同じ値。保存データ（`ui-and-nonfunctional.md` §4-4）の `schemaVersion` とは別物。

### 2-2. 語彙（vocabulary）

語彙は、入力項目が参照する選択肢の単位。項目とは別に持つ（ジャンルは主／副ジャンルで、楽器は主旋律・伴奏・リズムの3項目で共有するため）。

| フィールド | 必須 | 内容 |
|---|---|---|
| `id` | ○ | 語彙 id（小文字ケバブ） |
| `axis` | ○ | `A`〜`G`（`input-items.md` §0。`G` は歌詞の構成セクション `section-vocal` だけ。2026-10-16 追加） |
| `label` | ○ | 語彙の表示名（仮） |
| `structure` | ○ | `categorized`（カテゴリを持つ）／ `flat`（持たない） |
| `categories` | categorized のとき必須。flat では持てない | §2-3 |
| `items` | ○ | §2-4。**flat 語彙の表示順は配列順** |
| `warningPairs` | — | §2-6。ペアがある語彙だけ持つ |

### 2-3. カテゴリ（category。categorized 語彙のみ）

| フィールド | 必須 | 内容 |
|---|---|---|
| `id` | ○ | カテゴリ id。語彙の `items[].categories` と `represents` から参照される |
| `label` | ○ | 「〜系」（`decisions/presets.md` §3-2） |
| `order` | ○ | カテゴリの表示順（小さい順） |
| `aliases` | — | 検索用の別名（`decisions/presets.md` §11-4）。依頼文には使わない |
| `itemOrder` | ○ | 所属する語（非表示の語を含む）の id を表示順に並べたもの。§4-4 の規則で生成される |

カテゴリは表示のためだけに存在し、`term` を持たず、選択もされない（`decisions/presets.md` §3-3）。階層は2段まで。

### 2-4. 語（item）

フィールドは `decisions/presets.md` §1-1・§11-2 のまま。

| フィールド | 必須 | 内容 |
|---|---|---|
| `id` | ○ | 保存データのキー（`choices` のキー）。V-08。**一度使った id は再利用しない** |
| `label` | ○ | UI の表示名（V-06） |
| `categories` | categorized 語彙で必須。flat では持てない | 所属カテゴリの id の配列。先頭は語を審査したカテゴリ |
| `represents` | — | 代表項目が指すカテゴリの id（`decisions/presets.md` §5-3）。categorized 語彙のみ |
| `term` | — | 言語別の表記。`{ "en": "..." }`（v1 は `en` のみ。H-03 待ちで `ja` を足せる形） |
| `jpNative` | — | `true` のときだけ書く。日本語が正式表記の語（`decisions/presets.md` §2-6） |
| `aliases` | — | 検索用の別名。依頼文には使わない |
| `defaultVisible` | — | `false` のときだけ書く（省略は表示）。`exclusion` と対 |
| `exclusion` | `defaultVisible: false` のとき必須 | §2-5 |

### 2-5. 除外情報（exclusion）

全語彙で同じ形（判断ポイント209）。語彙ごとに使える `kind` を制限しない。

| フィールド | 内容 |
|---|---|
| `kind` | 下表の7値 |
| `note` | 辞典に表示する説明（1文）。`substitutable`・`contained`・`count` 以外では必須 |
| `substitute` | 代替の組み合わせ（**テキスト**）。`substitutable`・`contained` では必須 |
| `targetAxis` | 行き先の軸（**テキスト**）。`other-axis` のときだけ持ち、行き先がなければ `null` |

| kind | 由来 | 表示の切り替え | インスト限定 | 現在の語数 |
|---|---|---|---|---|
| `substitutable` | V-03 (ii) / V-15 | 可 | — | 110（ジャンル100、楽器10） |
| `not-instrumental` | V-03 (i) | 可 | ○ | 7 |
| `vocal` | R-b | 可 | ○ | 32 |
| `contained` | R-c | 可 | — | 20 |
| `count` | 段階4b | 可 | — | 0 |
| `other-axis` | R-a | **不可** | — | 17 |
| `hold` | 保留 | **不可** | — | 4 |

「表示の切り替え」と「インスト限定」は `kind` から導く性質であり、データには持たない。

- **表示の切り替え不可**（`other-axis`・`hold`）: 軸の分離を保つため（`decisions/presets.md` §11-3 の3）。使いたい場合はカスタム入力にテキストで転記する
- **インスト限定**（`vocal`・`not-instrumental`）: 初版がインストのみ（R-02）であることによる除外。歌あり対応時に再評価する。39語

`substitute` と `targetAxis` をテキストのままにしたのは、構造化に入力項目 id の体系が先に要るため（判断ポイント61は継続保留。§10）。
現状の `targetAxis` は表記が混在する（「軸D（音の構成）」「地域・文化の様式」など。17件中5件が `null`）。

### 2-6. 警告ペア（warningPairs）

`decisions/vocabulary/warning-pairs.md` の json ブロックを取り込む。警告は語彙をまたがずに判定するため、**ペアはその語彙のファイルの `warningPairs` に入れる**（現状は `genre.json` のみ。判断ポイント204）。

| フィールド | 内容 |
|---|---|
| `ids` | 2語の id。非表示の語でも対象（`decisions/presets.md` §11-3 の5） |
| `basis` | `W-a`（名前が似ているが別物）／ `W-b`（同じ系譜の姉妹様式で、同時には成り立たない） |
| `reason` / `source` | 表示用の理由／追跡用の出所 |

---

## 3. 語彙の一覧（2026-09-19 時点。2026-10-18 に `section-vocal` を追記）

| 語彙 id | 軸 | 構造 | 表示 / 非表示 | ソース |
|---|---|---|---|---|
| `usage` | A | flat | 23 / 0 | `usage.md` |
| `listening-environment` | A | flat | 3 / 0 | `small-choices.md` |
| `genre` | B | categorized（16カテゴリ） | 205 / 180 | `genres/*.md` |
| `region-style` | B | flat | 11 / 0 | `region-style.md` |
| `style-lean` | B | flat | 3 / 0 | `small-choices.md` |
| `era` | B | flat | 9 / 0 | `small-choices.md` |
| `emotion` | C | flat | 12 / 0 | `emotion.md` |
| `intensity` | C | flat | 3 / 0 | `small-choices.md` |
| `brightness` | C | flat | 3 / 0 | `small-choices.md` |
| `instrument` | D | categorized（12カテゴリ） | 124 / 10 | `instruments/*.md` |
| `voice-treatment` | D | flat | 6 / 0 | `small-choices.md` |
| `ensemble-size` | D | flat | 3 / 0 | `small-choices.md` |
| `tempo-feel` | E | flat | 5 / 0 | `temporal-structure.md` |
| `development-shape` | E | flat | 4 / 0 | `temporal-structure.md` |
| `section` | E | flat | 7 / 0 | `temporal-structure.md` |
| `section-vocal` | G | flat | 7 / 0 | `lyrics.md` |
| `spatial-texture` | F | flat | 7 / 0 | `production-quality.md` |
| `recording-texture` | F | flat | 7 / 0 | `production-quality.md` |
| `mix-direction` | F | flat | 6 / 0 | `production-quality.md` |
| 計 | | | 448 / 190（638語） | |

語彙 id は、ソースの疑似カテゴリ（§4-2）をそのまま流用したもの（上記のうち、`genre`・`instrument` と少数の択一項目の7語彙は新設）。少数の択一項目の7語彙は `small-choices.md` にまとめている（§9）。

---

## 4. 生成規則

### 4-1. 語彙の判別と語の統合（判断ポイント205）

- 語の識別は「語彙＋id」。**id の名前空間は語彙ごと**
- 語彙をまたぐ同一 id は、ジャンル側が `other-axis` で、行き先の語彙に同名の語があるときだけ許す。例外リストは `celtic`（`region-style`）と `game-music`（`usage`）の2件。リストは `build_presets.py` の `ALLOWED_CROSS_VOCAB`
- もう1種類の例外として、**同じ構成の概念をインスト用と歌あり用の別の語彙として持つ組**（`section` と `section-vocal`）では、両方の語彙にある id（`intro`・`bridge`・`outro`）を、`term.en` が一致するときだけ許す（ラベルは違ってよい）。リストは `build_presets.py` の `ALLOWED_SHARED_VOCABS`（判断ポイント213）
- **同一語彙の同じ id を複数ファイルが定義してよい**。全フィールドが一致するときだけ1語に統合し、不一致は生成エラー。現状は `electric-guitar` と `electric-bass`（`guitar-bass.md` と `electric.md`）の2語

### 4-2. フラット語彙の `categories`（判断ポイント206）

ソースの `categories` の値（`emotion`、`tempo-feel` など。110語）は疑似カテゴリで、語彙と1対1に対応する。共有ファイル（`temporal-structure.md`、`production-quality.md`）で語彙を判別するために使い、生成物には出力しない。ソースの md は書き換えない。

### 4-3. カテゴリ定義の集約（判断ポイント207）

28カテゴリのうち JSON ブロックがあるのは5件だけ（ambient、classical、east-asian、reggae-caribbean、world）。残りは README の表にある。スクリプトが次を読む。

- ジャンル: `vocabulary/README.md` §3-3 の表（order／id／label）、別名の表、各ファイルの単独ブロック
- 楽器: `instruments/README.md` §2 の表（id／order／label。ラベルの括弧書きは除く）

語を持たない行は出力しない（`string-plucked-instrument-family`、`percussion-instrument-family`、作成しない `world-instrument-family`。`decisions/presets.md` §9 の「2段まで」）。

### 4-4. 表示順（判断ポイント208）

カテゴリごとの `itemOrder` を次の規則で生成する。

1. 代表項目（表示語のとき）
2. そのカテゴリのファイルが並べた順の表示語
3. 他ファイルで定義された表示語（マニフェスト順、ファイル内の並び順）
4. 非表示の語（2→3 と同じ順）

上書きは、ソースに順序の記録があるものだけ。現状は日本・東アジア系（`east-asian.md` の表示順）の1件で、歌謡曲 → City Pop → 渋谷系 → Anime Song の順に固定した。

他ファイルで定義され別カテゴリにも出る表示語は9語ある（Blues Rock、Rockabilly、Folk Rock、Reggaeton、Latin Pop、City Pop、渋谷系、歌謡曲、Anime Song）。Blues Rock は `blues.md` 注記1の記載どおり Texas Blues の後になる。Rockabilly、Folk Rock、Reggaeton、Latin Pop は3で末尾に付く（近い系統の隣に置く案は採らなかった）。

flat 語彙の表示順は配列順。

---

## 5. 検証規則

`build_presets.py` が生成時に実行する。1件でもエラーがあれば、何も書かない。

| # | 内容 |
|---|---|
| S1 | すべての json ブロックがパースできる |
| S2 | id が V-08 の形式（`^[a-z0-9]+(-[a-z0-9]+)*$`）で、語彙内で一意 |
| 案3 | 語彙をまたぐ id 重複は例外リスト（§4-1 の2種類）のみ。二重定義は内容一致のときだけ統合 |
| S4 | categorized 語彙の語は `categories` が空でなく、すべて定義済みのカテゴリ。flat 語彙の疑似カテゴリは想定どおり |
| S5 | 同一語彙内で、ラベル・別名が他の語のラベル・別名と衝突しない（大文字小文字を区別しない）。ジャンルのカテゴリ数が想定どおり |
| S6 | `defaultVisible: false` と `exclusion` は対。`defaultVisible: true` は明示しない |
| S7 | `kind` が7値のいずれか。`note`・`substitute`・`targetAxis` の必須条件（§2-5） |
| S8 | `represents` は語の `categories` に含まれる定義済みカテゴリ。1カテゴリに代表項目は1つ以下。flat 語彙には置けない |
| S9 | 警告ペアの2語が同じでなく、そのペアを持つ語彙に存在する。`basis` が `W-a`／`W-b` |
| S10 | 各カテゴリの `itemOrder` が、所属する語と過不足なく一致する |
| S12 | 各語彙ファイルを `presets.schema.json` で、`index.json` を `presets-index.schema.json` で検証（jsonschema がインストールされている場合） |
| S13 | `term` の言語キーは `en` のみ。`jpNative` は `true` のときだけ |

S11 は欠番。語数のスナップショットは検証しない（語彙の追加・非表示化は通常の作業のため）。生成時に内訳を表示する。

---

## 6. 利用側の規約

### 6-1. 参照

- 保存データの `choices` のキーは語の `id`。**どの語彙で解決するかは、項目（`leadInstruments` など）が決める**（項目と語彙の対応は §10）
- カテゴリは保存データに現れない（`decisions/presets.md` §1-2）

### 6-2. 表示

- 階層テーブル（categorized 語彙。Nuxt UI の `UTable` の tree data）: カテゴリを `order` 順に並べ、各カテゴリの語を `itemOrder` の順に出す。表示するのは `defaultVisible` が省略の語と、利用者が表示に切り替えた語、非表示でも状態が「未指定」以外の語（`decisions/presets.md` §4-2・§11-3 の4）
- `represents` の語は、同じカテゴリの兄弟と相反する状態にすると警告（生成は止めない。`decisions/presets.md` §5-3）
- 表示の切り替えは UI 設定に、**語彙ごとに入れ子**で持つ（既定値から変えたものだけ）。`decisions/presets.md` §11-3 の2の例 `{ "trip-hop": true }` は次の形に読み替える。

```json
{ "genre": { "trip-hop": true, "edm": false }, "instrument": { "helicon": true } }
```

### 6-3. 依頼文に渡す表記

`decisions/presets.md` §2-6・§7 P-01・P-04 による。§2-6 は「標準」で `jpNative` でない語の扱いを明文化していないため、`term.en` があればそれ、なければ `label` と補完した（§8）。

| 出力言語 | 渡す表記 |
|---|---|
| すべて日本語 | `label`（`term` は使わない） |
| 標準（混在） | `jpNative` の語は `label`。それ以外は `term.en`、なければ `label` |
| すべて英語 | `term.en`。なければ `label`（チャットAI が訳す） |

`aliases` は依頼文に渡さない。

### 6-4. 警告

`warningPairs` の2語が同じ項目内で両方「使用する」のとき警告する（生成は止めない）。表示設定にかかわらず判定する。

### 6-5. 辞典

辞典の収録範囲は「語ごとの判定記録がある語」（`decisions/presets.md` §11-3 の8）。楽器の辞典は10語だけで、資料にある大半の楽器名は記録がない。UI では「辞典にない語はカスタム入力へ」と案内する。

---

## 7. 判断ポイント（承認済みの既定案）

番号は `decisions/presets.md` §6・`decisions/vocabulary/README.md` §5 と通し番号。

| # | 論点 | 決定 |
|---|---|---|
| 203 | 生成の向き | md の json ブロックが正。`presets/` の JSON は生成物（§1） |
| 204 | 構造 | **語彙（種類）ごとに1ファイル（18ファイル）＋ `index.json`**。語彙は項目とは別の単位。警告ペアはその語彙のファイルの中に持つ。整形は1語1行（当初は1ファイル・インデント1で 7,895 行だったため、整形とファイル分割を見直した）（§2・§10） |
| 205 | id の名前空間と二重定義 | 語彙ごと。語彙間の同一 id は例外2件のみ。同一語彙内の二重定義は内容一致のときだけ統合（§4-1） |
| 206 | フラット語彙の `categories` | 出力しない。疑似カテゴリは語彙の判別にだけ使う（§4-2） |
| 207 | カテゴリ定義の集約 | README の表から生成。語を持たない行は出力しない（§4-3） |
| 208 | 表示順 | `itemOrder` を規則で生成。上書きは日本・東アジア系の1件（§4-4） |
| 209 | 除外情報の非対称 | スキーマは全語彙で対称。`kind` の性質は導出。`substitute`・`targetAxis` はテキストのまま（§2-5） |
| 210 | 少数の択一項目 | スキーマは同じ形で受ける。中身は `small-choices.md`（7語彙・30語）。「しない」の値（`no-voice`・`no-era`・`no-playback`）を、概念が曲になくてよい項目にだけ持たせる（§9） |
| 213 | 語彙をまたぐ同一 id の例外の追加 | `section` と `section-vocal` を、共有を許す組にする。両方にある id は `term.en` が一致するときだけ許す（§4-1。`decisions/vocabulary/README.md` §5） |

---

## 8. 補完・仮定一覧

| # | 内容 | 根拠 |
|---|---|---|
| 1 | 統合の対象は json ブロックのみ。散文の表は正としない（カテゴリの表だけ例外） | 案1・案5 |
| 2 | 生成物に日時を入れず、省略時 `defaultVisible = true` も展開しない | 再現性、`decisions/presets.md` §11-2 |
| 3 | スクリプトは Python、`tools/build-presets/` に置く。出力先は `docs/specifications/presets/` | 既存の `tools/suno-audio-compare` に合わせた |
| 4 | 語彙 id はソースの疑似カテゴリ id を流用。語彙の日本語ラベルは仮 | 最小の変更 |
| 5 | 「標準」で `jpNative` でない語は `term.en`、なければ `label` | `decisions/presets.md` §2-6 の空白を P-01 で補った |
| 6 | 楽器の親カテゴリ（撥弦・打楽器）は出力しない | `decisions/presets.md` §9（2段まで） |
| 7 | `itemOrder` の非表示の語は、表示語の後にソース順で並べる | `decisions/presets.md` §11-3 の4（指定済みの非表示語を出すとき）に位置の規則がない |

---

## 9. 少数の択一項目（判断ポイント210）

入力項目のうち、選択肢が少数で固定の7項目は、当初 `vocabulary/` に JSON として存在しなかった（`input-items.md` §2 と照合）。2026-09-19 に `vocabulary/small-choices.md` として作成した（7語彙・30語）。

| 語彙 id | 項目 | 選択肢 |
|---|---|---|
| `listening-environment` | 想定する聴取環境 | 再生のされ方を想定しない（`no-playback`）／ループ再生する／通して聴く |
| `era` | 年代・時代感 | 年代を特定しない（`no-era`）／1950年代以前／1960年代〜2020年代（10年区切り、8区分） |
| `voice-treatment` | 声の扱い | 声を入れない（`no-voice`）／合唱／言葉のない合唱／言葉のない独唱／ハミング／スキャット |
| `intensity` | 強度 | 控えめ／中程度（id `medium`）／強い |
| `brightness` | 明暗 | 明るい／中間／暗い |
| `ensemble-size` | 編成の規模 | 独奏／小編成／大編成 |
| `style-lean` | 様式の寄せ方 | 〜風／伝統寄り／現代寄り。表示名と英語表記（`style`／`traditional`／`modern`）は仮 |

- 本書の構造で受けられる（`flat` 語彙、`term` は任意）。判断ポイント199の歯止め（対称性だけを根拠に増やさない）を適用した
- **「しない」の値**（`no-voice`・`no-era`・`no-playback`。利用者の指摘とA案の選択、2026-09-19）: 単一選択の項目で「AIが決めてよい」と「AIに足させない」を区別する。前者は項目の状態②お任せ、後者は①指定のこの値で表す。持たせるのは、その概念が曲になくてよい項目（声・年代・再生のされ方）だけ。強度・明暗・編成の規模は概念が必ず存在し、中間の値があるため持たせない。項目側の変更（声の扱いの②を「AIが決めてよい」にする、既定を③「声を入れない」にする）は `input-items.md` 判断ポイント9。「足さない」を状態として持つ案（B案）は採らなかった
- 未対応: 副ジャンル・地域の様式・BPM・構成など、他の RP-11 の項目にある同種の空白（②が「足さない」固定で、「AIが決めてよい」が表せない）。入力項目の仕様で扱う
- 声の扱いの「合唱」は利用者の提案で追加した。合唱（クワイヤ）は楽器語彙には入れない（判断ポイント165を継続）
- `term` は決まっているものと、自明なもの（`1980s` など）だけに付けた。声の扱いの `wordless choir` は Suno で歌詞が付かないことを確認済み。`choir` を含む他の語は未検証
- 強度の id を `medium` としたのは、テンポ感の `moderate` との語彙間の重複を避けるため（生成時の検証が検出した。§4-1）
- 7項目はいずれも選択のみで、項目内に自由記述の逃げ道を持たない。追加したい要素は「その他・補足」に書ける。項目ごとの自由記述の要否は、入力項目の仕様で決める（作ったあとに考える方針とした。利用者の判断、2026-09-19）

---

## 10. 暗黙の前提と残る論点

- 項目と語彙の対応（`bindings`）は入力項目の仕様側で持つ。本書は語彙側だけを定義する
- **楽器の語彙は3項目（主旋律・伴奏・リズム）で共有される**（`decisions/vocabulary/instruments/README.md` §5）。同じ楽器を項目ごとに「使用する」と「使用しない」に分けて指定でき、3値選択（`input-items.md` §1-2）が防いだ矛盾が項目をまたぐと復活する。項目仕様で扱う（警告か、除外の集約規則か）
- 基調となる情緒は `decisions/presets.md` §4-2 で階層テーブルの対象だが、語彙は階層を持たない一覧。UI 仕様で確認が要る
- `substitute` の構造化（判断ポイント61）は継続保留。144件のうち約95%は語彙内の語を含むため機械的に始められる見込み。構造化には入力項目 id の体系が先に要る。任意フィールドの追加は `schemaVersion` を上げずに行える
- `targetAxis` は表記が混在（§2-5）。構造化するときに統一する
- ファイルの大きさ（行数）: `genre.json` 417行・約81KB、`instrument.json` 154行・約22KB、残りの語彙は各 10〜30 行。合計でも約114KB（gzip で約22KB）で、実装（Vite）がすべて import しても負担は小さい
- 当初は1ファイル・インデント1の整形（7,895行）だった。利用者の指摘で整形を見直し（1ファイル・1語1行で679行）、さらに種類別のファイル分割へ変更した。分割を採らないとした最初の理由（「警告ペアや例外の参照がファイルをまたぐ」「分けても小さくならない」）は誤り・論点違いだった（警告ペアは1語彙で完結、語彙間の例外は生成時の検証だけ、効果は総量ではなく1ファイルの大きさ）。`discussions/2026-09/10_presets-json-schema.md` §5
- 語彙の表示の切り替え UI は、16語彙が非表示の語を持たないため、辞典の入口が意味を持つのはジャンルと楽器だけ（導出できる。データには持たない）
