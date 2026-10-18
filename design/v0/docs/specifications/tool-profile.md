# ツールプロファイルのデータ仕様

- 作成日: 2026-09-21
- 状態: 暫定（判断ポイント1〜3 は利用者の選択で承認。4〜8 は既定案として提示し、反対がなかったため採用。9 は 2026-09-24 に利用者の選択で承認）
- 対象: ツール固有の情報（欄、機能の有無、固有パラメータ、禁止・注意事項の前提、モード＞操作種別、必要プラン、情報のメタデータ）を、依頼文の生成ロジックから切り離したデータとして持つ形（R-10、DP-03）。初版のデータは Suno（v6）のみ
- 関連: `../decisions/scope.md` R-10・R-12・R-13・R-15・R-17、`../decisions/principles.md` DP-03・DP-06・RP-05・RP-06、`../research/suno-profile.md`（調査の記録。データの出どころ）、`song-file.md` §2-2・§3・§7、`input-items.md` §8、`fields.json`

---

## 0. 位置づけとファイル構成

Suno の欄・パラメータ・操作・上限値を、生成ロジック（依頼文のブロック）に埋め込まず、データとして持つ。ツールを足すときは、プロファイルを1つ足し、生成ロジックは変えない（DP-03）。

| パス | 内容 | 編集 |
|---|---|---|
| `docs/decisions/scope.md` R-10 | ツールプロファイルの決定と理由。**正** | 変更はここで決める |
| `docs/research/suno-profile.md` | Suno の調査の記録。データの出どころ（実画面の確認、第三者情報） | 調査のたびに更新 |
| `docs/specifications/tool-profile.md` | 本書 | 手書き |
| `docs/specifications/tool-profile.schema.json` | ツールプロファイルの JSON Schema（draft 2020-12） | 手書き |
| `docs/specifications/tool-profiles/<toolId>.json` | ツールごとのプロファイル。初版は `suno.json` のみ | 手書き。検証スクリプトで確認する |
| `tools/check-fields/check_fields.py` | 意味の検証（§10-2。P0〜P11、F7、F9）。負例テストは `test_check_fields.py`（`--spec` で仕様書の写しに違反を仕込む） | 手書き |

含まないもの: 依頼文のブロック（何をどう書くか）、UI の画面、生成後の観察や傾向（`suno-profile.md` のうち構造化していない部分）。スキーマは**構造だけ**を検証する。ID の参照関係と、`fields.json` との整合は `check_fields.py` が検証する。

---

## 1. 用語

| 用語 | 意味 |
|---|---|
| ツールプロファイル | 1つのツール（例: Suno）の固有情報をまとめたデータ。ユーザープロファイル・ファクトリープロファイル（`song-file.md` §1）とは別物 |
| 画面（`screen`） | ツールの作成画面の切り替え。Suno ではシンプル／アドバンスド／サウンド。Suno の UI では「モード」と呼ばれるが、本書では**画面**と呼ぶ（判断ポイント1） |
| モード（`mode`） | 画面の中の生成の状態。通常／リミックス。`generationType`（`new`／`derived`）に対応する（R-10。判断ポイント1） |
| 操作（`operation`） | 派生生成の操作種別。リミックスモードの中にある（Cover、ボーカルを編集など） |
| 欄（`field`） | テキストを入れる欄。歌詞、スタイル、除外、曲名など |
| パラメータ（`param`） | 欄以外の UI 設定。ボーカル性別、長さ、バリエーションなど |
| 機能（`feature`） | 欄やパラメータを使った仕組みの有無。除外欄、インスト指定の方法、メタタグ |
| アカウント要素（`accountFeature`） | 利用者のアカウントに紐づく要素。作詞家、Voice、Custom Model、パーソナライズ |
| 指定経路（`route`） | 入力項目の値を、欄の本文で表すか（`text`）、UI 設定で表すか（`uiSetting`）、併用か（`both`）（R-13） |
| 情報源（`source`） | その情報の確からしさの区分（§3-3。DP-06） |

---

## 2. ファイルの形

`tool-profiles/<toolId>.json` は、次のキーを持つ1つのオブジェクトである。すべて必須。

