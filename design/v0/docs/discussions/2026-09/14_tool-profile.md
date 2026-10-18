# ツールプロファイル（R-10）のデータ仕様

- 日付: 2026-09-21
- 思考モード: 厳密構成モード（スレッド全体）
- 結果の記録先: `../../specifications/tool-profile.md`（判断ポイント1〜8。独立した番号）、`tool-profile.schema.json`、`tool-profiles/suno.json`、`../../specifications/song-file.md`（§3・§7・§9-2・§10〜§12）、`input-items.md`、`fields.json`、`fields.schema.json`、`song.schema.json`、`../../decisions/scope.md` R-10、`../../../tools/check-fields/`

---

## 1. 経緯

引き継ぎ第4版 §3 が、次の議題としてツールプロファイル（R-10）を提案していた（未承認）。冒頭で確認し、利用者が「提案どおり」を選んだ。資料を読み、待ち先を3件追加した（既知の `toolId`、`length` の範囲、`recommendParams` の項目一覧）。教訓 4-12 に従い、書き込む前に、資料と突き合わせて食い違いと空白（A〜G）を示した。

利用者が承認した範囲は次のとおり。

1. 要判断の3点（A: 「モード」の衝突、C: `operation` に取れる値の範囲、D: 入力項目と欄・パラメータの対応の持ち先）を、推奨案（A1・C1・D1）で選択
2. 既定案（B: プランの「—」、E: メタデータの粒度、F: `toolVersion` とモデル、G: ボーカル性別、データの持ち方）は、反対がなかったため採用。仕様書の「承認」欄には「既定案」と記録した

## 2. 読み直して分かったこと

| 点 | 内容 | 対応 |
|---|---|---|
| A | 「モード」が2つの意味で使われている。`suno-profile.md` §1 はシンプル／アドバンスド／サウンド、R-10 は通常／リミックス | 判断ポイント1（画面 `screen` とモード `mode` を分ける） |
| B | プラン列の「—」が、「制限なし」か「未確認」か区別できない | 判断ポイント4（`null` ＝不明） |
| C | テキスト指示の有無が「不明」の操作が2つ（Mashup、stem を追加）。`scope.md` §19 だけでは対象かを判断できない | 判断ポイント2（保留 `pending`。値には含めない） |
| D | 入力項目とツールの欄・パラメータの対応の持ち先がない。R-13 は経路を「入力項目の議論で決める」としたが、`fields.json` に経路の属性がない | 判断ポイント3（プロファイルの `bindings`） |
| E | メタデータの粒度。`suno-profile.md` は行ごとに状態・確認日が違う | 判断ポイント5（全体の既定＋項目ごとの上書き） |
| F | `toolVersion: v6` と、モデル選択（v6／v6-wild／v6-mini）の関係。実画面で確認したのは v6 のみ | 判断ポイント6 |
| G | ボーカル性別は R-12 が「入力として使う」と分類したが、対応する入力項目がない | 判断ポイント7（歌あり対応のときに足す） |
| H | `fields.json` の `length` は `specificity: uiSetting` を持ち、プロファイルの `bindings` の `route` と二重になる | 食い違わないことを検証する（P7）。複数ツールを足すときに再確認 |
| I | 仕様書が「`song.example.json` の `add-vocal`」と書いたのは誤り。実際は `song-file.md` §3 の例とテストにあった | 訂正した（§4） |
| J | `recommendParams` は `perItemBoolean`（項目ごとの真偽）だが、チェッカーは真偽値1つだけを受け付ける | **未決**として記録（入力項目の議題） |
| K | `fields.json` の `default`（本ツールの既定値）と、プロファイルの `default`（ツールの既定値）は別のもの。R-17 の推奨（オフ）と Suno の既定（標準）が違う | 別に持つ。一致は検証しない |

## 3. 検討した案と採否

| 論点 | 採用 | 検討した代替案 |
|---|---|---|
| モードの衝突 | A1: 画面と、モードを分けて持つ | A2: 画面は持たず注記のみ |
| 操作の範囲 | C1: 15種すべてを記録。値に取れるのはテキスト指示ありの7種 | C2: 7種だけ記録。C3: 第一候補だけ記録 |
| 対応の持ち先 | D1: プロファイルに `bindings`。載せない項目は `defaultDescriptionField` の本文（補完） | D2: `fields.json` に持たせる（項目の定義がツール依存になる）。D3: ブロック化の議題で決める（対応が生成ロジックに埋まる） |
| プランの表し方 | `none／pro／premier／null`。確からしさは `meta` に持つ（補完） | `status` を別に持つ3状態。表現が重くなる |
| `schemaVersion` | 持たない（同梱データで、古い形を読み込む場面がない） | 持つ（ファクトリープロファイルと同じ形） |
| `fields.json` の参照 | `optionsFrom`（選択肢）、`rangeFrom`（範囲）、`itemsFrom`（項目の一覧）の3種類 | `options` を残してプロファイルと重複させる（二重管理） |

