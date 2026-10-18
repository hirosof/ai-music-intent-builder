# 06. メタル系の語彙と presets.md の分割

- 日付: 2026-09-17
- 参加: hirosof / Claude（Opus 5）
- 思考モード: 厳密構成モード（スレッド全体）

前提: `05_vocabulary-pop-family.md`（ポップス系・カテゴリの骨格・見出しの対応表・ロック系）

---

## 1. メタル系

### 結果

12語。詳細は `decisions/vocabulary/genres/metal.md`。

- 段階1通過: 11語（Heavy Metal、Thrash、Power、Symphonic、Death、Black、Doom、Folk、Viking、Nu Metal、Metalcore）
- 段階3で追加: Melodic Death Metal、Djent
- 段階4a で除外: Viking Metal（R-c。O と S が Folk Metal と併記）
- `term`: なし

### 論点（既定値で承認）

| # | 論点 | 既定値 | 判断ポイント |
|---|---|---|---|
| 1 | 代表項目 Heavy Metal が下位様式（正統派）の名前と同じになる | Heavy Metal を代表項目とする | 42 |
| 2 | Death Metal / Black Metal に R-b を適用するか | 適用しない | 43 |
| 3 | Progressive Metal を採らず Melodic Death Metal と Djent を採る扱いの差 | 受け入れる | 44 |
| 4 | メタル系の独立（V-12）の見直し | 独立を維持する | 45 |

### 注目点

代表項目の名前が下位様式の名前と一致する問題は、Pop / Rock のような一般名では起きず、
メタル系で初めて表面化した。今後、エレクトロニック系（EDM / Electronic）や
クラシック系（Classical は時代様式名でもある）でも同種の問題が出る可能性がある。

---

## 2. presets.md の分割

### 提起

> 案は採用でいいのですが、「presets.md」が他のファイルに比べて肥大化してきていますね。

### 状況

- `presets.md` は 63KB で、2番目に大きい `request-text.md`（33KB）の約2倍
- 残り13カテゴリを同じ形式で追記すると 150KB 前後になる見込み
- 判断ポイント25 は「全カテゴリが揃った時点で分割を再検討する」だったが、
  後になるほど移動量と修正する参照が増えるため、この時点で見直した

`presets.md` には更新頻度の違う3種類の内容が同居していた。

| 内容 | 更新頻度 |
|---|---|
| 選択肢の設計（§0〜§9） | ほぼ固まっている |
| 語彙の選定方法（§10、§12-0） | ときどき細則が増える |
| カテゴリ別の語彙（§12-1 以降） | カテゴリごとに増え続ける |

### 検討

| 案 | 構成 | 評価 |
|---|---|---|
| **A（採用）** | 設計 / 選定方法 / カテゴリ別（1カテゴリ1ファイル） | 更新頻度ごとに分かれる。カテゴリを追加しても既存ファイルは膨らまない |
| B | 設計 / 語彙（方法とカテゴリ別をまとめる） | 語彙ファイルが同じように肥大化する |
| C | 分割しない | 判断ポイント25 の既定。見込みから不適 |

### 判断

案A を採用（判断ポイント41）。

```
decisions/
├── presets.md                  選択肢の設計（旧 §0〜§9）
└── vocabulary/
    ├── README.md               選定の方針・細則・カテゴリの骨格・対応表・判断ポイント・進捗
    └── genres/
        ├── pop.md              旧 §12-1
        ├── rock.md             旧 §12-2
        └── metal.md            新規
```

### 分割時の扱い

| 論点 | 扱い | 理由 |
|---|---|---|
| 判断ポイントの番号 | 振り直さない。`presets.md` §6 と `vocabulary/README.md` §5 で通し番号とする | 他のドキュメント・議論ログが番号で参照している |
| 残す判断ポイント | データ構造と UI に関わる 1〜16・19〜22 を `presets.md` に残す | 設計に属する |
| 移す判断ポイント | 17・18・23〜40 を移し、41〜45 を新規に追加 | 語彙に属する |
| 楽器などの語彙 | `vocabulary/` に `instruments/` などを並べる | `genres/` を挟んだ理由 |
| 議論ログの節番号参照 | 書き換えない（追記のみのルール）。`05` の「§10-4」「§12-1」などは分割前の `presets.md` の節番号を指す | `presets.md` §10 と `vocabulary/README.md` §0 に対応表を置いた |

分割は内容を変えない移動として行った。ただし次の最小限の修正を伴う。

- 相対パスの修正（`../research/` → `../../research/` など）
- 節番号による参照を、ファイル名による参照に置き換え
- `presets.md` §6 の判断ポイント25 の既定を「分割した」に更新（`vocabulary/README.md` §5）
- 判断ポイント39・40 の例に、メタル系の語（メロデス、Doom Metal）を追加

### 運用の追加

`docs/README.md` §5（新しいスレッドの始め方）に、
`decisions/vocabulary/README.md` を読む順序の8番目に追加し、
カテゴリ別ファイルは冒頭で読ませず、議題に関係するカテゴリだけ指定して読ませる方針を追記した。

---

## 3. 反映先

| ファイル | 内容 |
|---|---|
| `decisions/presets.md` | 設計部分のみに再構成。§6 に移動先の案内、§10 に分割の案内 |
| `decisions/vocabulary/README.md` | 新規。旧 §10・§11・§12-0 と判断ポイント17・18・23〜45、進捗 |
| `decisions/vocabulary/genres/pop.md` | 新規（旧 §12-1） |
| `decisions/vocabulary/genres/rock.md` | 新規（旧 §12-2） |
| `decisions/vocabulary/genres/metal.md` | 新規 |
| `decisions/README.md` | ドキュメント一覧、V-xx の参照先、判断ポイントの件数、次のステップ |
| `decisions/input-items.md` | 語彙の参照先 |
| `docs/README.md` | ディレクトリ構成、読む順序、スレッドの始め方、進捗 |
