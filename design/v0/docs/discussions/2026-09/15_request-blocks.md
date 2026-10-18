# 議論ログ 15: 依頼文のブロック化（宿題3）

- 開始: 2026-09-21（引き継ぎ第5版のスレッド）
- 状態: **進行中**（段階1 完了、段階2 進行中。`request-blocks.md` 初版と E1 の実装が済み）
- 思考モード: 厳密構成モード（スレッド全体）
- 前の議題: `14_tool-profile.md`。材料: `handoff-next-thread.md` §3、`request-text.md`、`tool-profile.md`、`input-items.md`

---

## 1. 進め方の承認（要判断A）

議題案（引き継ぎ §3）を、2段で進める。

- **段階1（小）**: `recommendParams` の保存値の形（宿題22）。ブロックが読む値の形になるため、先に決める
- **段階2（本体）**: 依頼文のブロック化。「依頼文への反映」（引き継ぎ §6）の5件と、宿題24（`source`、`lowerBound`）を含める

想定する成果物: `specifications/request-blocks.md`（新規。出力条件を、プロファイルと楽曲データへの参照で書く）、`decisions/request-text.md` の文面更新（文面の正はここのまま）、レンダリング例 `-v4`（既存版は書き換えない）、判断ポイントの記録と本ログ。

利用者の回答: 「推奨で」（要判断 B・C・D の推奨案と、既定案11項目をすべて採用）。

## 2. 承認された判断

| 記号 | 論点 | 決定 | 記録先 |
|---|---|---|---|
| B | `recommendParams` の保存値の形 | **B2** `{パラメータ id: 真偽}`。省略した項目はオフ。プロファイルにないキーはエラー、モードにないキーは警告。真偽1つ（B1）と状態付き（B3）は採らない | `decisions/input-items.md` 判断ポイント18（記録済み） |
| C | 手がかりを誰が絞るか | **C1** ツールが、値が決まっている項目（①③）だけに絞った手がかりを「値」列に書く。手がかりがなければ、フォールバックの種別（`omit`／`choose`／`value`／`text`）に応じた文言を出す。B-02 の 2-1 は、これに合わせて短くする | `specifications/request-blocks.md` §4（`request-text.md` へは未反映） |
| D | 「足させない」値（`no-voice`・`no-era`・`no-playback`）の描画 | **D1** 状態は「指定」のまま、値の末尾に検証済みの言い回し（足さない。触れないまま残す）を付ける。この3つを見分ける属性は、語彙の側に持たせる案。`presets.schema.json` に該当の属性があるかは**未確認**だった。確認の結果、置き場所は E で変更した | `request-blocks.md` §5（`request-text.md` へは未反映） |
| E | 「足させない」値の識別の置き場所 | **E1** `fields.json` の項目に `leaveValues`。語彙の側の属性（E2）は、`presets.schema.json` が項目の属性を固定しているため採らない。反対がなかったため採用 | `decisions/input-items.md` 判断ポイント19（記録済み） |

### 既定案（すべて採用。段階2で仕様に書く）

1. 派生生成のブロック文面（B-01d／B-03d）は今回書かない。読むデータ（`styleOnEnter`、`lengthHandling`、`audio-influence`）の一覧だけ、仕様に入れる
2. 節番号は描画時に採番し、相互参照は ID で解決する
3. 出力条件は、プロファイルの値への参照で書く（例: B-05v0 は選んだ値の `rewritesStyle = false`）。B-01i の Suno 固有の文は `features` から出す。対応する文面のない `instrumental.method` は、代替文を出さず、生成を明示的に失敗させる
4. §5-2 の行は、現在のモードにあり、値が決まっているパラメータ。オンの `recommend` は §7-7。値の出どころのない `vocal-gender` は出さない。長さが④のときは B-05L の文
5. 目標値は、`recommended` の `target`、なければ `limit`（`confirmed`）の9割（切り捨て）。`lowerBound` は「上限」列に出さず、目標はその9割まで。曲名の「できるだけ短く」は B-05t の共通文言
6. `source` は依頼文に出さない。断定の強さは `limit.status` と `recommended.kind` で決め、`unverified`／`thirdPartyUnversioned`、または版が合わない事実は省略する。UI の警告に使う
7. `structure`（`pending`）が①のときは、展開の記述として `defaultDescriptionField` の本文に書かせる。構成タグは出さない
8. 声の②: B-05-3 の最終項を「声を決める場合も歌詞のない形に」に広げ、②の行に「歌詞のない形に限る」を付ける
9. `titleLanguage`（R-14 未定）は、暫定で「日本語」固定
10. 作業運用: 区切りごとに書き込み、読み戻して照合する

