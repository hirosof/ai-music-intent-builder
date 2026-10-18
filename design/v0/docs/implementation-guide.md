# 実装ガイド（Claude Code 向け）

- 作成日: 2026-10-18
- 位置づけ: 設計（`design/v0/`）から実装へ移るための、読む順序・最初の確認・単位ごとの読むファイルと受け入れ基準をまとめたもの。入口は、リポジトリ直下の `CLAUDE.md`
- 状態: **初版（利用者の承認待ち）**。実装を進めて分かったことで直す
- 関連: `implementation-readiness.md`（移行判断。基準・宿題の棚卸し）、`handoff-next-thread.md`（設計スレッドの引き継ぎ。**全文は読まない**。§6 の宿題と §4 の教訓だけ）
- 基準のパス: 本書の `docs/`・`tools/` は `design/v0/` 基準。リポジトリのルートは `ai-music-intent-builder/`

---

## 1. 何を作るか（要点）

チャット系AI（ChatGPT・Claude・Gemini など）に、**音楽生成AI（初版は Suno v6）用のプロンプトを作らせるための「依頼文」**を組み立てる Web ツール。利用者本人のみが使う。音楽生成AIの API は呼ばない。出力はクリップボードへのコピーで完結する。

- 利用者は、楽曲の要件（用途・ジャンル・情緒・楽器・構造・歌詞など）を、一覧＋ポップアップの画面で入力する。項目ごとに「値の状態」（指定／お任せ／既定値／ツール任せ）を持つ
- ツールは、入力（楽曲データ）・項目定義・語彙・ツールプロファイルから、**ブロックの組み合わせで依頼文を生成する**（`docs/specifications/request-blocks.md` が出力条件、`docs/decisions/request-text.md` が文面。**文面の正は後者**）
- 保存は、自動保存・ユーザープロファイル・ファイル入出力・UI 設定の4つ（`docs/specifications/song-file.md`）
- 初版の範囲: **新規生成のみ**（インスト・歌あり。依頼文の範囲 `combined`／`style`／`lyrics`）。派生生成は第2段階（宿題48。`docs/decisions/scope.md` L-01b）
- 技術: Vite＋Vue＋TypeScript。UI は Nuxt UI（Nuxt は使わない。Tailwind CSS 4）。VueUse を依存に採用。配置は GitHub Pages＋ローカル IIS（サブパス配信）（`docs/decisions/scope.md` R-06・R-09）

---

## 2. リポジトリの現状（2026-10-18）

```
ai-music-intent-builder/
├── .gitignore            Node 系のテンプレート
├── .gitattributes        改行コードを LF に統一（2026-10-18 作成）
├── LICENSE
├── README.md             1行のみ
└── design/v0/            設計（生きた仕様。実装中も直接更新する）
    ├── docs/             仕様・決定・検証例・調査・議論ログ
    ├── tools/            check-fields / build-presets（Python）、suno-audio-compare
    ├── think/            試作（tree-select-prototype。Nuxt UI・Element Plus・Vuetify）と UI の下図（UI案.drawio・.png）
    │                     （`pre-research/` は 2026-10-18 に除去済み。調査資料は `docs/research/` が正）
    └── validations/      検証ログ（prompt-test/results/…。6モデルの生ログ）
```

- 実装のコードの置き場所: **リポジトリ直下の `app/`**（利用者の承認済み、2026-10-18。create-vue の構成を利用者が作成し、U0 で Nuxt UI などを組み込んだ）
- `design/v0/` は**生きた仕様**。実装中に仕様の曖昧さ・矛盾に当たったら、判断ポイントとして記録し、ここを直接更新する（「正」は1か所）。メジャーバージョンアップ相当の大幅な変更が生じるときは、`design/v1/` のようにフォルダを分ける（利用者の判断、2026-10-18）

---

## 3. 作業の約束

