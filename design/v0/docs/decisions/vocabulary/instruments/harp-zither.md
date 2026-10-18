# ハープ・ツィター系（`harp-zither-instrument-family`）

- 作成日: 2026-09-18
- 語数: 8（既定で表示）
- 既定で非表示の語: 2（V-16）
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格、判断ポイント171: 撥弦楽器系の3分割）
- 辞典形式（R-19）を適用（判断ポイント167）

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れは同一語として数える（V-01）。
箏（日本）と古筝（中国）は別語として扱った（判断ポイント2、二胡/胡弓と同型）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| ハープ | ○ | ○ | ○ | ○ | 4 |
| 箏 | ○ | ○ | ○ | ○ | 4 |
| 古筝 | ○ | ○ | ○ | ○ | 4 |
| 古琴 | ○ | ○ | — | ○ | 3 |
| ダルシマー | ○ | ○ | — | ○ | 3 |

### 3資料未満（段階3の審査対象）

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| カヌーン | — | ○ | — | ○ | 2 |
| サントゥール | — | ○ | — | ○ | 2 |
| ツィター（総称） | ○ | — | — | ○ | 2 |
| カンテレ | ○ | — | — | ○ | 2 |
| カヤグム | — | ○ | — | ○ | 2 |
| ライアー、キタラ、箜篌、瑟 他 | — | — | — | ○ | 1（まとめて記録） |

## 段階2: Suno での実績

`../../../research/suno-profile.md` §5-1 生成曲1のスタイル文に「brass **koto** strings」とあり、
**箏（Koto）**が実際にSunoの出力に現れている実績を確認した。箏は段階1で既に通過しているため、
結果には影響しないが、需要の裏付けとして記録する（判断ポイント173）。

他の語（ハープ・古筝等）の総称語としての実績は確認できなかった。
→ 本カテゴリは **代表項目（`represents`）を置かない**（判断ポイント174）。
ハープとツィター（箏・古筝等）は楽器としての系統が異なり（弦を共鳴体に直接張るハープ型／
共鳴体上に平行に張るツィター型）、両方を束ねる自然な総称語が資料にない。
カントリー・フォーク系（`../genres/country-folk.md`、判断ポイント90）と同型の判断。

## 段階3: 2資料以下の語の審査（V-03・V-15）

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| カヌーン | 2 | **追加** | (i) 微分音レバー（マンダル）による独特の音程操作は他語で表せない。(ii) 中東音楽の需要が明確 |
| サントゥール | 2 | **追加** | (i) 打弦（ハンマーで叩く）によるきらびやかな音色はカヌーン（撥弦）と明確に異なる。(ii) ペルシャ・インド音楽の需要が明確 |
| ツィター（総称） | 2 | **追加** | (i) 共鳴箱の上に弦を平行に張る構造による音色は、箏・古筝等の特定地域の様式とは別に「ツィターらしさ」として指定したい需要がある。(ii) 地域を問わない汎用語として、箏・古筝では代替できない（地域・文化の様式を指定せずに使いたい場合） |
| カンテレ | 2 | 追加しない | 資料に明確な音色の記述がなく、需要も不明瞭（`substitutable`: ツィター ＋ 地域・文化の様式） |
| カヤグム | 2 | 追加しない | 古筝と近い構造・音色で、資料に明確な区別の記述がない（`substitutable`: 古筝） |
| 1資料のみの語（ライアー、キタラ、箜篌、瑟、コムンゴ、ツェンバルム 他） | 1 | 追加しない | 既存語と他軸の組み合わせで表現でき、(ii) を満たさない可能性が高い |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a・R-b・R-c に該当する語はない。

## 結果

```json
{
  "items": [
    { "id": "harp", "label": "ハープ", "categories": ["harp-zither-instrument-family"], "term": { "en": "Harp" } },
    { "id": "koto", "label": "箏", "categories": ["harp-zither-instrument-family"], "term": { "en": "Koto" }, "jpNative": true },
    { "id": "guzheng", "label": "古筝", "categories": ["harp-zither-instrument-family"], "term": { "en": "Guzheng" } },
    { "id": "guqin", "label": "古琴", "categories": ["harp-zither-instrument-family"], "term": { "en": "Guqin" } },
    { "id": "dulcimer", "label": "ダルシマー", "categories": ["harp-zither-instrument-family"], "term": { "en": "Dulcimer" } },
    { "id": "qanun", "label": "カヌーン", "categories": ["harp-zither-instrument-family"], "term": { "en": "Qanun" } },
    { "id": "santur", "label": "サントゥール", "categories": ["harp-zither-instrument-family"], "term": { "en": "Santur" } },
    { "id": "zither", "label": "ツィター", "categories": ["harp-zither-instrument-family"], "term": { "en": "Zither" } }
  ]
}
```

## 既定で非表示の語（V-16）

```json
{
  "items": [
    { "id": "kantele", "label": "カンテレ", "categories": ["harp-zither-instrument-family"], "term": { "en": "Kantele" }, "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "ツィター ＋ 地域・文化の様式" } },
    { "id": "gayageum", "label": "カヤグム", "categories": ["harp-zither-instrument-family"], "term": { "en": "Gayageum" }, "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "古筝" } }
  ]
}
```

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 代表項目を置かないと判断した（判断ポイント174）。他カテゴリ（Brass/Strings/Guitar）とは異なる扱いで、カントリー・フォーク系（判断ポイント90）と同型 |
| 2 | 箏（Koto）はSuno自身の出力に実績があり（判断ポイント173）、需要の裏付けとして特筆した |
| 3 | ダルシマーはO・S共に「打弦楽器」としても記述しているが、C・Sの「ツィター系」の分類に多く現れるため本カテゴリに置いた（撥弦楽器系全体としての整理。`../instruments/README.md` §1-2の「弦楽器（擦弦・撥弦・打弦）」の一体的な扱いに従う） |
| 4 | 8語はすべて Suno v6 で未検証（DP-06） |