| キー | 型 | 内容 |
|---|---|---|
| `toolId` | 文字列 | ツールの id。**ファイル名（拡張子を除く）と一致**する。`song-file.md` の `toolId` はこの集合から選ぶ（§9） |
| `label` | 文字列 | 表示名 |
| `version` | オブジェクト | 対象とするツールの版（`id`、`label`、`releasedAt`、`note`）。`id` が `toolVersion` の比較先（§9）。`note` は任意 |
| `updatedAt` | 日付 | このファイルの内容を最後に更新した日 |
| `meta` | オブジェクト | プロファイル全体の既定のメタデータ（§3） |
| `defaultDescriptionField` | id | `bindings` に載せない入力項目を、本文として書く欄の id（§8） |
| `screens` | 配列 | 画面（§4-1） |
| `modes` | 配列 | モードと、その中の操作（§4-2、§4-3） |
| `fields` | 配列 | 欄（§5） |
| `params` | 配列 | パラメータ（§6） |
| `features` | オブジェクト | 機能（§7-1）。キーは機能の id |
| `accountFeatures` | 配列 | アカウント要素（§7-2） |
| `models` | 配列 | モデルの選択肢（§7-3） |
| `bindings` | 配列 | 入力項目とツールの欄・パラメータの対応（§8） |

`schemaVersion` は持たない（判断ポイント8）。プロファイルはアプリに同梱するデータで、利用者が保存したものではないため、古い形を読み込む場面がない。形を変えるときは、スキーマとデータを同時に更新し、検証で確認する（ファクトリープロファイルと同じ考え方。`song-file.md` §4-4）。

`id` は、プロファイル内ではすべて半角小文字とハイフン（`^[a-z][a-z0-9-]{0,31}$`。V-08 と同じ）。入力項目（`fields.json`）の id を参照するときだけ、その id（camelCase）をそのまま使う。

---

## 3. メタデータ（情報の確からしさ）

### 3-1. キー

| キー | 型 | 内容 |
|---|---|---|
| `source` | 列挙 | 情報源（§3-3） |
| `confirmedAt` | 日付 | 確認した日 |
| `confirmedBy` | 文字列 | 確認した人（任意） |
| `targetVersion` | 文字列 | その情報が対象としている版 |
| `note` | 文字列 | 補足（任意）。**継承しない** |

プロファイル全体の `meta` は `source`・`confirmedAt`・`targetVersion` を必須とする。各項目の `meta` は、上書きしたいキーだけを書く（1つ以上）。

### 3-2. 継承

各項目の有効なメタデータは、**近い方が勝つ**規則で、キーごとに決める。

- プロファイル全体の `meta` → 画面・モード・欄・パラメータ・機能・アカウント要素・モデルの `meta` → （操作は、それを持つモードの `meta` の次。推奨長は、それを持つ欄の `meta` の次）の順に上書きする
- 書かれていないキーは、1つ外側の値を引き継ぐ
- `note` だけは引き継がない（その項目自身の補足だけを持つ）

### 3-3. 情報源の区分

| `source` | 意味 | 優先 |
|---|---|---|
| `screen` | 利用者が実画面で確認した | 高 |
| `official` | 公式の情報 | ↑ |
| `thirdPartyVersioned` | 第三者の情報で、対象の版が明記されている | ↑ |
| `thirdPartyUnversioned` | 第三者の情報で、対象の版が不明 | ↓ |
| `unverified` | 確認できていない（補完。DP-06 の下位に置く） | 低 |

依頼文がこの区分をどう使うか（断定するか、留保をつけるか）は、依頼文のブロックの議題で決める（DP-06）。

---

## 4. 画面・モード・操作

### 4-1. 画面（`screens`。判断ポイント1）

| キー | 内容 |
|---|---|
| `id`、`label` | 画面の id と表示名 |
| `supported` | 本ツールが依頼文の対象にするか |
| `reason` | `supported` が `false` のとき**必須**。対象外の理由 |

Suno は、アドバンスドだけが対象。シンプルは歌詞欄・除外欄がなく、依頼文のブロックが意味を持たない。サウンドは未調査（`source: unverified`）。対象外の画面も、理由つきで記録する。ツール側に画面が増えたときの判断材料になる。

### 4-2. モード（`modes`）

| キー | 内容 |
|---|---|
| `id`、`label` | モードの id と表示名 |
| `screen` | 属する画面の id。`supported` な画面であること |
| `generationType` | 段階との対応（`song-file.md` §2-2）。`new` または `derived` |
| `styleOnEnter` | このモードへ移行するときの、スタイルの扱いの選択肢（任意） |
| `operations` | 操作の配列。`derived` のとき**必須**、`new` のときは**持たない** |

