# 電気楽器系（`electric-instrument-family`）

- 作成日: 2026-09-18
- 語数: 6（既定で表示。うち2語はギター・ベース系との多重所属）
- 既定で非表示の語: 0
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格、判断ポイント164 判定注記4: 多重所属を許容）
- 辞典形式（R-19）を適用（判断ポイント167）
- 電気で増幅・発音するアコースティック楽器の電化版（エレキギター等）と、電気的な機構そのものが
  発音原理の楽器（エレクトリックピアノ、ハモンドオルガン等）の両方を扱う

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れは同一語として数える（V-01）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| エレキギター | ○ | ○ | ○ | ○ | 4 |
| エレキベース | ○ | ○ | ○ | ○ | 4 |
| エレクトリックピアノ | ○ | ○ | — | ○ | 3 |
| ハモンドオルガン | ○ | ○ | — | ○ | 3 |

### 3資料未満（段階3の審査対象）

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| ペダルスティールギター | ○ | — | — | ○ | 2 |
| クラビネット | — | — | — | ○ | 1（一般的な知識により審査対象に追加。判断ポイント184と同型の拡張運用） |

## 段階2: Suno での実績

`../../../research/suno-profile.md` を確認したが、本カテゴリの語に総称・個別とも実績は確認できなかった。
→ 段階2 での追加はなし。代表項目も**置かない**（判断ポイント187。エレキギター・ベースのような
アコースティック楽器の電化版と、ハモンドオルガンのような電気機構そのものが発音原理の楽器が
混在するカテゴリで、両方を束ねる自然な総称語が資料にない）。

## 段階3: 2資料以下の語の審査（V-03・V-15）

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| ペダルスティールギター | 2 | **追加** | (i) ペダルによるピッチベンドが生む独特の泣くようなスライド音は通常のエレキギターでは表せない。(ii) カントリー・ハワイアン音楽の需要が明確で代替不可（`../genres/country-folk.md`） |
| クラビネット | 1 | **追加** | (i) 金属タインを叩く機構による打楽器的でファンキーな音色は、エレクトリックピアノとは明確に異なる。(ii) ファンク系の需要が明確で代替不可（一般的な知識による判定） |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a・R-b・R-c に該当する語はない。

## 結果

エレキギター・エレキベースはギター・ベース系（`guitar-bass.md`）ですでに審査済みのため、
新しい `id` は作らず、既存の項目に本カテゴリのタグを追加する多重所属とした
（判断ポイント164 判定注記4、判断ポイント35）。`guitar-bass.md` 側の JSON も合わせて更新する。

```json
{
  "items": [
    { "id": "electric-guitar", "label": "エレキギター", "categories": ["guitar-bass-instrument-family", "electric-instrument-family"], "term": { "en": "Electric Guitar" } },
    { "id": "electric-bass", "label": "エレキベース", "categories": ["guitar-bass-instrument-family", "electric-instrument-family"], "term": { "en": "Electric Bass" } },
    { "id": "electric-piano", "label": "エレクトリックピアノ", "categories": ["electric-instrument-family"], "term": { "en": "Electric Piano" }, "aliases": ["Rhodes", "Wurlitzer"] },
    { "id": "hammond-organ", "label": "ハモンドオルガン", "categories": ["electric-instrument-family"], "term": { "en": "Hammond Organ" } },
    { "id": "pedal-steel-guitar", "label": "ペダルスティールギター", "categories": ["electric-instrument-family"], "term": { "en": "Pedal Steel Guitar" } },
    { "id": "clavinet", "label": "クラビネット", "categories": ["electric-instrument-family"], "term": { "en": "Clavinet" } }
  ]
}
```

## 既定で非表示の語（V-16）

該当なし。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | エレキギター・エレキベースの `id` は `guitar-bass.md` のものをそのまま使い、`categories` に本カテゴリを追加した（多重所属。新しい id を発行しない） |
| 2 | 代表項目を置かない（判断ポイント187） |
| 3 | 6語はすべて Suno v6 で未検証（DP-06） |
