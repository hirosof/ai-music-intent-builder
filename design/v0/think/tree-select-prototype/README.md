# 試作: 階層選択UIの比較（Element Plus / Vuetify / Nuxt UI）

`docs/specifications/presets.md` §4 の「階層のある項目の選択UI」を、PrimeVue の TreeTable 以外のライブラリで実現できるかを確かめる試作。
ジャンル語彙（`genre.json`。16カテゴリ・表示205語＋非表示180語）を、実データのまま2つのライブラリで表示する。

- `element.html` … Element Plus の階層テーブル（`el-table` の tree data）
- `vuetify.html` … Vuetify の `v-data-table` のグループ化（カテゴリ = グループ）
- `nuxtui.html` … Nuxt UI の `UTable` の tree data（`get-sub-rows`）。Nuxt なしの Vue + Vite で動く

## 使い方

```
npm install
npm run dev      # http://localhost:5173/ に2つのページへのリンクが出る
npm test         # 49テスト（ロジック11＋Element Plus 12＋Vuetify 11＋Nuxt UI 15。jsdom）
npm run build    # 型検査（vue-tsc）＋ビルド
npm run sync-data  # docs/specifications/presets/genre.json を src/data/ にコピー（このフォルダを repo の prototypes/tree-select/ に置いた場合）
```

## 試している要件

| 要件 | 内容 |
|---|---|
| 階層 | カテゴリ → 語の2段。1列目のクリックで、子の開閉ができる |
| 3値 | 各語の行に「使用する／使用しない／未指定」を置く。選択状態は id で持ち、同じ語が複数カテゴリに出る場合（City Pop など）はどこで操作しても同じ状態が変わる（§4-4） |
| 開閉の状態 | 「非表示の語も表示」を切り替えても、開閉の状態は保たれる。検索を始めたら該当カテゴリをすべて開き、検索を消したら、検索前の開閉状態に戻る |
| 検索 | 語名・別名（`aliases`）・英語表記（`term.en`）・カテゴリ名を対象にする。別名は「検索用」の列（Nuxt UI 版では非表示の列）を設けて、その列に対する検索で解決できる。全角半角・大小文字・ひらがな/カタカナを区別しない。一致した行を含むカテゴリだけを残し、自動で開く。検索を消すと元に戻る |
| 表示順 | 各カテゴリ内は `itemOrder` の順（代表項目が先頭） |
| 非表示の語 | 「非表示の語も表示」を入れると、辞典の語（非表示の180語）も出る |

キーボード操作（上下で行移動・左右で開閉）は必須としていない。

## 検証したこと（jsdom）と、していないこと

検証した: 上の表の動作（階層の開閉、検索、3値の同期、並び順）。3つのライブラリとも、テスト（計49）がすべて通る。型検査とビルドも通る。

**していない**（お手元のブラウザで目視してください）:

- 見た目（余白、行の高さ、SelectButton 相当の3値ボタンの収まり、固定ヘッダー、スクロール）
- 実際のブラウザでの性能・操作感、スマホ幅での表示
- アクセシビリティ

## 目視で見つかった不具合（jsdom では検出できない）

Nuxt UI 版を目視したところ、次の2つが見つかり、修正した（利用者の指摘）。どちらも Nuxt UI の制約ではなく、試作の実装の問題。

| 症状 | 原因 | 修正 |
|---|---|---|
| 各行の間に空の行が入る | `UTable` は、展開した行の直後に、展開用の空の行（colspan の `<td>`）を1行足す。`expanded` に `true`（すべて展開）を渡したため、語（葉）の行にも作られた。公式の tree data の例が使う `ui` の指定も入れていなかった | 展開は、残ったカテゴリの key だけを `Record` で渡す。公式の例と同じ `ui`（`empty:p-0` などで空のセルの余白と罫線を消す）を入れる |
| 名前列の「>」が、名前と別の行になる | アイコンがブロック要素として描画された | 名前のセルを `flex items-center gap-1` にする |

