# build-presets

`docs/decisions/vocabulary/**/*.md` の json ブロックを統合・検証し、
`docs/specifications/presets/` に**語彙（種類）ごとの JSON**（19ファイル）と `index.json` を生成する。
仕様は `docs/specifications/presets.md`。

## 使い方

リポジトリのどこからでも実行できる。Python 3.8 以降、標準ライブラリだけで動く。

```
python tools/build-presets/build_presets.py           # 検証して生成（生成先の古い JSON は削除する）
python tools/build-presets/build_presets.py --check   # 生成せず、生成先が最新か確認（最新でなければ終了コード2）
python tools/build-presets/test_build_presets.py      # 負例テスト（2026-10-28〜。S14 グループ。リポジトリの語彙は変えない）
```

- flat 語彙は、表示の上のグループ（`groups`・語の `group`）を持てる（2026-10-28。判断ポイント214）。`groups` は語と同じ json ブロックに書く（例: `decisions/vocabulary/small-choices.md` §3 の `era`）。並びと参照の規則は S14（`docs/specifications/presets.md` §5）

`jsonschema`（`pip install jsonschema`）が入っていれば、`docs/specifications/presets.schema.json`（語彙ファイル）と
`presets-index.schema.json`（`index.json`）による検証も行う。なくても他の検証は実行される（省略した旨が注として表示される）。

- 検証エラーが1件でもあれば何も書かない（終了コード1）
- 語彙（md）を変更したら再生成し、`presets/` の JSON を一緒にコミットする
- 生成物は日時を含まない。同じ入力から同じ出力になる
- 生成先の `*.json` のうち、今回の生成対象でないもの（分割前の `presets.json` など）は削除される。生成先は手で編集しない

## 語彙を足すとき

- 既存のファイルに json ブロックの語を足すだけで取り込まれる
- **新しい語彙ファイル、または新しいカテゴリのファイルを作ったとき**は、`build_presets.py` の先頭にあるマニフェスト
  （`GENRE_FILES`、`INSTRUMENT_FILES`、`VOCABULARIES`）に追加する。カテゴリの定義は README の表から読む
- 語彙をまたぐ同一 id を許すのは `ALLOWED_CROSS_VOCAB` の例外だけ（判断ポイント205）
- 表示順の上書きは `ORDER_OVERRIDES`（判断ポイント208）