### 3-1. 思考モードと確認の方針（claude.ai 側の設定を、ここに書き写したもの）

以下は**要約**。**「思考モード」の定義の全文と、この語が何を指すか（claude.ai のアカウント設定の「Claude への指示」）は、リポジトリ直下の `CLAUDE.md` の付録が正**（利用者が追記、2026-10-18）。食い違いがあれば、付録を優先する。

- 思考モード: **厳密構成モード**。説明責任と再現性を重視し、成果物の解釈ブレを最小化する
- 確認（質問）は、次の場合だけ、作業の前に行う: (a) 仕様や前提に明確な矛盾・論理破綻がある、(b) 解釈の違いにより成果物が大きく変わる可能性がある。それ以外は確認せず進めてよい
- 未回答・未定・お任せの項目は、次の優先順位で仮定して進める: ①文脈上もっとも整合性が高い解釈、②一般的かつ保守的なデフォルト、③将来の修正が容易な仮定
- **仮定・補完は「補完・仮定一覧」として後段に列挙する。** 質問はしなかったが解釈が分岐し得る前提は「暗黙の前提」として明示する
- 勝手に決めない。「このルールに基づいて判断した」と説明できる形で進める。既に承認された設計を変えるときは、変更する理由を先に述べる（教訓4-6）
- 思考モードを切り替えるときは、影響範囲（スレッド全体／当該返信／特定のセクション）を明示する
- 応答は日本語

### 3-2. 仕様が「正」

- 仕様と実装が食い違ったら、**実装を直す**。仕様を変えるときは、判断ポイントとして記録してから変える（番号の系統は §8）
- 依頼文の文面（`docs/decisions/request-text.md`）は、生成器が**逐語的に再現する**。文面を勝手に直さない。直す必要が出たら、設計に戻る（§7）
- 「未着手」「未検証」などの引き継ぎ書の記述は、**実ファイルで確かめてから**使う（教訓4-47）

### 3-3. 読まないもの（既定）

- `docs/examples/`（549KB）、`docs/discussions/`、`docs/research/`、`pre-research/`、`validations/`、`handoff-next-thread.md`（91KB。大半は追記の履歴）は、**必要になるまで読まない**
- カテゴリ別の語彙（`docs/decisions/vocabulary/genres/` など）は読まない。実装が使うのは、生成物の `docs/specifications/presets/*.json` だけ（語彙の md が正で、JSON は生成物。手で編集しない）

---

## 4. 最初の確認（Phase 0）

実装の最初に、次を片づける。いずれも方針を変えない小さな確認。

| # | 確認 | 内容・コマンド（`design/v0/` で実行） | 期待・結果次第 |
|---|---|---|---|
| 1 | 既存テストのベースライン | `python tools/check-fields/check_fields.py`、`python tools/check-fields/check_fields.py --song docs/specifications/song.example.json`、`python tools/check-fields/test_check_fields.py`、`python tools/build-presets/build_presets.py --check`（生成物が最新か。期待: 終了コード0。2026-10-18 の Phase 0 で、`section-vocal` が生成器に未登録のため再生成で差分が出ると判明した。修正後に 0 になる）。`jsonschema`（4.18 以降）を入れて実行する | エラー0・警告0、**208ケース通過**（利用者の環境で2026-10-18 に確認済み）。差があれば、実装の前に原因を調べる（教訓4-32） |
| 2 | 既定値の関係（宿題25） | `docs/specifications/fields.json` の `default`、`docs/specifications/tool-profiles/suno.json` の `params[].default`、`docs/specifications/tool-profile.md` §13 を突き合わせる。UI の初期値と、依頼文の 5-2 に出る値のどちらが何を使うか | 食い違いがあれば、UI の初期値の決め方を1行決めて判断ポイントに記録する（未確認） |
| 3 | 試作の所在 | **確認済み**: `think/tree-select-prototype/`（`nuxtui`・`element`・`vuetify` の3実装）。Element Plus・Vuetify の実装は、実装に入る前に削除してよい（`docs/handoff-next-thread.md` §2）。階層選択のロジックは `src/shared/`（ライブラリ非依存） | U4 で、Nuxt UI 版と `shared/` を出発点にする |
| 4 | Git の設定 | `.gitattributes` を作成済み（2026-10-18。`* text=auto eol=lf` ほか。利用者承認済み）。docs・コードは **LF・UTF-8**。Windows の Git の CRLF 変換で差分・生成物が変わらないように、既にコミット済みのファイルが CRLF のときは、`git add --renormalize .` が要る（利用者に確認してから） | `build_presets.py` の生成物（`docs/specifications/presets/`）が、再生成で差分を出さないことを確認 |
| 5 | 実行環境 | Node・パッケージマネージャ・Python の版を確認し、版を決めて、`CLAUDE.md` に書く | — |
| 6 | 移動後のリンク修復 | §5 | — |

