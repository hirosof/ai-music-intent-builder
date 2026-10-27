# ドキュメント構成と運用ルール

本プロジェクト（音楽生成AI用プロンプト作成依頼文ビルダー）のドキュメント一式。

- 最終更新: 2026-10-25（整合性の調査〔`../think/audit-2026-10-25.md`〕による修正: 登録漏れ〔`lyrics.md`・`factory-profiles.json`・`rendered-06-input-songs/`・`suno-test-02-results/`〕、`tools/` の位置、§6 の進捗）。〔経緯〕2026-10-18
- 作業用フォルダ: リポジトリ `ai-music-intent-builder`（`E:\Developments\ClaudeCode\ai-music-intent-builder\`）の **`design/v0/`**（2026-10-18 に移動。旧: `E:\AI_Works\Claude\ai-music-prompt-request-support\`。旧フォルダは移した時点の写しで、以後はリポジトリ側を正とする）。**本書中の `docs/`・`tools/` のパスやコマンドは、`design/v0/` 基準**。リポジトリ直下の `CLAUDE.md` が実装（Claude Code）の入口
- 想定: 要件・仕様の議論をチャット側で行い、実装は自前開発または Claude Code 側で行う
- 利用者: 本人のみ（認証・マルチユーザー対応は不要）

---

## 1. ディレクトリの役割

```
docs/
├── README.md                 このファイル
├── handoff-next-thread.md     次スレッドへの引き継ぎ（現在地、次の議題、作業の型）
├── implementation-readiness.md  実装フェーズへの移行判断（宿題の棚卸し、判定基準、Phase 0、実装の進め方の提案。2026-10-18）
├── implementation-guide.md   実装ガイド（Claude Code 向け。Phase 0、単位ごとの読むファイルと受け入れ基準、作業の約束、教訓。入口はリポジトリ直下の CLAUDE.md。2026-10-18）
├── decisions/                確定事項（「今どうなっているか」が正）
│   ├── README.md             ID一覧と状態（最初に読む）
│   ├── scope.md              R-xx（スコープ・方針）、L-01（作詞）
│   ├── principles.md         DP-xx（設計原則）、RP-xx（依頼文原則）
│   ├── input-items.md        軸A〜F、入力項目、値の状態、3値選択
│   ├── request-format.md     出力フィールド、依頼文の構成、回答フォーマット
│   ├── ui-and-nonfunctional.md  画面構成、保存、データ形式、配置
│   ├── request-text.md       依頼文の文面（ブロック定義）
│   ├── presets.md           選択肢の設計（データ構造、term、階層、選択 UI、表示の切り替えと辞典）
│   └── vocabulary/          選択肢の語彙
│       ├── README.md        選定の方針・細則（V-xx）、カテゴリの骨格、進捗
│       ├── stage-4b-plan.md 段階4b の進め方（承認済み）と手順2 の結果
│       ├── warning-pairs.md 「近い系統」の警告ペアリスト（ジャンル。初版）
│       ├── genres/          カテゴリ別のジャンル語彙（16カテゴリ。pop.md、rock.md …）
│       ├── instruments/     カテゴリ別の楽器語彙（12カテゴリ）
│       ├── region-style.md  地域・文化の様式（軸B）の語彙
│       ├── emotion.md       情緒（軸C）の語彙
│       ├── usage.md         用途（軸A）の語彙
│       ├── temporal-structure.md 時間的な構造（軸E）の語彙
│       ├── production-quality.md 制作・質感（軸F）の語彙
│       ├── small-choices.md     少数の択一項目7つ（軸A〜D）の語彙
│       └── lyrics.md        歌詞の構成セクション（軸G。`section-vocal`。L-01、2026-10-16）の語彙
├── examples/                 依頼文のレンダリング例、検証観点、検証結果
│   ├── inputs/               レンダリング例の入力（楽曲データ JSON）。アプリの生成器の照合に使う（2026-10-18〜）。`*.generated.txt` は生成器の出力（例の元。生成物）
│   ├── rendered-06-input-songs/  `-04` の入力と `-06` の A〜D の楽曲データ JSON（5件。`-06` §8-2 の確認の再現用。宿題39）
│   ├── suno-test-02-results/  `suno-test-02` の解析結果（`../tools/suno-audio-compare` の出力。metrics.csv・report.md・results.json）
│   ├── rendered-01-new-instrumental.md     第1回（初版）
│   ├── rendered-01-new-instrumental-v2.md  第2回
│   ├── rendered-01-new-instrumental-v3.md  第3回
│   ├── rendered-01-new-instrumental-v4.md  第4回（C1・D1 等の反映。6モデルで検証済み）
│   ├── rendered-02-derived-cover.md        派生生成（Cover。B-DF の初回。6モデルで検証済み）
│   ├── rendered-03-delegated-heavy-ambient.md  お任せ多め・除外0件の新規生成（6モデルで検証済み）
│   ├── rendered-04-derived-extend-keep.md  派生生成（延長・keep。B-DF の他分岐。6モデルで検証済み）
│   ├── rendered-05-new-instrumental-variation-off.md  新規生成（バリエーション「オフ」。B-05v0。6モデルで検証済み）
│   ├── rendered-06-derived-source-branches.md  派生生成（B-DF の残り4分岐。元スタイルなし・near・近さ②・編集方法②。6モデル×4本で検証済み）
│   ├── rendered-07-new-vocal-chat-ai.md    新規生成・歌あり（チャットAIが作詞。L-01 の依頼文ブロックの初回。6モデルで検証済み）
│   ├── rendered-08-new-vocal-lyrics-instruction.md  新規生成・歌あり（作詞AIへの指示文。6モデルで検証済み）
│   ├── rendered-09-new-vocal-style-only.md  新規生成・歌あり・依頼文の範囲＝スタイルのみ（`requestScope = style`。検証済み）
│   ├── rendered-10-new-vocal-lyrics-only.md  新規生成・歌あり・依頼文の範囲＝歌詞のみ（`requestScope = lyrics`。検証済み）
│   ├── rendered-11-new-vocal-lyrics-instruction-r2.md  新規生成・歌あり（作詞AIへの指示文）。R-2 反映後の再検証用（`-08` と同一入力。6モデルで検証済み）
│   ├── rendered-12-new-vocal-lyrics-instruction-auto.md  新規生成・歌あり（作詞AIへの指示文）・長さ Auto。R-5・T-02・Auto 経路の検証用（`-11` と同一入力で長さだけ Auto。6モデルで検証済み）
│   ├── rendered-13-new-instrumental-freetext-all-english.md  新規生成・インスト・出力言語＝すべて英語。自由記述・BPM 範囲・Max モード推奨・R-6 の確認用。入力 `inputs/rendered-13.json`、依頼文は生成器の出力。6モデルで検証済み
│   ├── rendered-14-new-vocal-chat-ai-japanese-kanji.md  新規生成・歌あり（チャットAIが作詞）・歌詞の言語①日本語。日本語の歌詞の表記（判断ポイント49）の再検証用。入力 `inputs/rendered-14.json`、依頼文は生成器の出力。未検証
│   ├── chat-test-01-jp-lyrics-kanji.md    チャットAIでのお試し（2026-10-27。日本語の歌詞の漢字・かな・振り仮名。7条件×6モデル）の記録と計測。判断ポイント49 の根拠
│   ├── suno-test-01-granularity.md        Suno での検証（H-07）
│   ├── suno-test-02-jp-traditional-vs-style.md  Suno での検証（H-09。判定不能）
│   └── suno-test-03-village-town-city.md  Suno での検証（用途語彙の「街・村のテーマ」分割の根拠）
├── research/                 外部ツールの調査結果と参考資料
│   ├── suno-profile.md       Sunoプロファイル暫定版 + 実例・観察
│   ├── open-questions.md     未検証事項
│   ├── genres/               音楽ジャンルの調査結果（各種AI、4件）
│   └── instruments/          楽器の調査結果（各種AI、4件）
├── specifications/           実装向け仕様（decisions/ から導く）
│   ├── presets.md            語彙のデータ仕様（＋ presets.schema.json、presets-index.schema.json）
│   ├── presets/              語彙の生成物（tools/build-presets/ で生成。手で編集しない）
│   ├── song-file.md          保存データの仕様（＋ song.schema.json、song-export.schema.json、ui-settings.schema.json、song.example.json、song-export.example.json）
│   ├── factory-profiles.json ファクトリープロファイル6件（エクスポートファイルの形。判断ポイント39〜40。`song-file.md` §4-4）
│   ├── input-items.md        入力項目の仕様（＋ fields.json、fields.schema.json）
│   ├── tool-profile.md       ツールプロファイルの仕様（＋ tool-profile.schema.json、tool-profiles/suno.json）
│   └── request-blocks.md     依頼文ブロックの出力条件とデータの出所（文面の正は decisions/request-text.md）
└── discussions/              議論ログ（時系列、追記のみ）
    └── 2026-09/
        ├── 01_kickoff-and-suno-research.md
        ├── 02_input-items-and-output-format.md
        ├── 03_ui-and-nonfunctional.md
        ├── 04_cover-art-and-thread-split.md
        ├── 05_vocabulary-pop-family.md
        ├── 06_presets-split-and-metal.md
        ├── 07_vocabulary-electronic-and-dictionary.md
        ├── 08_vocabulary-remaining-families-and-stage-4b.md
        ├── 09_all-axes-vocabulary-completion-and-usage-scope.md
        ├── 10_presets-json-schema.md
        ├── 11_ui-library-review.md
        ├── 12_input-items-spec.md
        ├── 13_song-file-format.md
        ├── 14_tool-profile.md
        ├── 15_request-blocks.md
        ├── 16_derived-generation-data-model.md
        ├── 17_ui-spec.md
        └── 18_factory-profiles.md
