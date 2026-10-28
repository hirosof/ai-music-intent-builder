# CLAUDE.md（AI Music Intent Builder）

チャット系AI（ChatGPT・Claude・Gemini など）に、音楽生成AI（初版は Suno v6）用のプロンプトを作らせるための「依頼文」を組み立てる Web ツール。利用者本人のみが使う。応答は**日本語**。

## 現在地

初版は完了し、使ってみての手直しの段階。実装の詳細（単位の完了・テストの件数・コミット・検証の結果）は `design/v0/docs/implementation-guide.md` §6、設計側の未決・保留は `design/v0/docs/handoff-next-thread.md` §6 が正（ここには写さない。同じ事実の置き場所の規則。implementation-guide §7 の6）。最初に読むのは、implementation-guide と本書だけ。

## リポジトリの構成

```
design/v0/   設計（生きた仕様。実装中も直接更新する。「正」は1か所）
  docs/      仕様（specifications/）、決定（decisions/）、検証例（examples/）、調査、議論ログ
  tools/     check-fields・build-presets（Python）。`design/v0/` で実行する
  think/     試作（tree-select-prototype）と UI の下図（UI案.drawio・.png）
  validations/  6モデルの検証ログ
```

- 大幅な変更（メジャーバージョンアップ相当）が生じるときは、`design/v1/` のようにフォルダを分ける（利用者の判断）
- アプリのコードの置き場所: **リポジトリ直下の `app/`**（利用者の承認済み。create-vue の構成を利用者が作成）。`.gitattributes` で改行コードは LF に統一
- 仕様の JSON は `app/` に写さない。エイリアス `@spec`（→ `design/v0/docs/specifications`。`vite.config.ts` と `tsconfig.app.json`）で直接読み、ビルドに組み込む
- `base: './'`（相対）とハッシュ方式のルーターで、GitHub Pages とローカル IIS のどちらのサブパスにも同じビルドで置ける
- GitHub Pages への公開は `.github/workflows/deploy.yml`（手動実行。利用者が行う）

## 読む順序

1. 本書
2. `design/v0/docs/implementation-guide.md`（Phase 0、単位ごとの読むファイルと受け入れ基準、作業の約束、教訓）
3. 着手する単位に必要なファイルだけ（implementation-guide §6 の「読む」）

**読まない（必要になるまで）**: `design/v0/docs/examples/`、`docs/discussions/`、`docs/research/`、`validations/`、`docs/handoff-next-thread.md`（設計スレッドの履歴。約130KB）。設計書は大きい（実装で読む「正」だけで約320KB）ため、全部を読まない。

## 作業の約束（要点）

- **思考モード: 厳密構成モード（このプロジェクトではスレッド全体に適用。定義は末尾の付録「思考モードについて」）。** 説明責任と再現性を重視する。仮定・補完は「補完・仮定一覧」として後段に列挙し、解釈が分岐し得る前提は「暗黙の前提」として明示する
- **確認は最小限**: 仕様に明確な矛盾・論理破綻があるとき、または解釈の違いで成果物が大きく変わるときだけ、作業前に確認する。それ以外は、文脈上もっとも整合的な解釈 → 一般的で保守的な既定値 → 将来直しやすい仮定、の順で補って進める
- **仕様が正。** 食い違ったら実装を直す。仕様を変えるときは、判断ポイントとして記録してから変える（番号の系統は implementation-guide §8）。決めていない設計を、確認せずに採らない
- **依頼文の文面は `design/v0/docs/decisions/request-text.md` が正。** 生成器は逐語的に再現する。文面を勝手に直さない
- 日本語は直接入力する（`\uXXXX` で渡さない）。書き込んだら読み戻して照合する。検証できるものはスクリプトにして、負例で確かめる
- 引き継ぎ書の「未着手」「未検証」は、実ファイルで確かめてから使う

## コマンド（`design/v0/` で実行）

Python は、プロジェクトの venv（`design/v0/.venv`。Git の管理外）を使う。初回だけ作る:

```
python -m venv .venv
.venv/Scripts/python -m pip install -r tools/requirements.txt
```

```
.venv/Scripts/python tools/check-fields/check_fields.py
.venv/Scripts/python tools/check-fields/check_fields.py --song docs/specifications/song.example.json
.venv/Scripts/python tools/check-fields/test_check_fields.py   # 期待: 全件が期待どおり（スキップ0）。2分以上かかる
.venv/Scripts/python tools/check-fields/export_parity_cases.py # アプリの検証との照合用の正解データを書き出す（--check で最新か確認）。検査やテストを変えたら実行し、アプリのテストも流す
.venv/Scripts/python tools/build-presets/build_presets.py      # 語彙（md）を変えたときに再生成
.venv/Scripts/python tools/build-presets/build_presets.py --check   # 生成物が最新か（終了コード0）。語彙を変えたら最後に必ず行う
.venv/Scripts/python tools/build-presets/test_build_presets.py      # build_presets.py の負例テスト（S14 グループなど）
.venv/Scripts/python tools/measure-logs/measure_logs.py LOG_DIR --exclude-term WORD ...   # 6モデルの検証ログの機械測定（日本語の混入・文字数・否定の形・「自由記述」の位置・除外欄の語）
.venv/Scripts/python tools/check-docs/check_docs.py          # 設計書の機械検査（判断ポイントの表・リンク・文字の破損・「次の番号」の記載）。期待: エラー0
.venv/Scripts/python tools/check-docs/check_docs.py --next   # 判断ポイントの次の番号（追記する前に必ず見る。値は文書に書かない）
.venv/Scripts/python tools/check-docs/test_check_docs.py     # check_docs.py の負例テスト
```

機械検査を一通り回すとき（作業の区切り・コミットの前）は、上の `check_fields.py`（`--song` も）・`test_check_fields.py`・`build_presets.py --check`・`test_build_presets.py`・`export_parity_cases.py --check`・`check_docs.py` と、下のアプリのテスト・型検査・lint・整形・ビルドを流す（`design/v0/docs/implementation-guide.md` §7）。

## アプリのコマンド（`app/` で実行）

```
npm run dev          # 開発サーバ（http://localhost:5173/）
npm run build        # 型検査（vue-tsc）＋ビルド
npx vitest run       # 単体テスト（npm run test:unit は監視モード）
npx oxlint .         # lint（npm run lint は --fix でファイルを書き換える）
npx eslint .
npx oxfmt --check src/
```

- テストは `src/**/__tests__/` に置く（tsconfig.vitest の決まり）
- 依頼文の生成器の正解は、レンダリング例の md（`@examples` = `design/v0/docs/examples`）から直接読む。入力は `examples/inputs/`。例との差は、出典つきの当て布（`Patch`）でだけ認める（文書化された差）
- 構成: `src/domain/`（型と、画面に依存しない純関数。検証は `domain/validation/`、依頼文の生成器は `domain/request/`）、`src/data/`（仕様の JSON の読み込み）
- 保存データの検証（`domain/validation/check-saved.ts`）は `check_fields.py` の移植で、文言も同じ。照合の正解データ（`src/domain/__tests__/fixtures/check-fields-cases.json`）は生成物で、`design/v0/tools/check-fields/export_parity_cases.py` が書き出す（手で編集しない）
- Pinia・Playwright（e2e）は入っているが、使わない（U0 で保留し、U3・U4 で使わないと決めた〔U3 の決定、U4 の J1・J8〕。e2e はブラウザ本体が未導入）

## 実行環境（2026-10-18 に確認）