---

## 5. 移動（`design/v0/` への配置）で直すもの

2026-10-18 に、設計の成果物を旧フォルダ（`E:\AI_Works\Claude\ai-music-prompt-request-support`）からここへ移した。次を直す（機械的な作業。`grep` で見つけて、置換のあとに `grep` で残りがないことを確かめる）。

| # | 内容 | 直し方 |
|---|---|---|
| 1 | **検証ログのパス**: `docs/examples/rendered-*.md` と `suno-test-*.md` の検証結果（§6 など）が、`../../temp (user-to-claude)/prompt-test/<例の名前>/` を指している | 新しい場所は `validations/prompt-test/results/<例の名前>/`。`docs/examples/` からの相対は `../../validations/prompt-test/results/<例の名前>/`。**例外**: `rendered-06`（結果が `results/<モデル>/…` の構造）、suno-test-02（`style_check/`。docs 側の `suno-test-02-jp-traditional-vs-style.md` は 2026-10-18 に直した）は、実際の構造に合わせる。`temp (user-to-claude)` が残らないことを `grep` で確認する |
| 2 | **コマンドの基準**: 文書中の `python tools/...`・`docs/specifications/...` は、旧ルート基準 | 以後は `design/v0/` 基準。`docs/README.md` の冒頭に1行注記を置く（済み） |
| 3 | `docs/README.md` の「作業用フォルダ」、`handoff-next-thread.md` §7 の貼り付け文（旧パス `E:\AI_Works\...`） | README は直す。§7 の貼り付け文は、`CLAUDE.md` に置き換わったので、その旨を1行書く |
| 4 | 重複の整理（2026-10-18 に判断済み） | `pre-research/` は利用者が除去済み。`docs/examples/assets/suno-test-02/` は、参照を `validations/` 側へ直した。**`design/v0/docs/examples/assets/` は、利用者が削除する**（ファイル操作に削除がないため）。削除後、`docs/examples/` に `assets` が残らないことと、`assets/suno-test-02` を指す参照がないことを `grep` で確かめる |

---

## 6. 実装の単位と順序

**提案（利用者承認済みの移行判断のうち、単位と順序の案。`implementation-readiness.md` §5）。** 各単位は、読むファイルと受け入れ基準を先に決める。1回の作業は、完結する単位に分け、区切りごとに要約を出す（教訓4-11）。

### U0 足場