```

`design/v0/` の直下には `tools/` もある（リポジトリ直下ではない。リポジトリ直下には `app/`〔アプリ本体〕と `CLAUDE.md` がある。`tools/suno-audio-compare/`: 生成曲を2グループに分けて音を比べる Python スクリプト。PC 内で完結する）。
`tools/build-presets/` は、`decisions/vocabulary/` の json ブロックを統合・検証して `specifications/presets/`（語彙ごとの JSON）を生成する Python スクリプト（`specifications/presets.md`）。
`tools/check-fields/` は、入力項目の定義（`specifications/fields.json`）と語彙の整合、保存データ（楽曲データ・エクスポートファイル・ストア）の検証と、その負例テストを行う Python スクリプト（`specifications/input-items.md`、`specifications/song-file.md`）。`export_parity_cases.py` は、アプリ（`app/`）の検証との照合用の正解データを書き出す。
`tools/measure-logs/` は、6モデルの検証ログ（`validations/prompt-test/results/`）の機械測定を行う Python スクリプト（2026-10-19〜。教訓4-40）。`measure_logs.py` は1つの例の回答から、スタイル欄・除外欄のコードブロックを取り出し、日本語の混入・文字数・否定の形・「自由記述」の位置・除外欄の語を測る。`length_summary.py` は、例をまたいで詳細プロンプトの文字数を集計する（目標・上限の超過。宿題50）。欄の見出しがない回答は、どの案もコードブロックが3つのときだけ並び順で取り出し、それ以外は取り出さずに一覧に出す。
`tools/check-docs/` は、設計書（この `docs/`）の機械検査を行う Python スクリプト（2026-10-26〜）。判断ポイントの表の番号（重複・欠番・並び順）、`song-file.md` §10 の番号の実在、相対リンク切れ、文字の破損、「次の番号」の記載を見る。`--next` で判断ポイントの次の番号を表示する（次の番号は文書に書かない）。意図した例は `allowlist.json` に理由つきで入れる。定期の整合性の調査の依頼文の雛形（`audit-request.md`）も置く（報告は `design/v0/think/` の `audit-YYYY-MM-DD.md`）。

| ディレクトリ | 役割 | 更新のしかた |
|---|---|---|
| `decisions/` | 今どうなっているか。決定と、その理由・由来 | 決定が変わったら上書きする（履歴は Git と `discussions/` に残る） |
| `examples/` | 依頼文を具体的な設定で全展開したもの。検証観点と結果 | 文面が変わったら作り直す。検証結果は追記する |
| `research/` | Suno など外部ツールの調査結果、および語彙の参考資料 | 新しい確認結果で更新する |
| `research/genres/` `research/instruments/` | 各種AI に調査させた結果を**そのまま**置いた参考資料 | **編集しない。** 選定結果は `decisions/vocabulary/` 側に書く |
| `discussions/` | どういう経緯でそうなったか。撤回した案も含めて残す | 追記のみ。過去のログは書き換えない |
| `specifications/` | 実装指示（Claude Code 向け） | `decisions/` から導く |

### 画像版との違い

画像生成AI版リポジトリ（`hirosof/ai-art-prompt-request-builder`）は
`design/` + `discussions/` + `specifications/` の3階層で、
議論ログが Phase 番号でディレクトリ分けされていた。

音楽版では次の2点を変更している。

1. **`decisions/` を新設**し、「最新の結論」を1か所に集約した。
   画像版では確定事項が議論ログに埋もれ、「いつ何が決まったか」を追うのに
   ログを読み直す必要があった。
2. **議論ログを Phase 番号ではなく日付（`2026-09/`）で分ける**。
   画像版では同じ話題が Phase4 と Phase5 の両方に現れ、
   探す場所が分散した（例: P5-03）。日付なら置き場所が一意に決まる。

---

## 2. 更新ルール

### decisions/

- 各項目は **ID** を持つ（`R-xx`, `L-xx`, `DP-xx`, `RP-xx`）。IDは再利用しない。
- 各項目は **状態** を持つ。

| 状態 | 意味 |
|---|---|
| 確定 | 決定済み。変更するには明示的な再議論が必要 |
| 暫定 | 仮の既定値で進行中。議論で変わり得る |
| 未着手 | 論点として認識しているが未議論 |
| 撤回 | 一度採用したが取り下げた。理由を残す |

- 決定を変更したときは、`discussions/` に変更の経緯を追記する。

### research/

- 各情報には **確認日**、**情報源**、**対象バージョン** を付す。
- 情報の優先順位は DP-06 に従う
  （実画面での確認 ＞ 公式情報 ＞ 対象バージョンが明記された第三者情報 ＞ 対象バージョン不明の第三者情報）。
- 「更新日が新しい記事」でも対象バージョンが古い場合がある（2026-09 に実例あり）。
  更新日ではなく、記載内容の対象バージョンで判断する。

### discussions/

- ファイル名は `NN_主題.md`（連番 + 内容がわかる名前）。
- 撤回した案・誤っていた前提も消さずに残す。「なぜその結論に至ったか」の追跡のため。

---

## 3. 思考モード

本プロジェクトは **厳密構成モード** で進行する。

- 説明責任と再現性を重視する
- 補完・仮定した内容は「補完・仮定一覧」として明示する
- 解釈が分岐し得る前提は「暗黙の前提」として明示する

---

## 4. 読む順序

初めて読む場合、または Claude Code に引き継ぐ場合:

1. `handoff-next-thread.md` — 引き継ぎ（現在地、次の議題、作業の型）
2. `decisions/README.md` — ID一覧と状態
3. `decisions/scope.md` — 何を作るか / 作らないか
4. `decisions/principles.md` — 設計原則と依頼文原則
5. `decisions/input-items.md` — 入力項目
6. `decisions/request-format.md` — 依頼文と回答の書式
7. `decisions/request-text.md` — 依頼文の文面（ブロック定義）
8. `decisions/presets.md` — 選択肢の設計
9. `decisions/vocabulary/README.md` — 語彙の選定方法とカテゴリの骨格（カテゴリ別のファイルは必要なときのみ）
10. `decisions/ui-and-nonfunctional.md` — 画面構成と保存
11. `research/suno-profile.md` — Suno の仕様
12. `research/open-questions.md` — 未確定事項

`discussions/` は経緯を確認したいときのみ読む。

---

## 5. 新しいスレッドの始め方

議論が長くなったらスレッドを分ける。
`decisions/` に結論が集約されているため、ドキュメントを読み込むところから再開できる。
以下を新スレッドの冒頭に貼り、「今回の議題」だけ差し替える。

**2026-10-18 注**: 実装フェーズ（Claude Code）では、以下の貼り付け文の代わりに、リポジトリ直下の `CLAUDE.md` と `design/v0/docs/implementation-guide.md` を入口にする。以下は、設計スレッド（claude.ai）を続ける場合の文面（パスは旧フォルダ基準で、現在は `design/v0/` に読み替える）。

```
音楽生成AI用プロンプト作成依頼文ビルダーの設計を継続します。

