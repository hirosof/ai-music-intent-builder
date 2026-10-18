# suno-audio-compare

Suno で生成した曲を2グループ（A / B）に分け、音の特徴を数値で比べるスクリプト。
最初の用途は H-09（`Japanese traditional` と `Japanese style`）の判定。

- 手順と判定規則の定義: `../../docs/examples/suno-test-02-jp-traditional-vs-style.md` §7
- **音声ファイルは PC の外へ送信しない**。`--models` を使う場合だけ、初回にモデルの重みを Hugging Face からダウンロードする（送るのはダウンロード要求のみ）

## 1. 準備（Windows / PowerShell）

```powershell
cd E:\Developments\ClaudeCode\ai-music-intent-builder\design\v0\tools\suno-audio-compare
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

モデルも使う場合（推奨。§3 の判定はモデルを使う前提で主指標を6個にしている）:

```powershell
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements-models.txt
```

- Python 3.10 以上を想定
- モデルの重みは初回実行時に `%USERPROFILE%\.cache\huggingface` へ保存される（2つで合計 1GB 前後）

## 2. 実行

```powershell
python compare_styles.py "..\..\temp (user-to-claude)\suno_exports\jp_traditional_style" `
  --out "..\..\docs\examples\suno-test-02-results" `
  --models ast,clap
```

| 引数 | 内容 |
|---|---|
| 第1引数 | 音声ファイルのフォルダ（mp3 / wav / flac / ogg / m4a） |
| `--out` | 出力フォルダ。`report.md`（判定と表）、`metrics.csv`（曲ごとの値）、`results.json`（全データ）を書く |
| `--models` | `ast`、`clap`、`ast,clap`。省略すると信号解析だけを行う |
| `--pattern` | ファイル名からグループと番号を取る正規表現。既定は `^([abAB])(\d+)_`（`a1_曲名.mp3` → A の 1） |

所要時間の目安: 信号解析は1曲あたり数十秒、モデルは CPU で1曲あたり1〜2分程度（PC の性能による）。

## 3. 何を測っているか

| 指標 | 内容 | 予想 |
|---|---|---|
| D1 ビートの明瞭さ | 発音の強さの自己相関から求めた、一定の拍の周期性の強さ | B が大きい |
| D2 打楽器成分の比率 | 調波成分と打楽器成分に分離したときの、打楽器成分のエネルギーの比率 | B が大きい |
| D3 同時に鳴る音高の数 | クロマ（12の音高クラス）のうち、各時点で最大値の半分以上ある音高の数の平均。和音が厚いほど大きい | B が大きい |
| D4 音階の当てはまり | 曲全体の音高クラスの分布が、五音音階（民謡・律・ヨナ抜き、または都節）にどれだけ当てはまるかから、七音音階への当てはまりを引いた値 | A が大きい |
| M1 AST | AudioSet の 527 ラベルで学習した分類モデル。「Music of Asia」「Traditional music」「Flute」「Zither」の平均から「Synthesizer」「Piano」「Drum kit」「Drum machine」「Electronic music」の平均を引いた値 | A が大きい |
| M2 CLAP | 音と文の類似度を測るモデル（音楽向け）。尺八・箏・雅楽などの文との類似度の平均から、ピアノ・シンセ・ドラムなどの文との類似度の平均を引いた値 | A が大きい |

判定は、各指標で A の4曲と B の4曲の全16組を比べ、予想どおりの向きになった組の数で行う（詳細は検証ドキュメント §7-3）。
閾値ではなく順位だけを使うので、指標の値の大きさや単位に左右されない。

## 4. 限界

- D1〜D4 は楽器の種類を識別しない。「和楽器か洋楽器か」はモデル（M1・M2）でしか近似できず、モデルが和楽器をどこまで知っているかも保証がない
- D4 は、ヨナ抜き音階の旋律に西洋の和音を付けた曲では七音音階寄りになる。また、残響や倍音で音高クラスが広がると、どの音階にも当てはまりにくくなる
- D1 と D2 は、ドラムがあれば両方大きくなるため、互いに独立ではない
- 1グループ4曲と少なく、1回の生成で2曲作られる場合は、同じ生成の2曲が似ている可能性がある
- 動作確認は合成音（和音とドラムの曲 / 都節音階の単音の曲）でのみ行った。モデル（AST・CLAP）の処理は、作成時の環境でモデルをダウンロードできなかったため未実行。エラーが出たら、表示された内容をそのまま伝えること