`new` と `derived` は、1つずつ存在する。Suno は、`standard`（通常。`new`）と `remix`（リミックス。`derived`）。

`remix` の `styleOnEnter` は、`reflect-original`（元曲のスタイルを反映）と `keep-current`（現在の設定を保持）。派生生成の依頼文は、どちらを前提にするかを明示する必要がある。

### 4-3. 操作（`operations`。判断ポイント2）

**15種すべてを記録**し、依頼文の対象にするかを `scope` で表す。

| キー | 内容 |
|---|---|
| `id`、`label` | 操作の id（半角小文字とハイフン）と、Suno の UI での名前 |
| `dropdownSection` | UI のドロップダウンの区分。`remix` または `edit` |
| `plan` | 必要な最小プラン（§7-4） |
| `textInstruction` | テキスト指示を伴うか。`yes`／`no`／`unknown` |
| `scope` | 依頼文の対象か。`excluded`／`pending`／`candidate`／`first` |
| `lengthHandling` | 長さの扱い（R-15）。`fromSource`（元曲で決まり、依頼の対象外）／`meaningful`（長さが意味を持つ）／`unknown` |
| `note` | 任意。依頼文の「派生元の情報」（B-DF）に**そのまま出る**、利用者向けの短い説明。内部の参照（R-xx、L-xx、判断ポイント、「元の表では…」、実例の数値など）は書かず、`meta.note` に書く（判断ポイント9） |

`textInstruction` と `scope` は、次のように**対応する**（スキーマが検証する）。

| `textInstruction` | `scope` | 意味 | Suno の操作 |
|---|---|---|---|
| `no` | `excluded` | テキスト指示を伴わない。対象外（`scope.md` §19 の原則） | trim、delete-section、reverse、speed、fade-in、fade-out（6種） |
| `unknown` | `pending` | テキスト指示の有無が不明。保留 | mashup、add-stem（2種） |
| `yes` | `candidate` | 将来の候補 | cover、sample、inspiration、extend、edit-instruments、replace-section（6種） |
| `yes` | `first` | 派生生成の第一候補（L-01b）。**全体で高々1つ** | edit-vocals（1種） |

**`derivedFrom.operation` に取れる値**（`song-file.md` §3）は、`derived` モードの `operations` のうち `scope` が `candidate` または `first` のものの id（7種）、または `null`。`pending` は、テキスト指示の有無が確認されるまで値に含めない。値を後から足すのは加法的で、減らすのは破壊的な変更だからである。確認できたら、`textInstruction` を更新し、`scope` を `pending` から `candidate` に変える（`updatedAt` と `meta` も更新する）。

操作ごとに使える項目・パラメータは、実画面での確認が必要で、未整理（§13）。

---

## 5. 欄（`fields`）

| キー | 内容 |
|---|---|
| `id`、`label`、`kind` | 欄の id、表示名、種類（初版は `text` のみ） |
| `limit` | 文字数の上限（下記の3状態） |
| `recommended` | 推奨長の配列。言語ごと（R-10）。空でもよい |
| `modes` | この欄がある、モードの id の配列 |
| `languageNote` | 記述言語についての補足（任意） |

**`limit` の3状態**（R-10）:

| `status` | 持つもの | 意味 |
|---|---|---|
| `confirmed` | `value`、`unit`（`chars`） | 上限として確認済み |
| `lowerBound` | `value`、`unit` | この値まで入ることのみ確認済み。上限は不明 |
| `unknown` | なし | 不明。推奨長のみで運用する |

**`recommended` の要素**は、`language`（`ja`／`en`）、`kind`（`target`＝目安、`softUpper`＝超えると品質が落ちるとされる目安）、`value`、`unit`、`condition`（任意）、`meta`（任意）を持つ。

Suno の欄:

| `id` | 表示名 | `limit` | 備考 |
|---|---|---|---|
| `lyrics` | 歌詞 | 確認済み 5000 | 空ならインスト（§7-1）。推奨長は第三者情報（v4.5〜v5、v5.5）で、v6 では未検証 |
| `lyrics-prompt` | 作詞AIへの指示 | 不明 | 歌詞欄内の入力行。推奨長のみで運用する |
| `style` | スタイル | 確認済み 1000 | リミックス時は元曲のスタイルが最初から入る。`defaultDescriptionField` |
| `exclude-style` | スタイルを除外 | 確認済み 1000 | 否定指定の専用欄 |
| `title` | 曲名 | 確認済み 80 | 空なら自動設定。推奨長は未確認 |

