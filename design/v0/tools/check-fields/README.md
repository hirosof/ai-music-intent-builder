# check-fields

入力項目の定義（`docs/specifications/fields.json`）と、語彙（`docs/specifications/presets/`）・ツールプロファイル（`docs/specifications/tool-profiles/`）の整合を確認する。
保存データ（楽曲データ・エクスポートファイル・プロファイルのストア）の検証と、項目一覧の表の生成もできる。仕様は `docs/specifications/input-items.md`（項目）と `docs/specifications/song-file.md`（保存データ）。

## 使い方

リポジトリのどこからでも実行できる。Python 3.8 以降、標準ライブラリだけで動く。

```
python tools/check-fields/check_fields.py                       # 項目定義を検証する
python tools/check-fields/check_fields.py --song FILE.json      # 加えて、保存データ（楽曲データ／エクスポートファイル／ストア。形は自動判別）を検証する
python tools/check-fields/check_fields.py --markdown            # 項目一覧の Markdown の表を出力する
python tools/check-fields/check_fields.py --strict              # 警告もエラーとして扱う
python tools/check-fields/check_fields.py --spec DIR            # docs/specifications の代わりに DIR を使う（負例のテスト用）
python tools/check-fields/test_check_fields.py                  # 保存データの検証の負例テストを実行する
```

`jsonschema`（`pip install jsonschema`）が入っていれば、`docs/specifications/fields.schema.json`（項目定義）と、保存データのスキーマ（`song.schema.json`、`song-export.schema.json`。F1）による検証も行う。
F1 は、jsonschema 4.18 以降（`referencing` を含む）が必要。なくても他の検証は実行される（省略した旨の注記が出る）。

- 終了コード: 0 = エラーなし（警告はあってよい）、1 = エラーあり
- 語彙（`presets/`）を変えたら、このスクリプトも再実行する（既定値や手がかりの語彙 id が消えていないか確認できる）
- 保存データの例: `docs/specifications/song.example.json`（楽曲データ）と `song-export.example.json`（エクスポートファイル）。どちらもエラー0件・警告0件

## 検証の内容

`input-items.md` §6 に一覧がある。特に次の2つは、項目を足したときに効く。

- **D9**: 語彙を共有する項目の組に、矛盾を扱う規則（`crossFieldRules`）があるか。共有が増えたとき、規則の追加を忘れると、エラーになる
- **D6・D7**: 既定値・フォールバックの値が、語彙に存在するか。語彙から語を消したとき、参照が残っていないかを確認できる

保存データ（`--song`）の検証は、`song-file.md` §9-2 に一覧がある（F0〜F9。依頼ごとに、既存の S・R・O 系も適用する）。形は自動判別する（`exportType` があればエクスポートファイル、`profiles` があればストア、`requests` があれば楽曲データ）。

- **P0〜P11**: ツールプロファイル（`tool-profiles/*.json`）の検証。スキーマ適合、id の一意性、参照の整合、`fields.json` の `optionsFrom`／`rangeFrom`／`itemsFrom` との整合。仕様は `docs/specifications/tool-profile.md` §10-2。このツールプロファイルが、保存データの F7（既知の `toolId`、`toolVersion` の比較先）と F9（`derivedFrom.operation`）、長さの範囲（S4）、`variation` の選択肢（O2）も決める
- **負例テスト**: `test_check_fields.py`（125ケース）。検査を変えたら実行する。ツールプロファイルや `fields.json` の違反は、`docs/specifications` の写しに変更を加えて `--spec` で検証する。`jsonschema` がなければ、F1 と、スキーマを使うケースはスキップされる

## 項目を足す・変えるとき

1. `docs/decisions/input-items.md` で決める（正）
2. `docs/specifications/fields.json` を直す
3. `python tools/check-fields/check_fields.py --song docs/specifications/song.example.json` で確認する
4. 項目一覧の表（`input-items.md` §3）は、`--markdown` の出力で置き換える