## 4. 訂正の記録

| 元の記録 | 訂正 |
|---|---|
| 会話中の私の発言と、`tool-profile.md` の初版（§9、§12 の #6）: 「`song.example.json` の仮の値 `add-vocal`」 | `song.example.json` に `add-vocal` はなく、`song-file.md` §3 の例とテストにあった。§9・§12 を直した |
| 私の実装の初版: `check_profiles_container` の引数 `profiles` が、既存の変数（利用者のプロファイルの配列）を上書きしていた | エクスポートファイルの例の検証で発見し、引数を `tool_profiles` に改めてから、書き込んだ |
| 私の報告: 「検査を壊す確認で、45 か所中 15 か所が見逃し」 | 壊し方が「エラーを注に降格」で、メッセージ本文は残り、同じケースに別のエラーも出ていたための見かけの見逃しが大半だった。出力そのものを消す壊し方に改めて、実質の見逃しは2件（P0「構造が不正」の分岐、P5 の toggle の既定値）だった。この2件のテストを足し、見逃しは 0 になった |

## 5. 実施したこと

- `specifications/tool-profile.md`（データ仕様、13節）、`tool-profile.schema.json`、`tool-profiles/suno.json`（画面3、モード2、操作15、欄5、パラメータ7、機能3、アカウント要素4、モデル3、`bindings` 4件）を作成
- `tools/check-fields/check_fields.py` を拡張: ツールプロファイルの検証 P0〜P11、F7（既知の `toolId`、`toolVersion` の比較先をプロファイルから取る）、F9（`derivedFrom.operation`）、長さの範囲（S4）と `variation` の選択肢（O2）をプロファイルから取る、`--spec DIR`
- `test_check_fields.py` を 46 → 125 ケースに拡張（`--spec` で仕様書の写しに違反を仕込む）
- `fields.json`（`rangeFrom`、`optionsFrom`、`itemsFrom`）、`fields.schema.json`、`song.schema.json`（説明文）を更新
- `song-file.md`、`input-items.md`、`tools/check-fields/README.md`、`scope.md` R-10、`decisions/README.md`、引き継ぎ第5版を更新
- **検証**:
  - スキーマ: 20種の負例をすべて検出（私の環境）
  - テスト: 私の環境（`jsonschema` 4.26）で 125 ケースすべて通る。あなたの環境（`jsonschema` なし）では、102 ケースを実行してすべて通り、23 ケース（F1 が6、P0 が13、D1 が4）をスキップ
  - 検査を壊す確認: P0〜P11、F7、F9、長さの S4 の 45 か所の出力を1つずつ消して、テストが失敗することを確認（見逃し 0）
  - あなたの環境の `check_fields.py`（変更後）は、エラー 0・警告 0
  - `check_fields.py`、テスト、`fields.json`、`fields.schema.json`、`song.schema.json` の5ファイルは、書き込み後に取り込んで、私の環境の検証済みの版とバイト単位で一致することを確認した
- **運用上の逸脱**: 編集ツールへの日本語を、`\uXXXX` のエスケープで渡す誤りを繰り返した（教訓 4-4 が禁じている方法）。上の5ファイルは、バイト単位の照合で異常がなかった。文書（`song-file.md` など）は、編集ツールが返した差分の目視で確認した

## 6. 残る作業

- 依頼文のブロック化と、決定の反映（引き継ぎ §6 の宿題3）。ツールプロファイル（欄の定義）ができたので着手できる
- `recommendParams` の保存値の形（真偽1つか、項目ごとのオブジェクトか）。入力項目の議題
- 操作ごとに使える項目・パラメータ、プランが `null` の操作・モデルの実画面での確認（任意）
- `limit.status: lowerBound` の扱い、情報源（`source`）の依頼文での使い方は、依頼文のブロックの議題で決める
- 利用者の環境で `pip install jsonschema` のあと、スキップされた 23 ケースの実行（任意）
- UI の仕様、ファクトリープロファイルの中身、L-01（作詞）、`vocalMode` と `voiceTreatment` の整合、将来の追加候補（従来どおり）