---

## 6. パラメータ（`params`）

| キー | 内容 |
|---|---|
| `id`、`label` | パラメータの id と表示名 |
| `kind` | `select`（選択）、`slider`、`toggle`、`duration`（長さ） |
| `requestRole` | R-12 の分類（下記） |
| `modes` | このパラメータがある、モードの id の配列 |
| `default` | **ツールの既定値**（判断ポイント3の注。本ツールの既定値とは別） |
| `values` | `select` のとき**必須**。`{ id, label, rewritesStyle }` の配列（`rewritesStyle` は任意） |
| `range` | `slider` と `duration` のとき**必須**。`min`、`max`、`step`、`sliderStep`、`unit` |
| `hasAuto` | `duration` のとき**必須**。自動（お任せ）があるか |
| `inputFormats` | `duration` の入力形式（`seconds`、`m:ss`） |

**`requestRole`**（R-12）:

| 値 | 意味 | Suno のパラメータ |
|---|---|---|
| `input` | 依頼文への入力として使う | `vocal-gender`、`length`、`variation` |
| `recommend` | 推奨値を出させる候補（入力項目 `recommendParams` の対象。§9） | `max-mode`、`weirdness`、`style-influence`、`audio-influence` |
| `none` | 依頼文の対象外 | （なし。パーソナライズは、パラメータではなくアカウント要素として持つ。§7-2） |

**`rewritesStyle`**（RP-06）: この値のとき、Suno がスタイル欄を書き換えるか。`variation` は、`off` だけが `false`、`standard`／`high`／`ultra`／`max` は `true`。書き換えの程度の差は未確認で、`note` にとどめる。

Suno の `variation` の `default` は `standard`（Suno の既定値）。R-17 の推奨（詳細＋バリエーションオフ）は本ツール側の判断で、プロファイルには持たない。

---

## 7. 機能・アカウント要素・モデル

### 7-1. 機能（`features`）

キーが機能の id。値は `{ supported, field?, method?, note?, meta? }`。

| 機能の id | 内容 |
|---|---|
| `exclusion-field` | 除外欄の有無。`field` に、その欄の id（Suno は `exclude-style`）。**否定指定（`exclusions` と、選択肢の「使わない」）の書き先はこの欄** |
| `instrumental` | インスト指定の方法。Suno は `method: empty-lyrics`（歌詞欄を空にする）、`field: lyrics` |
| `meta-tags` | 構成タグ（`[Verse]` など）。`field` は `lyrics`。インストで構成タグだけを入れたときの効果は未検証（R-04） |

### 7-2. アカウント要素（`accountFeatures`）

`requestHandling` が、依頼文での扱い。`useOrNot` は「使う／使わない」だけを前提として書く。`excluded` は依頼文の対象外（R-12）。

| `id` | `requestHandling` | 備考 |
|---|---|---|
| `lyricist` | `useOrNot` | 画面で存在を確認。機能は推測 |
| `voice` | `useOrNot` | 画面で存在を確認。機能は第三者情報 |
| `custom-model` | `useOrNot` | 未確認（`source: unverified`） |
| `personalize` | `excluded` | チャットAI に判断材料がないため（R-12） |

### 7-3. モデル（`models`）

`{ id, label, plan, note?, meta? }`。Suno は `v6`、`v6-wild`、`v6-mini`。`version.id`（`v6`）が指すのは**対象とする世代**で、モデルはその中の選択肢。実画面で確認したのは `v6` のみ。モデルは入力項目にしない（判断ポイント6）。

### 7-4. 必要プラン（`plan`）

操作とモデルが持つ。**必要な最小プラン**を表す。`none`（制限なし）、`pro`、`premier`、`null`（不明）。`suno-profile.md` の表の「—」は、`none` と読まず `null` にする（判断ポイント4。教訓: 見つからなかったものを「ない」と決めない）。

---

## 8. 入力項目との対応（`bindings`。判断ポイント3）

入力項目（`fields.json` の `fields` と `output`）を、ツールの欄・パラメータに対応づける。**ここに載せない入力項目は、記述の内容として、`defaultDescriptionField`（Suno は `style`）の本文に書かれる**（否定指定は §7-1 の除外欄）。つまり `bindings` には、UI 設定に回すもの、専用の欄があるもの、対応先が未決のものだけを載せる。

