# ギター・ベース系（`guitar-bass-instrument-family`）

- 作成日: 2026-09-18
- 語数: 11（既定で表示）
- 既定で非表示の語: 1（V-16）
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格、判断ポイント171: 撥弦楽器系の3分割）
- 辞典形式（R-19）を適用（判断ポイント167）

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れは同一語として数える（V-01）。
O は「クラシック／アコースティックギター（ナイロン/スチール弦）」と併記しているため、
ナイロン弦・スチール弦の両方に1回ずつ数える（V-01の併記の扱い）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| クラシックギター（ナイロン弦） | ○ | ○ | ○ | ○ | 4 |
| スティール弦アコースティックギター | ○ | ○ | ○ | ○ | 4 |
| エレキギター | ○ | ○ | ○ | ○ | 4 |
| エレキベース | ○ | ○ | ○ | ○ | 4 |
| マンドリン | ○ | ○ | ○ | ○ | 4 |
| バンジョー | — | ○ | ○ | ○ | 3 |

### 3資料未満（段階3の審査対象）

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| ウクレレ | — | ○ | — | ○ | 2 |
| フラメンコギター | ○ | — | — | ○ | 2 |
| 12弦ギター | ○ | — | — | ○ | 2 |
| レゾネーターギター（ドブロ） | ○ | — | — | ○ | 2 |
| ブズーキ | ○ | — | — | ○ | 2 |
| 多弦ギター（7〜9弦以上）、バリトンギター、フレットレスギター 他 | ○ | — | — | — | 1（まとめて記録） |

## 段階2: Suno での実績

`../../../research/suno-profile.md` を確認したが、Suno 自身が書き換えたスタイル文に
ギター・ベース系の楽器名（個別・総称とも）は現れなかった。H-07検証の除外欄の例に
`‑electric guitar` があるが、これは**利用者が除外を指示した入力**であり、Suno が
生成・付加した実績ではない。→ 段階2 での追加はなし。

## 段階3: 2資料以下の語の審査（V-03・V-15）

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| ウクレレ | 2 | **追加** | (i) 短いスケールとナイロン弦による明るく軽やかな音色はクラシックギターでは代替できない。(ii) ハワイアン・トロピカル系の需要が明確 |
| フラメンコギター | 2 | **追加** | (i) ゴルペ（打面奏法）・ラスゲアード奏法によるパーカッシブな音像はクラシックギターと明確に異なる。(ii) 奏法を表す軸がないため代替できない |
| 12弦ギター | 2 | **追加** | (i) 複弦によるコーラス感・きらめきのある音色は単弦ギターでは表せない。(ii) 他軸（質感・音質）でも打ち消せない |
| レゾネーターギター（ドブロ） | 2 | **追加** | (i) 金属製共鳴コーンによる硬質で伸びのある音色はアコースティックギターと明確に異なる。(ii) ブルース・カントリー系の需要が明確（`../genres/blues.md`・`../genres/country-folk.md` との整合） |
| ブズーキ | 2 | 追加しない | 資料に明確な音色の記述がなく、マンドリンと地域・文化の様式の組み合わせで代替できる（`substitutable`: マンドリン ＋ 地域・文化の様式） |
| 1資料のみの語（多弦ギター、バリトンギター、フレットレスギター、MIDIギター、シンセギター 他） | 1 | 追加しない | 既存語と他軸の組み合わせで表現でき、(ii) を満たさない可能性が高い |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a・R-b に該当する語はない。R-c（Guitar と個々のギターの関係）は、
他カテゴリの代表項目（Brass、Strings）と同様に代表項目として扱い、除外しない。

## 結果

代表項目 Guitar は、資料の見出し名（C「ギター系」、S「ギター系統」）から採用した
（Suno実績ではなく、ジャンルの `Cinematic` 等と同じ「最上位の見出し名」による判断。判断ポイント172）。

```json
{
  "items": [
    { "id": "guitar", "label": "Guitar", "categories": ["guitar-bass-instrument-family"], "represents": "guitar-bass-instrument-family", "aliases": ["ギター"] },
    { "id": "classical-guitar", "label": "クラシックギター", "categories": ["guitar-bass-instrument-family"], "term": { "en": "Classical Guitar" }, "aliases": ["ナイロン弦ギター"] },
    { "id": "steel-string-acoustic-guitar", "label": "スティール弦アコースティックギター", "categories": ["guitar-bass-instrument-family"], "term": { "en": "Steel-string Acoustic Guitar" } },
    { "id": "electric-guitar", "label": "エレキギター", "categories": ["guitar-bass-instrument-family", "electric-instrument-family"], "term": { "en": "Electric Guitar" } },
    { "id": "electric-bass", "label": "エレキベース", "categories": ["guitar-bass-instrument-family", "electric-instrument-family"], "term": { "en": "Electric Bass" } },
    { "id": "mandolin", "label": "マンドリン", "categories": ["guitar-bass-instrument-family"], "term": { "en": "Mandolin" } },
    { "id": "banjo", "label": "バンジョー", "categories": ["guitar-bass-instrument-family"], "term": { "en": "Banjo" } },
    { "id": "ukulele", "label": "ウクレレ", "categories": ["guitar-bass-instrument-family"], "term": { "en": "Ukulele" } },
    { "id": "flamenco-guitar", "label": "フラメンコギター", "categories": ["guitar-bass-instrument-family"], "term": { "en": "Flamenco Guitar" } },
    { "id": "12-string-guitar", "label": "12弦ギター", "categories": ["guitar-bass-instrument-family"], "term": { "en": "12-string Guitar" } },
    { "id": "resonator-guitar", "label": "レゾネーターギター", "categories": ["guitar-bass-instrument-family"], "term": { "en": "Resonator Guitar" }, "aliases": ["ドブロ", "Dobro"] }
  ]
}
```

## 既定で非表示の語（V-16）

```json
{
  "items": [
    { "id": "bouzouki", "label": "ブズーキ", "categories": ["guitar-bass-instrument-family"], "term": { "en": "Bouzouki" }, "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "マンドリン ＋ 地域・文化の様式" } }
  ]
}
```

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 代表項目 Guitar の根拠は、Brass・Strings（段階2のSuno実績）とは異なり、資料の見出し名による判断（判断ポイント172）。ギター・ベース系ではSuno実績が確認できなかったため |
| 2 | クラシックギター（ナイロン弦）とスティール弦アコースティックギターは、Oが1項目として併記しているが、実際の音色差が大きいため別語として扱った（判断ポイント4「曖昧な語はラベル自体も区別する」の趣旨、`../../presets.md` §2-4） |
| 3 | エレキギター・エレキベースは電気楽器系（`electric-instrument-family`）にも多重所属とした（判断ポイント187、`electric.md`）（`../README.md` §1-4の暫定保留） |
| 4 | 11語はすべて Suno v6 で未検証（DP-06） |