- OS: Windows 11。Node v24.21.0、npm 11.19.0（pnpm はなし。yarn 1.3.2 は古いため使わない）。Python 3.14.8、Git 2.56.0
- パッケージマネージャ: npm（確定）。主な依存: Vue 3.5.44、Nuxt UI 4.12.0、Tailwind CSS 4.3.3、VueUse 15.0.0、vue-router 5.4.0、Vite 8.3.4、Vitest 4.1.11、TypeScript 6.0.3（`app/package-lock.json` で固定）
- `jsonschema` は、グローバルの Python ではなく、プロジェクトの venv に入れる（`tools/requirements.txt`。設計スレッドの推奨を利用者が共有、2026-10-18）。未導入だと 208 件中 47 件がスキップになる
- `test_check_fields.py` は `jsonschema` ありで2分以上かかる（バックグラウンドで実行する）

## 最初にやること

新しいスレッドでは、`git status` で作業ツリーを確かめ、本書と implementation-guide（§6 の結果、§7 の設計スレッドとの往復と機械検査の一覧、§8 の判断ポイントの系統、§10 の教訓）を読んでから、利用者の指示を待つ（使ってみての気づきの手直しなど）。判断ポイントの次の番号は `check_docs.py --next` で確かめる。

## モデルについて

初回（U0〜U2）は Opus を推奨（読解・設計の密度が高いため）。反復的な作業は Sonnet でもよい。仕様の曖昧さに当たったら Opus に戻す。

## 付録

### 思考モードについて

本プロジェクトは、当初、通常のClaudeで設計を行い、実装フェーズ以降はClaude Codeへ環境を移行して続行している。

そして、Claudeのアカウント設定に設定してある、「Claudeへの指示」には「思考モード」というものが定義してあり、前述に登場した「思考モード」はそれを示している。

参考資料として、「思考モード」の内容を以下に記す。

```
## 思考モードについて

私は複数の性質の異なるプロジェクトであなたを利用します。
そのため、プロジェクトごとに「思考モード」を指定します。

■ 思考モード
以下の思考モードを想定してください。

1. 最小構成モード
   - 確認は最小限にする
   - 文脈上自然で整合性のある仮定を置いて進めてよい
   - 創作性や思考の流れを優先する

2. 厳密構成モード
   - 設計・実装・仕様整理向け
   - 説明責任と再現性を重視する
   - 成果物の解釈ブレを最小化する

プロジェクトやスレッド冒頭で思考モードが指定されている場合、
必ずそれに従ってください。
指定がない場合は「最小構成モード」を既定とします。

■ 確認（質問）ポリシー
以下に該当する場合のみ、作業前に確認してください。

- 仕様や前提に明確な矛盾・論理破綻がある
- 解釈の違いにより成果物が大きく変わる可能性がある

それ以外の事項については、確認せず進めて構いません。

■ 未回答・未定・お任せ項目の扱い
未回答、未定、「お任せ」とされた項目については、
以下の優先順位で仮定・補完して進めてください。

1. 文脈上もっとも整合性が高い解釈
2. 一般的かつ保守的なデフォルト
3. 将来の修正が容易な仮定

■ 仮定・補完の可視化
厳密構成モードでは、以下を必ず行ってください。

- 補完・仮定した内容を
  「補完・仮定一覧」として後段に列挙する
- 質問はしなかったが、解釈が分岐し得る前提がある場合、
  それを「暗黙の前提」として明示する

最小構成モードでは、必要に応じて簡潔に触れる程度で構いません。

■ 思考モードの動的切り替え
状況に応じ、思考モードを動的に切り替えて構いません。
ただし、切り替えを行う場合は、その影響範囲を明示してください。

動的切り替えは、以下のいずれかとして扱います。

1. これ以降（当該スレッド全体）の思考モード切り替え
2. 当該返信単体での思考モード切り替え
3. 当該返信内の特定セクションのみの思考モード切り替え

切り替え理由の説明は簡潔で構いません。
重要なのは、どの範囲で思考モードが適用されているかが
追跡可能であることです。

■ 基本姿勢
私は「すべてを事前に決めたい」のではなく、
判断の根拠が追跡できる形で前に進みたいと考えています。

勝手に決めるのではなく、
「このルールに基づいて判断した」と説明できる形で
進行してください。
```