| キー | 内容 |
|---|---|
| `item` | `{ kind, id }`。`kind` は `axis`（`fields.json` の `fields`）または `output` |
| `target` | `{ kind, id }`（`kind` は `field` または `param`）、または `null`（未決） |
| `route` | 指定経路（`text`／`uiSetting`／`both`） |
| `status` | `target` が `null` のとき**必須**（`pending`）。そうでないときは持たない |

`target` の種類と `route` の組（`check_fields.py` が検証）: `param` は `uiSetting` または `both`、`field` は `text` または `both`。`item` の重複は不可。

Suno の `bindings`:

| 入力項目 | 対応先 | `route` | 備考 |
|---|---|---|---|
| `length`（axis） | パラメータ `length` | `uiSetting` | 確定条件として扱い、本文には書かない（R-15） |
| `variation`（output） | パラメータ `variation` | `uiSetting` | |
| `titleSuggestions`（output） | 欄 `title` | `text` | 空欄なら Suno が自動設定する（R-14） |
| `structure`（axis） | 未決（`pending`） | `text` | 構成タグの効果が未検証（R-04）。決着までは対応先を決めない |
| `lyricsStructure`（axis） | 欄 `lyrics` | `text` | 歌あり時の構成タグ。各語の `term.en` を歌詞欄に入れる（`scope.md` §4。L-01。2026-10-16 追加） |

**`fields.json` の `specificity` との関係**: `length` は `fields.json` でも `specificity: uiSetting` を持つ。これは、ツールを問わない項目の性質。`bindings` の `route` は、そのツールでの実際の経路。両者が食い違わないことを検証する（§10-2 の P7）。

---

## 9. 他の仕様との接続

| 接続点 | 規則 | 反映先 |
|---|---|---|
| `toolId`（`song-file.md` §7、§9-2 の F7） | 既知の `toolId` は、`tool-profiles/` にあるプロファイルの `toolId` の集合。集合にない値は拒否する | `song-file.md` §9-2 の F7（反映済み） |
| `toolVersion`（`song-file.md` §7、§11 の #10） | 対応する `toolId` のプロファイルの `version.id` と**等価比較**する。差があれば**警告**（読み込みは止めず、値も書き換えない）。現在の固定値 `v6` は、`suno.json` の `version.id` に置き換わる | F7、`song-file.md` §11 の #10（反映済み） |
| `derivedFrom.operation`（`song-file.md` §3） | `null`、または、`derived` モードの `operations` のうち `scope` が `candidate`／`first` の id（§4-3）。「自由な id 文字列」の暫定を解除する。例の `add-vocal`（`song-file.md` §3 とテストにあった仮の値。`song.example.json` にはない）は `edit-vocals` に変えた。検証は F9 | `song-file.md` §3、`song.schema.json`（説明文）、F9（反映済み） |
| 出力項目 `variation`（`input-items.md` §8 の #8、`fields.json`） | 選択肢と既定値は、プロファイルのパラメータ `variation` の `values`・`default` を正とする。`fields.json` は `optionsFrom: { param }` で参照する（`options` は持たない。`default` は本ツールの既定値として `fields.json` に残る） | `fields.json`、`fields.schema.json`（反映済み） |
| 項目 `length`（`fields.json`） | 範囲は、パラメータ `length` の `range` を正とする。`fields.json` の `rangeFrom: { param }` で参照し、S4 が、その依頼の `toolId` のプロファイルの範囲で判定する | 同上（反映済み） |
| 出力項目 `recommendParams`（`fields.json`） | 項目の一覧は、`requestRole` が `recommend` のパラメータ。`fields.json` の `itemsFrom: { requestRole }` で参照する。**保存する値は `{ パラメータ id: 真偽 }`**（省略した項目はオフ。`input-items.md` 判断ポイント18）。項目の一覧は、依頼のモードにあるパラメータ（`params[].modes`）に絞る。プロファイルにないキーは O3（エラー）、モードにないキーは O4（警告） | 同上（反映済み） |

`fields.json` の参照は、`optionsFrom`（選択肢）、`rangeFrom`（範囲）、`itemsFrom`（項目の一覧）の3種類。`fields.schema.json` が、`select`／`multiSelect` は `options` か `optionsFrom` のどちらか一方、`length` は `rangeFrom`、`perItemBoolean` は `itemsFrom` を持つことを検証する。

---

## 10. 検証

