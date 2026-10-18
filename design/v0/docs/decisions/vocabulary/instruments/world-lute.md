# 世界のリュート系（`world-lute-instrument-family`）

- 作成日: 2026-09-18
- 語数: 12（既定で表示）
- 既定で非表示の語: 1（V-16）
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格、判断ポイント171: 撥弦楽器系の3分割）
- 辞典形式（R-19）を適用（判断ポイント167）
- マンドリン・バンジョー・ブズーキ系統（西洋のフレット付き撥弦リュート）は `guitar-bass.md` で審査済みのため、本カテゴリでは扱わない

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れは同一語として数える（V-01）。
琵琶（日本のBiwa／中国のPipa）は、Oのみ地域別に分けて記述するが他3資料は一体的に扱うため、
1語として集計した（判断ポイント175。箏/古筝とは異なる扱い）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| ウード | ○ | ○ | ○ | ○ | 4 |
| シタール | ○ | ○ | ○ | ○ | 4 |
| コラ | ○ | ○ | ○ | ○ | 4 |
| 三味線 | ○ | ○ | ○ | ○ | 4 |
| サロード | ○ | ○ | — | ○ | 3 |
| 琵琶 | ○ | ○ | — | ○ | 3 |
| チャランゴ | — | ○ | ○ | ○ | 3 |
| バラライカ | ○ | ○ | — | ○ | 3 |
| サズ（バーラマ） | ○ | ○ | — | ○ | 3 |

### 3資料未満（段階3の審査対象）

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| タンプーラ（タンブーラ） | — | ○ | — | ○ | 2 |
| 三線 | ○ | — | — | ○ | 2 |
| リュート（欧州古楽器） | ○ | — | — | ○ | 2 |
| テオルボ | ○ | — | — | ○ | 2 |
| ンゴニ、ルバーブ、ゴッタン、トンコリ、ヴィーナ 他 | — | — | — | ○ | 1（まとめて記録） |

## 段階2: Suno での実績

`../../../research/suno-profile.md` を確認したが、本カテゴリの語（個別・総称とも）は
Suno自身が書き換えたスタイル文に現れなかった。→ 段階2 での追加はなし。

代表項目についても、ハープ・ツィター系（判断ポイント174）と同じ理由で**置かない**（判断ポイント176）。
日本・中東・南アジア・アフリカ・欧州の各地の民族リュートを束ねる自然な総称語が資料にない。

## 段階3: 2資料以下の語の審査（V-03・V-15）

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| タンプーラ | 2 | **追加** | (i) 常時鳴らし続けるドローン専用の楽器で、旋律を奏でるシタール・サロードとは機能・音像が明確に異なる。(ii) 他語では代替できない独自の役割 |
| 三線 | 2 | **追加** | (i) 蛇皮の胴による三味線とは異なる乾いた高音質の音色。(ii) 沖縄の音楽的文脈は三味線では代替できない（地域・文化の様式との組み合わせでも、楽器自体が異なるため） |
| リュート（欧州古楽器） | 2 | **追加** | (i) フレット付きの構造とガット弦による温かい音色は、フレットのないウードとは明確に異なる。(ii) 欧州ルネサンス・バロック音楽の需要が明確 |
| テオルボ | 2 | 追加しない | 低音域を拡張した大型リュートという差はあるが、資料に音色の記述が薄く、需要も限定的（`substitutable`: リュート） |
| 1資料のみの語（ンゴニ、ルバーブ、ゴッタン、トンコリ、ヴィーナ 他） | 1 | 追加しない | 既存語と他軸の組み合わせで表現でき、(ii) を満たさない可能性が高い |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a・R-b・R-c に該当する語はない。

## 結果

```json
{
  "items": [
    { "id": "oud", "label": "ウード", "categories": ["world-lute-instrument-family"], "term": { "en": "Oud" } },
    { "id": "sitar", "label": "シタール", "categories": ["world-lute-instrument-family"], "term": { "en": "Sitar" } },
    { "id": "kora", "label": "コラ", "categories": ["world-lute-instrument-family"], "term": { "en": "Kora" } },
    { "id": "shamisen", "label": "三味線", "categories": ["world-lute-instrument-family"], "term": { "en": "Shamisen" }, "jpNative": true },
    { "id": "sarod", "label": "サロード", "categories": ["world-lute-instrument-family"], "term": { "en": "Sarod" } },
    { "id": "biwa", "label": "琵琶", "categories": ["world-lute-instrument-family"], "term": { "en": "Biwa / Pipa" }, "jpNative": true },
    { "id": "charango", "label": "チャランゴ", "categories": ["world-lute-instrument-family"], "term": { "en": "Charango" } },
    { "id": "balalaika", "label": "バラライカ", "categories": ["world-lute-instrument-family"], "term": { "en": "Balalaika" } },
    { "id": "saz", "label": "サズ", "categories": ["world-lute-instrument-family"], "term": { "en": "Saz" }, "aliases": ["バーラマ", "Bağlama"] },
    { "id": "tanpura", "label": "タンプーラ", "categories": ["world-lute-instrument-family"], "term": { "en": "Tanpura" }, "aliases": ["タンブーラ"] },
    { "id": "sanshin", "label": "三線", "categories": ["world-lute-instrument-family"], "term": { "en": "Sanshin" }, "jpNative": true },
    { "id": "lute", "label": "リュート", "categories": ["world-lute-instrument-family"], "term": { "en": "Lute" } }
  ]
}
```

## 既定で非表示の語（V-16）

```json
{
  "items": [
    { "id": "theorbo", "label": "テオルボ", "categories": ["world-lute-instrument-family"], "term": { "en": "Theorbo" }, "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "リュート" } }
  ]
}
```

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 代表項目を置かない（判断ポイント176）。ハープ・ツィター系（判断ポイント174）と同型 |
| 2 | 琵琶は地域（日本/中国）で語を分けなかった（判断ポイント175）。箏/古筝を分けた判断（判断ポイント2）とは逆だが、資料の大半（C・S）が一体的に扱っており、分ける根拠が弱いため |
| 3 | マンドリン・バンジョー・ブズーキ系統は `guitar-bass.md` で審査済み。本カテゴリでは重複して扱わない（撥弦楽器系全体の3分割、判断ポイント171の境界に従う） |
| 4 | 12語はすべて Suno v6 で未検証（DP-06） |

---

これで撥弦楽器系（`string-plucked-instrument-family`、判断ポイント171の3分割）が全て完了した。
ギター・ベース系11語＋ハープ・ツィター系8語＋世界のリュート系12語＝表示31語（非表示4語）。