## 3. 段階1の作業記録（完了）

| ファイル | 変更 |
|---|---|
| `tools/check-fields/check_fields.py` | `check_per_item_boolean` を追加。O2（形・真偽値）、O3（プロファイルにない項目）、O4（モードにない項目。警告） |
| `tools/check-fields/test_check_fields.py` | `recommendParams` の11ケースを追加（125 → 136） |
| `docs/specifications/fields.json` | `recommendParams` の注記を更新 |
| `decisions/input-items.md` §4、`specifications/input-items.md` §3・§5・§6・§7・§9、`tool-profile.md` §9・§13、`decisions/README.md` | 判断ポイント18と、「未決」の記述の解消 |

**検証**: 私の環境の写し（語彙・`suno.json` などは実ファイルを取り込み）で、136ケース中136件が期待どおり。検出の出力を消す壊し方と、注に降格する壊し方で、14変異をすべて検出した。

**見逃しと対処**: 未知の `toolId` のケースで、早期 return を外しても失敗しなかった。チェッカーが例外を「F0 構造が不正」というエラーに変換するため、`Traceback` の有無では検出できない。ケースに、エラー1件・警告0件の件数と、「F0 構造が不正」がないことの確認を足して塞いだ。

**実環境での実行**（`jsonschema` がなければ、118件を実行し25件をスキップする想定）:

```
python tools/check-fields/check_fields.py
python tools/check-fields/check_fields.py --song docs/specifications/song.example.json
python tools/check-fields/check_fields.py --song docs/specifications/song-export.example.json
python tools/check-fields/test_check_fields.py
```

## 3-2. 段階2の作業記録（進行中）

- `specifications/request-blocks.md` 初版（182行）: ブロックの出力条件（§3）、C1（§4）、D1（§5）、目標値と `source`（§6）、§5-2／§7-7 の出し分け（§7）、節番号（§8）
- 発見: `presets.schema.json` は項目の属性を固定しており、語彙側に「足さない値」の属性を置けない → E1 を提案・採用
- 発見: 用途の `cues: ["*"]` に③を含めると、用途のフォールバックが働かない → ①指定だけを数える（補完・仮定）
- E1 の実装: `fields.json`（3項目に `leaveValues`）、`fields.schema.json`、`check_fields.py`（D12）、テスト（136 → 143）。私の環境の写しで143ケース全通過、D12 の変異（消す・降格・種類判定を外す）をすべて検出
- 未了: `request-text.md` の更新（`request-blocks.md` §10 の7項目）、レンダリング例 `-v4`、`docs/README.md` への `request-blocks.md` の登録

## 4. 教訓（このスレッド。引き継ぎ §4 に続く）

- **4-21. 例外を捕まえて報告するチェッカーでは、「落ちなかった」の確認に `Traceback` は使えない。** エラー・警告の件数と、変換後のメッセージ（F0 構造が不正）がないことを確かめる。変異テスト（教訓 4-13・4-17）で見つかった
- **4-22. 日本語の `\uXXXX` 渡しを、このスレッドで再び繰り返した**（`edit_file` を7回中7回）。教訓 4-4 の禁止は、意識しても守れなかった。差分の目視と、取り込んでのバイト照合（または、元の版との機械的な差分）を、省略しない
- **4-23. `copy_file_user_to_claude` の取り込み先（`/mnt/user-data/uploads`）は読み取り専用。** `mv` はできず `cp` は使える。同名のファイル（`input-items.md` が2つある）は、取り込みのたびに上書きされるので、その都度 `cp` で別名に退避する
- **4-24. 複数ファイルの一括読み取りの結果には、ファイルの区切り（空行と `---`）が混ざる。** 元の版として差分に使うときは、末尾の余分な行を除く
- **4-25. 1コマンドの実行時間は300秒まで。** 変異テスト（1種あたり約20秒）は、種類を分けて実行する

## 5. 次: 段階2（ブロック仕様）

入口の論点（承認済みの判断 C・D と既定案を、仕様に落とす）:

1. `request-blocks.md` の形（ブロックごとの、出力条件・読むデータ・文面・変数）
2. C1 の手がかりの絞り込み規則と、フォールバック種別ごとの文言表
3. D1 の識別の属性（語彙の側。`presets.schema.json` の確認から）
4. §5-2 と §7-7 の出し分け、目標値の規則、節番号の採番
5. 「依頼文への反映」5件（引き継ぎ §6）の文面への反映
6. レンダリング例 `-v4`（B-05v0 の検証を含める）
