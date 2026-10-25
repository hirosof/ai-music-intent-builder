# 時間的な構造（軸E）の語彙

- 作成日: 2026-09-18
- 対象項目: `../input-items.md` グループ5「テンポ感」「展開の形」「構成（セクションの並び）」
- 「長さ」（Auto/カスタム秒数）と「BPMの目安」（数値）はUI設定・数値入力のため、本ファイルの語彙化の対象外
- 資料の方針: 専用資料なし。`../../research/suno-profile.md` の実例（Sunoが実際に書き換えたスタイル文）と
  `../input-items.md` 自体の記述を主な材料とする
- 辞典形式（R-19）を適用（判断ポイント167・190・192・194の方針を継続。判断ポイント200）

---

## 1. テンポ感

代表項目は置かない（各段階は独立した選択肢）。専用資料・Suno実績による裏付けはなく、
一般的な5段階の速度感を採用した（一般的な知識による判定）。

```json
{
  "items": [
    { "id": "very-slow", "label": "とても遅い", "categories": ["tempo-feel"], "term": { "en": "very slow" } },
    { "id": "slow",      "label": "遅い",       "categories": ["tempo-feel"], "term": { "en": "slow" } },
    { "id": "moderate",  "label": "中程度",     "categories": ["tempo-feel"], "term": { "en": "moderate tempo" } },
    { "id": "fast",      "label": "速い",       "categories": ["tempo-feel"], "term": { "en": "fast" } },
    { "id": "very-fast", "label": "とても速い", "categories": ["tempo-feel"], "term": { "en": "very fast" } }
  ]
}
```

## 2. 展開の形

`../../research/suno-profile.md` の実例を根拠に含む。

| 語 | 根拠 |
|---|---|
| 一定を保つ・ループ向き | `../input-items.md` グループ5の記述「ループ用途なら『一定を保つ』寄り」（設計時の明示的な言及） |
| 静かに始まり盛り上がる | `../../research/suno-profile.md` §5-1 の実例「restrained minor-key opening through dramatic dynamic swells」（抑制された導入から劇的な強弱の高まりへ）と一致する型 |
| 山型（起承転結） | 一般的な知識による。導入・展開・頂点・収束という楽曲構成の典型 |
| 起伏を繰り返す | 一般的な知識による。単調にならないループの代替案として需要が見込まれる |

```json
{
  "items": [
    { "id": "steady",         "label": "一定を保つ・ループ向き", "categories": ["development-shape"], "term": { "en": "steady, loop-friendly" } },
    { "id": "quiet-to-swell", "label": "静かに始まり盛り上がる", "categories": ["development-shape"], "term": { "en": "quiet opening building to a swell" } },
    { "id": "arc",            "label": "山型（起承転結）",       "categories": ["development-shape"], "term": { "en": "rise-and-fall arc" } },
    { "id": "wave",           "label": "起伏を繰り返す",         "categories": ["development-shape"], "term": { "en": "repeating waves of dynamics" } }
  ]
}
```

代表項目は置かない。既定で非表示の語は該当なし。

## 3. 構成（セクションの並び）

並び替え可能なリストの部品となるセクション名。歌入りの音楽の「Aメロ/Bメロ/サビ」ではなく、
インスト曲を主対象とする本ツールの用途（ゲームBGM等のループ再生を含む）に合わせた名称とした
（一般的な知識による判定。専用資料・Suno実績の裏付けはない）。

```json
{
  "items": [
    { "id": "intro",     "label": "イントロ",     "categories": ["section"], "term": { "en": "intro" } },
    { "id": "theme",     "label": "主題提示",     "categories": ["section"], "term": { "en": "main theme" } },
    { "id": "development","label": "展開部",      "categories": ["section"], "term": { "en": "development" } },
    { "id": "interlude", "label": "間奏",         "categories": ["section"], "term": { "en": "interlude" } },
    { "id": "climax",    "label": "クライマックス", "categories": ["section"], "term": { "en": "climax" } },
    { "id": "bridge",    "label": "ブリッジ（つなぎ）", "categories": ["section"], "term": { "en": "bridge" } },
    { "id": "outro",     "label": "アウトロ",     "categories": ["section"], "term": { "en": "outro" } }
  ]
}
```

## 既定で非表示の語（V-16）

該当なし。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | テンポ感・構成のセクション名は専用資料・Suno実績の裏付けがなく、一般的な知識による判定（用途・情緒等と同型の透明性を保つための明示） |
| 2 | 展開の形の一部（一定を保つ、静かに始まり盛り上がる）は、入力項目設計自体の記述・Sunoの実際の出力と一致する根拠がある |
| 3 | すべて Suno v6 で個別の語としては未検証（DP-06）。展開の形の「静かに始まり盛り上がる」型は`../../research/suno-profile.md` §5-1 の観察と整合する |