- 内容: Vite＋Vue＋TypeScript＋Nuxt UI（Tailwind CSS 4）＋VueUse＋Vitest。配置先（**`app/`**。利用者の承認済み）、パッケージマネージャ、`base`（サブパス配信。R-09）、仕様の JSON（`design/v0/docs/specifications/`）の読み込み方（**二重に持たない**。Vite のエイリアスなどで直接参照する案）
- 読む: `docs/decisions/scope.md` の R-06・R-07・R-09、`docs/decisions/presets.md` §4-1（フレームワーク）、`docs/decisions/ui-and-nonfunctional.md` §6（配置）、`think/tree-select-prototype/README.md` と `package.json`
- 受け入れ基準: ビルドとテストが通る。開発サーバが起動する。`design/v0/` の仕様 JSON をアプリから読める
- **結果（2026-10-18 完了）**: 決定は、仕様の読み込み＝エイリアス `@spec` で静的に import（二重に持たない）、`base: './'`、ルーターはハッシュ方式、Pinia・Playwright は入れたまま使わない（U3・U4 で判断）、lint は oxlint＋ESLint、整形は oxfmt（利用者が導入）。型検査・ビルド・単体テスト4件・lint が通り、開発サーバと、ビルド結果をサブパス（`/ai-music-intent-builder/`）に置いた表示を確かめた。生成される `auto-imports.d.ts`・`components.d.ts` は Git の管理外（なくても型検査が通る）

### U1 データ層

- 内容: 項目定義（`fields.json`）、語彙（`presets/`）、ツールプロファイル（`suno.json`）の読み込み。楽曲データの型と検証（`song.schema.json` を共有）。**検証の意味の規則は、`tools/check-fields/check_fields.py` が参照実装**（D1〜D12、S1〜S6、R、O1〜O4、F0〜F13、P0〜P11）
- 読む（目安 約200KB）: `docs/specifications/input-items.md`（27KB）、`fields.json`（19KB）、`fields.schema.json`（11KB）、`presets.md`（25KB）と `presets/index.json`・数ファイル、`tool-profile.md`（30KB）と `tool-profiles/suno.json`、`song-file.md`（41KB）と `song.schema.json`（7KB）・`song.example.json`、`tools/check-fields/check_fields.py`（54KB。必要な検査から）
- 受け入れ基準: `song.example.json`・`song-export.example.json`・`factory-profiles.json` が、`check_fields.py` と同じ結果（エラー0・警告0）になる。負例（`test_check_fields.py` の主要なもの）で、同じ種類の指摘が出る
- 分けてよい: U1a（項目・語彙・ツールプロファイル）／U1b（楽曲データの型と検証）
- **結果（2026-10-18 完了）**: 決定は、移植は保存データの検証（F・S・R・O。派生生成の F3・F9〜F11 を含む）だけで、定義の検証（D・P）は移植しない、F1 は Ajv で仕様のスキーマをそのまま使う（`date-time` の書式は、参照実装と同じく検査しない。pattern が同じ制約を持つ）、型は手書き、指摘の文言は参照実装と同じ。照合は `tools/check-fields/export_parity_cases.py` が書き出す正解データ（保存データのケース141件）で行い、文書化された差（F1 の文言・件数、Python の例外の文言、参照実装の副作用1件）以外は一致した。照合の途中で、項目をまたぐ規則（R）の4分岐がどのテストも通らないことが分かり、`test_check_fields.py` に4件を足した（208 → 212件）。変異テスト11種（出力を消す・エラーを警告に降格する・文言を変える・版で止めない・F1 を出さない・R の各分岐を消す）をすべて検出した

### U2 依頼文の生成器（中核。最優先で丁寧に）

