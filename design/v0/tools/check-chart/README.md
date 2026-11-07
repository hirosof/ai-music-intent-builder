# check-chart

続けて頼む文「案の比較図」（B-FC。`docs/decisions/request-text.md` §2、文面の判断ポイント51）の検証を助ける。
6モデルに貼る文を作り、回答に出た図（Mermaid の quadrantChart）を機械的に確かめる（引き継ぎ書の宿題63）。

## 使い方

`design/v0/` で実行する。Python 3.8 以降、標準ライブラリだけで動く。

```
python tools/check-chart/check_chart.py emit --axis mood --n 3          # B-FC の文を出す（request-text.md の節から組み立てる）
python tools/check-chart/check_chart.py check LOG_DIR --n 3 --axis mood # 回答の図を検査する（LOG_DIR の *.md を1ファイル＝1モデルとして見る）
python tools/check-chart/check_chart.py check a.md b.md --n 4 --mmdc "npx -y -p @mermaid-js/mermaid-cli@11.16.0 mmdc"
python tools/check-chart/test_check_chart.py                            # 負例テスト
```

- `--axis` は `diffAxis`（`auto`・`mood`・`arrangement`・`texture`・`interpretation`）、`--n` は案の数
- `emit` は、アプリ（`app/src/domain/request/follow-up.ts`）と同じく、request-text.md の節が正。アプリの文とは、アプリのテスト（`follow-up.spec.ts`）がこの節と照合することで揃う
- 結果は Markdown で標準出力に書く。終了コードは、誤りがあれば 1、なければ 0

## 見ること（`check`）

1. mermaid のコードブロック（言語名が `mermaid`。大小は問わない）がちょうど1つで、1行目が `quadrantChart`
2. 点の数が `--n` と合い、点の名前が「案1」〜「案N」と空白で始まり、各案がちょうど1回ずつ出る
3. B-FC の書き方の決まり: 座標が0以上1以下、最大値を「1.0」「1.00」と書かない、1行に1点、点の名前と軸の両端の名前が二重引用符で囲まれ、名前の中に二重引用符がない
4. `--axis mood` のとき、`x-axis "暗い" --> "明るい"`、`y-axis "弱い" --> "強い"`。ほかの差の付け方では、軸ごとに両端の名前が2つあることだけを見る（軸は AI が選ぶ）
5. mmdc で SVG に描けること。`--mmdc` で命令を渡す（省略時は PATH の `mmdc`）。見つからなければ「未確認」と書き、終了コードには数えない

## 注意

- mmdc（`@mermaid-js/mermaid-cli`）は、このリポジトリには入れていない。決まりの根拠は、設計スレッドが Mermaid 11.16.0 で確かめた結果
- 3 は B-FC の決まりを守っているかを見るもので、決まりに反していても描ける場合がある（例: 最小値の「0.0」は通る）。描けるかどうかは 5 で見る
- 図の外（位置の理由の行など）は見ない
