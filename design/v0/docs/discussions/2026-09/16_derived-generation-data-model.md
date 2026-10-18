# 議論ログ16: 派生生成のデータモデル再検討

- 開始: 2026-09-23（引き継ぎ第6版のスレッド）
- 状態: 進行中（データモデルの判断は完了。仕様書への反映が完了。ブロック文面（B-01d・新節7）は未着手）
- 思考モード: 厳密構成モード（スレッド全体）
- 前の議題: `15_request-blocks.md`。今回の議題案は「派生生成ブロック（B-01d・B-03d）の作成」（`handoff-next-thread.md` §3 候補1）

---

## 1. 経緯

候補1（派生生成ブロックの作成）に着手する前提として、`derivedFrom`（`song-file.md` §3。判断ポイント12）が読むデータを確認したところ、次の欠落・疑問が見つかった。

1. `derivedFrom.requestId` は「同じ楽曲データ内の別の依頼」しか指せず、本ツール導入前に作った曲を元曲にできない
2. `styleOnEnter`（元曲のスタイルを反映／現在の設定を保持）の前提となる、元曲の実際のスタイルテキストを保存する場所がない
3. `styleOnEnter` は Suno 側の UI 初期化動作であり、本ツールが常に完成形のテキストを貼り付ける運用（B-02）である以上、依頼文の内容そのものには直結しない
4. 元のスタイルをどれだけ保つかは、「編集の方法」と「近さの程度」という独立した2つの性質を持っており、単一項目では表せない
5. `lengthHandling` は無意味ではないが、元の長さの実値（`originalLength`）を持つかどうかは別の論点として残る

このため、候補1の作業順序を「先にデータモデルを再設計し、仕様に反映してから、ブロック文面に進む」に変更した（利用者の承認）。

## 2. 承認された判断

| 記号 | 論点 | 決定 |
|---|---|---|
| A1 | 元曲がこのツール外の曲である場合の対応 | `derivedFrom` に `source`（`internal`／`external`）を持たせる。`internal` は `requestId` 必須（現行どおり）。`external` は `requestId` を持たず、元曲識別用の自由記述（名前・メモ）を持つ |
| B1 | 元曲の実際のスタイルテキストの保存 | `derivedFrom` に `sourceStyleText`（自由記述、任意）を追加。`internal`／`external` どちらでも使える（`internal` でも、保存済み `axes` は依頼当時の指定であり、実際の生成結果と一致する保証がないため） |
| E1 | `styleOnEnter`（Suno のUI初期化動作）の扱い | 依頼文の対象から外す。`bindings` は `item.kind` が `axis`／`output` のみのスキーマで `styleOnEnter`（モードの属性）は対象外のため、代わりに `tool-profiles/suno.json` の `remix` モードの `note` に扱いを記述する（当初 `bindings` への追加を予定していたが、`tool-profile.schema.json` の enum 制約に違反するため修正） |
| H | 元のスタイルをどれだけ保つか | 単一項目 `sourceStyleKeepLevel`（5値。`Unspecified`／`Keep`／`PartChange`／`Near`／`Far`）を廃止し、2項目に分割する。<br>・`sourceStyleEditMethod`（状態①②。値: `keep`＝元のスタイルは完全保持し要素の追加のみ ／ `change`＝元のスタイルを変更する）<br>・`sourceStyleCloseness`（状態①②。値: `near`／`far`。`sourceStyleEditMethod = change` のときのみ有効。`active-when` 規則で無効化）<br>「未指定」は語彙の値でなく、項目の `state = delegated`（②お任せ）で表す（`input-items.md` §1 の既存の状態モデルに合わせる）。当初案の `PartChange` は「`change` ＋ `sourceStyleCloseness` が②お任せ」と同義になるため、独立した値としては採らない |
| G1 | 元の長さ情報 | `derivedFrom` に `originalLength`（任意。`null` または秒数）を追加。`source: internal` のときは参照先の `axes.length` を入力時の初期値の候補として提示するが、**自動流用はしない**（利用者が確認・修正できる形にする。生成後の編集やバリエーション設定により、保存値と実際の曲の長さが一致する保証がないため） |

### 2-1. 表示条件のまとめ（`sourceStyleText` との連動）

- `sourceStyleText` が空のときは、`sourceStyleEditMethod`・`sourceStyleCloseness` を項目ごと非表示にする（保持・変更の対象となる実テキストがないため）
- `sourceStyleCloseness` は、`sourceStyleEditMethod = change` のときのみ有効（`keep` のときは無効化）

## 3. 保留・未確認のまま残した論点

- `extend` 操作での `length` パラメータの意味（延長後の合計の長さか、追加する秒数か）は、実画面での確認が必要な未確定事項として、今回は決めない。`tool-profile.md` §13（未整理）に記載済みの範囲のまま。派生生成ブロックの文面では、`extend` のときに具体的な数値を前提にした記述をチャットAI にさせず、「利用者が UI 側で別途設定する」旨だけを伝える保守的な書き方にする（D1。§10 参照）
- `derivedFrom.source = "external"` のときの、元曲識別用の自由記述の項目名・文字数上限は未定（次段階で決める）

## 4. 仕様書への反映（作業記録）