- 内容: **純関数**（楽曲データ＋項目定義＋語彙＋ツールプロファイル → 依頼文）。出力条件は `request-blocks.md`、文面は `request-text.md`（正）。節番号は描画時に振る（§8）。**合算行（R-6）を生成する**（`request-blocks.md` §3-5）。依頼の範囲（`requestScope`）・長さ Auto・歌あり（`chat-ai`／`chat-ai-instruction`）の分岐を含む
- 読む（目安 約190KB）: `docs/decisions/request-text.md`（93KB。全文）、`docs/specifications/request-blocks.md`（37KB）、`fields.json`、`tool-profiles/suno.json`、`input-items.md`（仕様。値の形 §5）、`song-file.md` §2〜3、`docs/examples/rendered-12-new-vocal-lyrics-instruction-auto.md` の §1（依頼文の全文）と §2（差分）
- **受け入れ基準（正解データ）**: `-12` §1 と同じ入力を生成器に通した出力が、**`-12` §1 と、文書化された差だけを除いて一致する**。差は、R-6 の合算行（`-12` の依頼文は R-6 の反映前）のみ。入力は、`-12` §1 の §6 の表と §5-2 の設定から起こす（表が入力の完全な記述）。入力の楽曲データ JSON は未作成で、U2 の中で作る
- 追加の正解: `-11`（長さ 3:00、R-2）、`-08`・`-07`・`-09`・`-10`（それぞれの範囲・経路）。ただし `-07`〜`-11` の依頼文は反映前の版で、最新の文面とは差がある（`request-text.md` §9 に、どの反映が入っているかが書いてある）。差を一覧にして、文書化された差だけであることを確かめる
- 「出ない側」の分岐（B-05L の不出力、B-06x の不出力、案の数が1のときの B-07-3 など）も、意図して検証する（教訓4-30）
- **結果（U2a。2026-10-18 完了）**: 生成器（`app/src/domain/request/`）を実装し、`-12` §1 と、文書化された差（R-6 の合算行と B-06x の改訂、§5-2 の行順〔宿題35〕）を除いて1文字単位で一致した。入力は `docs/examples/inputs/rendered-12.json`（検証でエラー0・警告0）。実装の前の照合で、テンプレートと検証済みの例の表記の差（B-03p の「§5-2」、B-05v0／v1 の箇条）が見つかり、テンプレートを例に合わせた（`request-text.md` 判断ポイント41）。例にしか書かれていなかった描画の細部は `request-blocks.md` §12 に書き起こした。文面が未定義のもの（自由記述、出力言語「すべて英語・日本語」、BPM の①指定、トグルの推奨値の行など。§12-5）は、生成を明示的に失敗させ、設計スレッドで決める。出ない側の分岐と失敗の単体テスト16件、変異テスト10種をすべて検出。**残り（U2b）**: `-11`・`-07`〜`-10`・`-v4`・`-03`・`-05` の照合（入力 JSON と、例ごとの文書化された差の一覧を作る）
- **追記（2026-10-19）**: 設計スレッドが未定義の文面を決めた（`request-text.md` 判断ポイント42〜47）。生成器に実装し（自由記述、利用者の文字列の安全化、出力言語、BPM、トグルの推奨値、推奨値の目標）、ファクトリープロファイル6件すべてが生成できることを確かめた。安全化は単体テストで、出力に3連バッククォートが残らないことを確かめた。レンダリング例 `-13` の元として、入力 `docs/examples/inputs/rendered-13.json` と生成した依頼文 `rendered-13.generated.txt` を保存（`-13` の md ができたら、照合を md の読み込みに切り替える）。`request-blocks.md` §12-5 に残る未定義は、派生生成と「使える推奨値が複数あるとき」
- **結果（U2b。2026-10-19 完了）**: 既存の例8本（`-11`・`-08`・`-07`・`-09`・`-10`・`-v4`・`-05`・`-03`）を、入力 `docs/examples/inputs/rendered-*.json` から生成し、例の §1 と照合した（`app/src/domain/request/__tests__/examples.spec.ts`）。差は、出典つきの当て布（`patches.ts`）で文書化された差（R-1〜R-6、T-02、判断ポイント36②・44、宿題35、仮の語彙の表示名）として説明できた。生成器の誤り2件（7-6 の「{{title.lang}} で」の空白、`lyrics` の見出し「補足」）を直した。**文書化されていない差3件（U-1〜U-3）を設計スレッドに持ち帰り中**（`patches.ts` の `UNDOCUMENTED`）
- 分岐の検証は、同じ枠を占める分岐が同居できるかを、規則の表で先に確かめる（教訓4-43）