### 10-1. JSON Schema（構造）

`tool-profile.schema.json`。キーの有無・型・列挙値・日付や id の形式のほか、次の条件付きの規則を含む。

- `screens[].supported` が `false` なら `reason` が必須
- `modes[].generationType` が `derived` なら `operations` が必須、`new` なら持たない
- `operations[]` の `scope` と `textInstruction` の対応（§4-3）
- `params[].kind` ごとの必須キーと `default` の型（§6）
- `bindings[]` の `target` が `null` なら `status: pending` が必須、`pending` なら `target` は `null`
- `limit` の3状態（`confirmed`／`lowerBound` は `value` が必須、`unknown` は持たない）

### 10-2. `check_fields.py`（意味。実装済み）

| # | 検証 |
|---|---|
| P1 | `id` の一意性（画面、モード、欄、パラメータ、操作（モードをまたいで）、機能、アカウント要素、モデル、`values`） |
| P2 | `modes[].screen` が `screens` にあり、`supported` である |
| P3 | `generationType` が `new` と `derived` で1つずつ |
| P4 | 欄・パラメータの `modes` が、`modes` の id である |
| P5 | `default` の整合（`select` は `values` の id、`slider` は `range` の内側、`duration` は `hasAuto` なら `auto`、または `range` の内側の整数） |
| P6 | `defaultDescriptionField` と `features[].field` が `fields` の id である |
| P7 | `bindings`: `target` の id が存在する。`item` の id が `fields.json` に存在する。`item` の重複がない。`target` の種類と `route` の組（§8）。`fields.json` の `specificity` が `uiSetting` の項目に対応があれば、`route` は `uiSetting` |
| P8 | `scope` が `first` の操作は高々1つ |
| P9 | `version.id` と `meta.targetVersion` が一致する。`updatedAt` が `meta.confirmedAt` 以降 |
| P10 | ファイル名（拡張子を除く）と `toolId` が一致する |
| P11 | `fields.json` との整合（§9。`variation` の選択肢と既定値、`length` の範囲、`recommendParams` の一覧）。実装済み（`optionsFrom`／`rangeFrom`／`itemsFrom`。参照先と、`bindings` の対応先が一致することも検証する） |

負例（違反を仕込んだ入力）のテスト（`test_check_fields.py`）は、`--spec` で仕様書の写しに違反を仕込む。P0〜P11、F7、F9、長さの S4 の 45 か所の出力を1つずつ消して、テストが失敗することを確かめた（検出漏れ 0）。スキーマ単体でも、20種の負例をすべて検出することを確認済み。

---

## 11. 判断ポイント

| # | 論点 | 決定 | 承認 |
|---|---|---|---|
| 1 | 「モード」の意味の衝突（Suno の3画面と、通常／リミックス） | **A1**: 画面（`screen`）とモード（`mode`）を分けて両方持つ。R-10 の「モード」は通常／リミックスのまま。対象外の画面も理由つきで記録する（§4-1） | 選択 |
| 2 | `operation` に取れる値の範囲 | **C1**: 15種すべてを記録し、`scope` と `textInstruction` を持つ。値に取れるのは、テキスト指示ありの7種（§4-3） | 選択 |
| 3 | 入力項目と欄・パラメータの対応の持ち先 | **D1**: プロファイルに `bindings` を持つ。`fields.json` に持たせる案（D2）、依頼文のブロック化の議題で決める案（D3）は採らない。理由: 項目の定義をツール依存にせず、対応を生成ロジックに埋め込まない（DP-03）。注: `default` は**ツールの既定値**で、入力項目の既定値（本ツールの既定値）とは別に持つ | 選択 |
| 4 | プランの「—」（食い違い B） | `null`（不明）とし、`none` と読まない（§7-4） | 既定案 |
| 5 | メタデータの粒度（食い違い E） | プロファイル単位の既定に、項目ごとの上書きを許す。近い方が勝つ（§3-2） | 既定案 |
| 6 | `toolVersion` とモデルの関係（食い違い F） | 比較先は `version.id`。モデルは `models` に記録し、入力項目にはしない（§7-3） | 既定案 |
| 7 | ボーカル性別（食い違い G） | プロファイルには持つ。~~入力項目は歌あり対応（L-01）のときに足す~~ → **訂正（2026-10-16）**: L-01 が決着し、入力項目は持たない（歌い手の性別は Suno 側の設定で決める。`input-items.md` 判断ポイント24【訂正後】） | 既定案 |
| 8 | データの持ち方 | 手書きの JSON とスキーマ。既知の `toolId` はディレクトリ内のファイルから導く。`schemaVersion` は持たない（§2） | 既定案 |
| 9 | 操作の `note` の役割（2026-09-24。`examples/rendered-04-derived-extend-keep.md` の作成中に、5操作の `note` に内部参照が混ざり、依頼文にそのまま出ることが判明。同 §5 Q-01） | **B**: `note` は依頼文に出す利用者向けの説明に限り、内部の参照は `meta.note` に移す。データだけの修正で、スキーマと `check_fields.py` は変えない。直した5操作は `mashup`・`extend`・`edit-vocals`・`replace-section`・`add-stem`。内部参照の検出を検査（P 系の規則）にするかは未着手 | 選択 |