さらに、Element Plus と Vuetify では、「非表示の語も表示」を切り替えると開閉の状態がリセットされる不具合が、目視で見つかった（利用者の指摘）。切り替えのたびに、開閉の状態を初期化していたのが原因（Nuxt UI 版は元から保たれていた）。開閉の状態を保つ形に直し、あわせて「検索を消すと検索前の状態に戻る」を3つで同じ挙動にそろえた。Element Plus は、表の `expand-change` で、組み込みの矢印での開閉も追っている。

見た目の確認は目視が必要。jsdom のテストは DOM の構造しか見ない。なお jsdom の `:empty` は、長さ0のテキストノードを空と見なさない（実ブラウザは見なす）ので、テストでは中身が空であることを直接確かめている。

## 実装上の違い（テストで分かったこと）

| 項目 | Element Plus | Vuetify | Nuxt UI |
|---|---|---|---|
| 階層の表現 | 本物の階層データ（`children`）。開閉の矢印が組み込み | グループ化。同じ語を所属カテゴリの数だけ行にする加工が要る。矢印は自前 | 本物の階層データ（`get-sub-rows`。公式に「With tree data」の例がある）。矢印は自前（セルのスロット） |
| 検索 | 組み込みの階層検索はない。データ側で絞る（`shared/tree.ts`） | `search` と `custom-filter` | `global-filter`（TanStack Table）。`global-filter-options` に `filterFromLeafRows: true` を渡すと、子が一致すれば親を残す |
| 別名の検索 | データ側の関数で対応 | `custom-filter` で対応 | **検索用の列を1つ設ける**（非表示でもグローバルフィルタの対象になる）。語の行にはカテゴリ名も入れ、カテゴリ名の一致で配下が残る |
| 自動で開く | `expand-row-keys` にカテゴリの key を渡す | `v-model:opened` にグループ id を渡す | `v-model:expanded` に `true`（すべて開く）を渡す |
| 閉じた行の扱い | **閉じた子行も DOM に置き、`display:none` で隠す**（初期 230行） | 閉じたグループの行は DOM に出さない | 閉じた子行は DOM に出さない |
| 1列目クリックで開閉 | 名前のセルに `toggleRowExpansion(row)` を結線 | グループ見出しの `toggleGroup` を結線 | セルのスロットに `row.toggleExpanded()` を結線 |
| 前提 | なし | なし | Tailwind CSS 4（と vue-router。公式の導入例に沿う場合） |
| ビルド（参考値。Element Plus・Vuetify は全部入り） | JS 902KB（gzip 285KB）＋CSS 361KB（gzip 48KB） | JS 659KB（gzip 209KB）＋CSS 500KB（gzip 68KB） | JS 338KB（gzip 100KB）＋CSS 197KB（gzip 25KB）（使う部品だけが入る） |

ビルドの値は、Element Plus と Vuetify が全コンポーネントを読み込んだ状態、Nuxt UI が使う部品だけの状態の参考値で、公平な比較ではない。実際のアプリでは、前2者も必要な部品だけを読み込むので小さくなる。

## 構成

```
src/
  data/genre.json     genre.json のコピー
  shared/             ライブラリに依存しない部分（データ加工、検索、選択状態）
    types.ts  tree.ts  selection.ts  tree.test.ts
  element/            Element Plus 版（main.ts, App.vue, App.test.ts）
  vuetify/            Vuetify 版（plugin.ts, main.ts, App.vue, App.test.ts）
  nuxtui/             Nuxt UI 版（main.ts, main.css, App.vue, App.test.ts）
```

`shared/` は、どちらのライブラリを採るかに関わらず使える。ライブラリを替えても、データの絞り込み・検索・状態管理は作り直さない。

## バージョン

Vue 3.5.43 / Element Plus 2.14.6 / Vuetify 4.2.1 / Nuxt UI 4.11.1（Tailwind CSS 4.3、TanStack Table 8.21）/ Vite 8 / Vitest 5 / TypeScript 5.9（`package-lock.json` で固定）