### U3 保存

- 内容: 自動保存、ユーザープロファイル、ファイル入出力（`useFileDialog`）、ファクトリープロファイル、UI 設定。`schemaVersion` と読み込みの規則（新しい版・不明な id は拒否）
- 読む: `song-file.md`（41KB）、`song.schema.json`・`song-export.schema.json`・`ui-settings.schema.json`、`factory-profiles.json`、`docs/decisions/ui-and-nonfunctional.md` §4
- 受け入れ基準: 書き出して読み込んだ楽曲データが一致する。拒否の規則（`song-file.md` §6-2）が働く
- **結果（2026-10-19。データ層。画面は U4）**: 保存の規則を純関数（`app/src/domain/storage/`）に、localStorage・ダウンロードの読み書きを接続部（`app/src/data/storage.ts`）に置いた。実装前に持ち帰った G1〜G5 は、設計スレッドが判断ポイント43〜47 で決めた（`decisions/ui-and-nonfunctional.md` §4-7）。実装したもの: 読み込み（期待する形を指定。エラーが1件でもあれば全体を拒否、警告は返す）、自動保存（読み込みだけ S5・F12〔歌ありで作詞の主体が未選択〕を「未完成」として許す。他のエラーは破棄〔キーは消さず、次の自動保存で上書き〕）、保存時の正規化（判断ポイント45）、保存の前の検査（エラー0件のときだけプロファイルの保存・書き出し）、ストア（拒否したら書き込まない。書き込む前に検証する）、取り込みの「追加」（衝突ごとに上書き／別名／取り込まない。候補名は「名前（2）」）と「置換」、書き出し（1件・一括）、ファイルの読み込み（エクスポートファイルだけ。他の形は「エクスポートファイルを使ってください」）、UI 設定（版の不一致・スキーマ違反は破棄、不明な id は消さずに使うときに無視、既定値から変えたものだけを持つ）、ファクトリープロファイル（複製して読み込む）。生成器は、未完成（S5）のデータで明示的に失敗する（S5 の判定は `check-saved.ts` の `isSpecifiedEmpty` を共有）。実装の決定（利用者の承認、2026-10-19）: Pinia は使わない（U4 で判断）、`useStorage` は使わない（読み込み時の検証・拒否を挟むため）、キーは `ai-music-intent-builder/song`・`/profiles`・`/ui-settings`、日時は端末の時差付き、ファイル名は1件が `{名前}.json`（Windows で使えない文字は `_`）・一括が `ai-music-intent-builder-profiles-YYYYMMDD-HHmm.json`、取り込みはファイルの値のまま（`updatedAt` も）、移行は実装しない（§6-4）、依頼の `id` は `r1`。往復は、ファクトリー6件・`song.example.json`・入力の例11件で確かめた。正規化の (2) は「無効な項目は、状態に関わらず省略する」と読んだ（例の入力の歌あり6件は `structure` を②で持ち、保存すると省略される。依頼文は変わらない）。テストは 7ファイル・199件 → 12ファイル・269件。変異テスト40種（等価な変異1種〔F12 の他の文言は F1 も必ず出る〕は、判定の関数を直接確かめるテストで検出）

### U4 UI

- 内容: 一覧＋ポップアップ（`UModal`／`UDrawer` のレスポンシブ）、状態・値の見せ方、選択 UI（階層テーブル）、辞典、依頼文の表示とコピー（`useClipboard`、`legacy: true`）、警告
- 読む: `docs/decisions/ui-and-nonfunctional.md`（35KB）、`docs/discussions/2026-09/17_ui-spec.md`（分類A〜Dの決定の経緯）、`docs/decisions/presets.md` §4 以降（選択 UI）、`think/tree-select-prototype/`（Nuxt UI 版と `src/shared/`）、UI の下図 `think/UI案.drawio`（と `UI案.drawio.png`）
- 分類E（vue-router の要否、サブパス配信のルーター設定、実ブラウザの性能・スマホ幅）は、ここで確認する（宿題4）
- 目視が必要な範囲は、前もって明示する（教訓4-9）