| ファイル | 変更内容 |
|---|---|
| `decisions/ui-and-nonfunctional.md` §7 | 判断ポイント12 に改訂の注記を追加。判断ポイント23〜27（A1・B1・E1・H・G1）を追加 |
| `specifications/song-file.md` §3 | `derivedFrom` の形を、`source`・`requestId`・`operation`・`sourceStyleText`・`sourceStyleEditMethod`・`sourceStyleCloseness`・`originalLength` を持つ形に改訂 |
| `specifications/song-file.md` §10 | 判断ポイント12 の記述を更新。判断ポイント23〜27 の行を追加 |
| `specifications/tool-profiles/suno.json` `remix` モード `note` | `styleOnEnter` の扱い（E1）を追記。当初 `bindings` への追加を試みたが、`tool-profile.schema.json` の `binding.item.kind` は `axis`／`output` のみで `mode` を取れず、`target: null` には `status: "pending"` が必須という制約に違反したため、note への記述に変更した |

**未着手（次段階以降）**:
- `song.schema.json`（`derivedFrom` の構造検証）
- `fields.schema.json` は対象外（`derivedFrom` は `song-file.md` の管轄。`fields.json` の項目ではない）
- `check_fields.py` の F 系検証（`derivedFrom` の新キーの検証。F3・F9 相当の拡張）
- `docs/decisions/README.md` の「未決の判断ポイント」節、および本議論ログの `decisions/README.md` への登録

### 4-2. schema/checker への実装反映（2026-09-24。引き継ぎ第7版の候補3）

上の「未着手（次段階以降）」のうち、`song.schema.json` の `derivedFrom` の構造検証と、`check_fields.py` の F 系検証の拡張は**完了**した。`decisions/README.md` の登録は別扱い（下の残り）。

| ファイル | 変更内容 |
|---|---|
| `specifications/song.schema.json` | `derivedFrom` を `type: ["object", "null"]` の定義にし、`source`（必須。`internal`／`external`）、`requestId`、`externalSourceLabel`、`operation`（必須）、`sourceStyleText`、`sourceStyleEditMethod`（`keep`／`change`）、`sourceStyleCloseness`（`near`／`far`）、`originalLength`（1以上の整数または `null`）を持つ形にした。元のスタイルの2項目は、状態を①指定・②お任せだけに限り、`additionalProperties: false`。要素側の `oneOf: [null, derivedFrom]` をやめた（違反したキーの場所が、F1 の指摘に出なかったため） |
| `tools/check-fields/check_fields.py` | F3 を `source` で分岐（`external` は参照先を要求せず、循環にもたどらない）。F10（`source` と `requestId`・`externalSourceLabel` の整合）、F11（元のスタイルの3項目の整合）を新設 |
| `tools/check-fields/test_check_fields.py` | 既存9箇所の `derivedFrom` に `source` を補い、新規49ケースを追加（143 → 192ケース）。エラー系は件数の期待値つき（エラーを警告に降格する変異も検出するため） |
| `specifications/song-file.md` | §3（`originalLength` の型、F11 の解釈）、§9-2（F3・F10・F11、テスト件数）、§11（補完13〜16）を更新 |
| `specifications/tool-profiles/suno.json` | `bindings[4]`（`item.kind: mode`、`styleOnEnter`）を削除（下の訂正） |

**訂正（元の記録も残す）**: §2 の E1 と §4 の表は、「`bindings` への追加は `tool-profile.schema.json` の enum に違反するため、`note` への記述に変更した」と記録している。しかし実物の `suno.json` には、`note` の追記に加えて、`bindings[4]` が削除されずに残っていた。`jsonschema` を入れた環境で既存テストを走らせると、143件中20件が失敗した（`bindings/4/item/kind: 'mode' is not one of ['axis', 'output']` など）。利用者の環境には `jsonschema` がないため、表面化していなかった。2026-09-24 に `bindings[4]` を削除し、E1 の記録どおりの状態にした。削除後は、143件が全通過した。

**補完・仮定**（`song-file.md` §11 の 13〜16 にも記録）:

- `sourceStyleCloseness` が①指定のとき、F11 が矛盾（エラー）とするのは、`sourceStyleEditMethod` が①指定の `keep` の場合だけ。②お任せ・省略は矛盾としない（省略時の初期状態が未確定のため。`song-file.md` §3-2）
- `sourceStyleText` が空のときの無効は、警告（①指定の2項目のときだけ。②お任せは警告しない）
- `externalSourceLabel` に文字数上限を設けない。`originalLength` は1以上の整数または `null`
- 固定の取れる値（`source`・`value`・`state`）はスキーマだけ、項目どうしの整合（F3・F10・F11）はチェッカーだけで検証する。`source` がない・未知の値のときは、チェッカーは F3 を実行し（`internal` 扱い）、スキーマの F1 も指摘する

**検証**: `jsonschema` ありで192ケース中192件、`jsonschema` なし（遮断して模擬）で147件を実行して147件通過、45件をスキップ。変異テストは31種（チェッカー18、スキーマ13。出力を消す変異と、エラーを警告に降格する変異を含む）で、すべて検出した。1種（M12。EditMethod が②お任せのときも矛盾扱いにする）は最初生き残ったため、「②お任せに `keep` が残っている」ケースを足して検出できるようにした。

**残り**: `docs/decisions/README.md` の「未決の判断ポイント」節と、本議論ログの登録（`docs/README.md`）は、別途確認する。

## 5. 次: 候補1本来の議題（未着手）

- B-01d の代わりに新設する節「7. 派生元の情報」の出力条件（`request-blocks.md` への追加）
- 同節の文面（`request-text.md` への追加）
- レンダリング例 `-v4` での検証（利用者作業）