思考モード：厳密構成モード（スレッド全体）

前提となるドキュメント：
E:\AI_Works\Claude\ai-music-prompt-request-support\docs\

読む順序：
1. docs/decisions/README.md（ID一覧と状態）
2. docs/decisions/scope.md
3. docs/decisions/principles.md
4. docs/decisions/input-items.md
5. docs/decisions/request-format.md
6. docs/decisions/request-text.md
7. docs/decisions/presets.md
8. docs/decisions/vocabulary/README.md
9. docs/decisions/ui-and-nonfunctional.md
10. docs/research/suno-profile.md
11. docs/research/open-questions.md

今回の議題：（ここに議題を書く）
```

### 運用上の注意

- `discussions/` は冒頭では読ませない。経緯が必要になったときだけ参照する
- `decisions/vocabulary/genres/` のカテゴリ別ファイルも冒頭では読ませない。議題に関係するカテゴリだけを指定して読ませる
- **スレッドを分ける前に、そのスレッドの内容を
  `decisions/` と `discussions/` に反映し終えておく**
- 区切りの目安は「議題が一区切りついたとき」。
  議題の途中で分けると未反映の内容が残る
- 節番号は項目の挿入でずれるため、ドキュメント間の参照は
  **節番号より ID（R-xx / RP-xx など）で行う**ほうが安全

---

## 6. 進捗

| 段階 | 状態 |
|---|---|
| 1. スコープ確定 | 完了 |
| 2. 依頼文の上位原則 | 完了 |
| 3. 入力項目の洗い出し | 完了（骨格。選択肢の語彙は未作成 → 語彙は全軸完了。9 を参照） |
| 4. 出力形式 | 完了（骨格） |
| 5. UI 構成と非機能 | 完了 |
| 6. 依頼文の実際の文面 | 完了（`decisions/request-text.md`。実用水準） |
| 7. レンダリング例の検証 | 完了（計3回。v3 で3モデルが全観点通過）。以降も文面の変更ごとに検証している（`-v4`・`-02`〜`-06`） |
| 8. 選択肢の設計 | 完了（`decisions/presets.md`） |
| 9. **選択肢の語彙の作成** | **完了（全軸A〜F。ジャンル16カテゴリ、楽器12カテゴリ、地域・情緒・用途・時間構造・制作質感。ジャンルの段階4b（数による非表示）のみ選択 UI の試作後に残す。`handoff-next-thread.md`）** |
| 10. 派生生成ブロックの作成 | 完了（2026-09-23。B-DF・B-03d・B-01 の分岐。検証は `-02`・`-04`・`-06`）。**初版には含めない**（2026-10-18。F6 維持。派生生成は第2段階。`handoff-next-thread.md` 宿題48） |
| 11. L-01（作詞）の本議論 | 決定・仕様・依頼文ブロックへの反映は完了（2026-09-28〜2026-10-17。`decisions/scope.md` §20、`input-items.md` 判断ポイント20〜27、`request-text.md` 判断ポイント19〜31）。レンダリング例 `-07`・`-08` を作成し、6モデルで検証済み（2026-10-17。両経路とも意図どおりに機能）。修正候補 R-1〜R-4 は利用者の判断で 2026-10-17 に `request-text.md`・`request-blocks.md` へ反映済み（R-2 は案a。**反映後は未再検証**）。2026-10-18 に候補7「依頼文の範囲（`output.requestScope` = `combined`／`style`／`lyrics`。スタイルと歌詞を別のチャットAIに依頼する使い方）」を設計・承認し、仕様・データ・チェッカー（F13）・文面（`request-text.md` 判断ポイント32〜35、`request-blocks.md` §3-4）へ反映。チェッカー・テストは実行済み（208/208通過。宿題44完了）。レンダリング例 `-09`・`-10` を作成し、6モデルで検証済み（2026-10-18。両範囲とも意図どおりに機能。R-1・R-4 の再検証も良好）。補完・仮定23（Q-09-1・Q-10-1）は利用者の承認で解決し、判断ポイント36として文面を条件化済み（条件化後の文面は未再検証。`handoff-next-thread.md` 宿題45）。R-2 反映後の再検証用に `-11` を作成し、6モデルで検証済み（2026-10-18。`-08` と同一入力。R-2・R-3・判断ポイント36① とも意図どおり。新規の論点 R-5〔歌詞の構成②のときの B-LY-B の文言〕は 2026-10-18 に適用済み（`request-text.md` 判断ポイント38。反映後は未再検証）。宿題41・46 完了）。T-02（判断ポイント39）と R-5 の反映後・Auto 経路の検証用に `-12` を作成し、6モデルで検証済み（2026-10-18。いずれも意図どおり。新規の論点 R-6〔除外欄の「使用しない」の列の値の漏れ〕は、案(b)（除外の合算行）を 2026-10-18 に適用済み（`request-text.md` 判断ポイント40。反映後は未再検証。宿題47 完了）） |
| 12. `specifications/` への落とし込み | **完了**（残っていた UI の仕様〔分類E〕は 2026-10-20 に U4e で確認。以下は 2026-10-18 までの記録）。**一部完了**（語彙: `specifications/presets.md`、入力項目: `specifications/input-items.md`、保存データ: `specifications/song-file.md`、ツールプロファイル: `specifications/tool-profile.md`、依頼文ブロック: `specifications/request-blocks.md`（新規生成・派生生成は完成。歌ありは反映済み・6モデル検証済み）。ファクトリープロファイルの中身は完了。残り: UI の仕様（分類E。`decisions/README.md` 次のステップ） |
| 13. 実装（自前または Claude Code） | 状態は `implementation-guide.md` §6（ここには写さない。同じ事実の置き場所の規則。`implementation-guide.md` §7 の6）。コードはリポジトリ直下の `app/`。以下は着手前の記録（2026-10-18）: 未着手。**移行判断は 2026-10-18 に利用者が承認**（`implementation-readiness.md`。結論: 移行してよい。条件は Phase 0 の確認5件と、Claude Code 向けの引き継ぎの用意。**利用者が承認済み**） |