### U5 仕上げ

- 内容: 作詞AIへの指示のチップ化の案内（`ui-and-nonfunctional.md` §3-2、判断ポイント41）、サブパス配信での確認、全体の検証

### モデルの使い分け（提案）

- 初回（U0〜U2）は、密度の高い読解・設計・生成器のため、Opus を推奨。UI の部品の実装など反復的な作業は、Sonnet でもよい。仕様の曖昧さ・矛盾に当たったときは、Opus に戻す
- モデル間の差の大きさは確証がない。U2 の受け入れ基準で比べる

---

## 7. 設計に戻る条件

次のときは、実装を止めて設計に戻る（判断ポイントとして記録し、利用者の承認を得る）。

- 仕様が曖昧・矛盾していて、実装側で決められない論点が見つかったとき
- 生成器の出力が、手描画の文面と、**文書化されていない差**を持つとき（文面が正。実装を直す）
- 文面の変更が必要になったとき（レンダリング例を作り、6モデルで再検証する。教訓4-30。検証は利用者作業）

---

## 8. 判断ポイントの番号と、記録の場所

番号は5系統（通し番号ではない）。**着手時に、実ファイルで次の番号を確かめる**（教訓4-47。下は 2026-10-18 時点）。

| 系統 | 場所 | 次の番号 |
|---|---|---|
| 語彙 | `docs/decisions/presets.md` §6 と `docs/decisions/vocabulary/README.md` §5（通し番号） | 214 |
| 入力項目 | `docs/decisions/input-items.md` §4 | 29 |
| UI・非機能・保存 | `docs/decisions/ui-and-nonfunctional.md` §7（`docs/specifications/song-file.md` §10 にも同じ番号の表） | 43 |
| ツールプロファイル | `docs/specifications/tool-profile.md` §11 | 10 |
| 依頼文の文面 | `docs/decisions/request-text.md` §5（補完・仮定は §6 で次は 25） | 42 |

仕様を変えたら、決定（`docs/decisions/`）と仕様（`docs/specifications/`）の両方、必要なら `docs/README.md`・`docs/decisions/README.md` を更新する。新しいファイルを作ったら、その場で `docs/README.md` に登録する。

---

## 9. 利用者への確認事項（2026-10-18 に回答済み。残りは 6 のみ）

実装を止めるものではない。該当する作業の前に確認する。

| # | 内容 | 状況 |
|---|---|---|
| 1 | ~~重複: `docs/research/` と `pre-research/`~~ | **解決**: 利用者が内容の一致を確認し、`pre-research/` を除去した（`docs/research/` が正） |
| 2 | ~~重複: `docs/examples/assets/suno-test-02/` と `validations/…/style_check/assets/`~~ | **解決**: 正は `validations/…/style_check/`（元の `jp_traditional_and_style.md` と画像。`docs/` 側は一時フォルダからのコピー）。docs 側の参照を直した。`docs/examples/assets/` の削除は利用者。`docs/examples/suno-test-02-results/`（`tools/suno-audio-compare` の出力）は残す |
| 3 | ~~`UI案.drawio`（と `.png`）が見当たらない~~ | **解決**: `think/UI案.drawio`・`think/UI案.drawio.png` に配置済み（2026-10-18。サイズは旧フォルダと一致） |
| 4 | ~~アプリのコードの置き場所~~ | **決定**: リポジトリ直下の `app/`（利用者の承認、2026-10-18） |
| 5 | ~~`.gitattributes`（改行コード）~~ | **解決**: 作成済み（`* text=auto eol=lf`、バイナリ、`.bat`・`.cmd`・`.ps1` は CRLF）。既にコミット済みのファイルが CRLF のときの `--renormalize` は、利用者に確認 |
| 6 | `README.md`（リポジトリ直下）が1行のみ | 実装が進んでから整える |