---

## 12. 補完・仮定一覧

| # | 内容 | 根拠 |
|---|---|---|
| 1 | プロファイル内の id は kebab-case。入力項目側の id は camelCase のまま参照する | V-08 にそろえた |
| 2 | `plan` は `none`／`pro`／`premier`／`null`。3状態の `status` は持たず、`null` を不明とする。確からしさは `meta` に持つ | 判断ポイント4の趣旨を、単純な形で満たす |
| 3 | `defaultDescriptionField` を追加し、`bindings` に載せない項目は、その欄の本文に書くとした | D1 のままでは、全入力項目を並べる必要があるため |
| 4 | `bindings` は5件（`length`、`variation`、`titleSuggestions`、`structure`、`lyricsStructure`）。`structure` は対応先未決。`lyricsStructure` は歌詞欄 `lyrics` に対応（2026-10-16 追加） | 構成タグの効果が未検証（R-04） |
| 5 | 情報源に `unverified` を追加 | DP-06 の4段階に「不明」がないため |
| 6 | 操作の id は kebab-case。`song-file.md` §3 の例とテストにあった仮の値 `add-vocal` は `edit-vocals` に変えた | Suno の操作名が「ボーカルを編集」（追加または置き換え） |
| 7 | 歌詞の推奨長（日本語 200、英語 3,000）を、第三者情報として持つ | R-10（推奨長は言語ごと）。v6 では未検証と明記した |
| 8 | 追加した用語 `screen`、`dropdownSection`、`styleOnEnter`、`rewritesStyle`、`requestRole`、`lengthHandling` | 決定した内容を、データとして表すため |

---

## 13. 暗黙の前提と残る論点

- **操作ごとに使える項目・パラメータ**は未整理。`lengthHandling` が `unknown` の操作が多い。実画面での確認が必要（R-10「操作ごとに使える項目が異なる」）
- **プランが `null` の操作・モデル**は、実画面での確認が必要（任意の作業）
- **`limit.status: lowerBound` の扱い**（依頼文がその値を、目標の上限に使ってよいか）は、依頼文のブロックの議題で決める。現時点で `suno.json` に該当する欄はない
- **`fields.json` の `variation` の既定値**（`standard`）は、いまは Suno の既定値と同じ。R-17 の推奨（オフ）との関係は、入力項目の既定値の議題で扱う
- **複数ツールを足すとき**は、`bindings` のほか、`fields.json` の `specificity` との整合（P7）が、プロファイルごとに検証される。ツール固有の欄がない項目は、`defaultDescriptionField` の規則で扱う
- **ボーカル性別の入力項目**: **2026-10-16 訂正** — ~~歌あり対応（L-01）のときに足す（判断ポイント7）~~ → L-01 が決着し、入力項目は持たないことに決まった（`input-items.md` 判断ポイント24【訂正後】）
- **`structure` の対応先**は、R-04 の検証結果で決める（インストの歌詞欄に構成タグだけを入れる効果）。歌あり側の構成タグは、専用の入力項目 `lyricsStructure`（語彙 `section-vocal`）を歌詞欄 `lyrics` に対応させた（L-01。2026-10-16）
- **`recommendParams` の保存値の形**は解決した（`input-items.md` 判断ポイント18。`{ パラメータ id: 真偽 }`）。チェッカーは O2・O3・O4 で検証する
- **`fields.json` の `default`**（本ツールの既定値）と、プロファイルの `default`（ツールの既定値）は別。いまは `variation` で一致しているが、一致を検証していない（一致を強いると、R-17 の推奨（オフ）を本ツールの既定値にできなくなる）