---

## 10. 教訓（Claude Code の作業に関わるもの）

全体は `handoff-next-thread.md` §4（4-1〜4-49）。ここには、実装でも効くものだけを選んだ。

- **決めていない設計を、確認せずに採らない**（4-6）。決めることは「要判断」「既定案」「補完」に分け、結果が大きく分岐する点だけを選択肢つきで求める（4-12）
- **日本語は直接入力する。`\uXXXX` で渡さない**（4-4・4-22・4-35）。書き込んだら、読み戻して機械的に照合する（4-39）。複数の編集は、原子的に適用される（4-26）。数字や紛らわしい漢字を含む置換は、生成した文字列を使う（4-27）
- **検証できるものは、スクリプトにして、負例で確かめる**（4-8）。一度で全部通ったテストは、検査を壊して確かめる（変異テスト。4-13・4-17。「出力を消す」壊し方も）
- **実物でベースラインを取る**（`jsonschema` を入れて）（4-32）。記録の「修正済み」「未着手」を、実ファイルで確かめる（4-19・4-47）
- 条件分岐の**「出ない側」**も検証する（4-30）。分岐が同じ枠を占めていないかを、先に確かめる（4-43）
- 項目の定義パターンを増やすときは、その値を参照している既存のチェックを全部列挙して確かめる（4-46）
- 「そのまま使う」と定めたデータは、全件を一覧して、依頼文に出してよい内容かを確かめる（4-41）
- 識別子は、言語の予約語を避ける（4-10）。jsdom のテストは構造だけで、見た目は目視（4-9）
- 1回の作業は完結する単位に分け、区切りごとに要約を出す（4-11）
- **語彙（md）や生成物（`presets/`）を変えたら、`build_presets.py` を実行し、`--check` が 0 であることと、`git diff` が意図した差だけであることを確かめる。新しい語彙を足したら、生成器のマニフェスト（`VOCABULARIES` など。`tools/build-presets/README.md` に書いてある）への登録を忘れない。** 2026-10-18、L-01 の `section-vocal` で登録を漏らし、Claude Code の Phase 0 で初めて判明した（教訓4-50）
- Windows 環境の注意: `\` と `/` の違い、改行コード（§4 の4）、パスの空白・括弧

---

## 11. 補完・仮定、暗黙の前提

**補完・仮定**

1. 入口ファイルを `CLAUDE.md`（リポジトリ直下）、詳細を本書とした（利用者の指定はない。Claude Code が標準で読む入口を使う）
2. 思考モードと確認の方針（§3-1）は、claude.ai 側の設定を書き写した要約。Claude Code では、その設定が自動で効かないため。定義の全文は `CLAUDE.md` の付録（利用者が追記）を正とする
3. 実装の単位と順序（§6）は、`implementation-readiness.md` §5 の提案（利用者承認済みの移行判断の一部）を、読むファイルと受け入れ基準で具体化した。作業量の見積もりではない
4. 各単位の「読む」の分量は、2026-10-18 に実測したファイルサイズによる目安（`suno.json`・`17_ui-spec.md` は未測定）
5. 重複の整理（§9 の1・2）: `pre-research/` は利用者が内容の一致を確認して除去。画像の重複は、参照を直した上で、docs 側の削除を利用者に依頼した（私のファイル操作には削除がない）
6. アプリのコードの置き場所を `app/` とした（利用者の承認、2026-10-18）

**暗黙の前提**

- 利用者の環境は Windows。Python と Node が使える。`jsonschema` は入っている（208ケースが通過した）
- 検証（6モデルへの貼り付け）は利用者作業で、Claude Code は行えない
- 文面（`request-text.md`）の変更は、レンダリング例と検証を伴うため、実装の途中での変更は避ける
