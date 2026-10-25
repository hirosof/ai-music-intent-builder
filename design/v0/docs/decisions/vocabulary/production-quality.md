# 制作・質感（軸F）の語彙

- 作成日: 2026-09-18
- 対象項目: `../input-items.md` グループ6「空間の質感」「音質・録音の質感」「ミックスの方向性」
- 資料の方針: 専用資料なし。`../../research/suno-profile.md`（Sunoが実際に書き換えたスタイル文の観察）を
  主な材料とする。`../input-items.md` 自体が「Suno が書き換えたスタイルには必ず残響やミックスの記述が
  含まれる」と明記しており、他の軸より実例による裏付けが厚い
- 辞典形式（R-19）を適用（判断ポイント167・190・192・194・200の方針を継続。判断ポイント201）
- **空間の質感・音質・ミックスの方向性は自由記述の逃げ道がない（`../input-items.md` 判断ポイント8）**。地域・情緒・用途・展開の形と違い、選択肢にない組み合わせは現状の語彙では指定できない。この性質を踏まえ、初版（14語）を見直し、カバレッジの穴を埋める語を追加した（判断ポイント202。§4）

---

## 1. 空間の質感

`../../research/suno-profile.md` §5-1・生成後のスタイル文の観察を根拠とする。
見直しで屋外・タイトな部屋の2語を追加した（§4）。

| 語 | 根拠 |
|---|---|
| ドライ・残響なし | 一般的な知識による（対比のための基本形） |
| 自然な響き | `../input-items.md` グループ6の既定値（③の既定）。実例に直接の裏付けはないが設計上の既定 |
| タイトな小部屋 | 見直しで追加（§4）。ドライと自然な響きの中間。収録ブースのような制御された狭い空間 |
| 広がりのあるホール | §5-1「wide choral hall reverb」、生成後の観察「wide choral hall reverb」 |
| 荘厳な礼拝堂的残響 | §5-1「広大な礼拝的リバーブ」「cinematic studio reverb」 |
| 屋外・開放的な響き | 見直しで追加（§4）。ホールの人工的な反射音とは異なる、野外の拡散した響き |
| 親密でクローズド | 一般的な知識による（対比としての需要） |

```json
{
  "items": [
    { "id": "dry",          "label": "ドライ・残響なし",     "categories": ["spatial-texture"], "term": { "en": "dry, no reverb" } },
    { "id": "natural",      "label": "自然な響き",           "categories": ["spatial-texture"], "term": { "en": "natural room ambience" } },
    { "id": "tight-room",   "label": "タイトな小部屋",       "categories": ["spatial-texture"], "term": { "en": "tight small room" } },
    { "id": "spacious-hall","label": "広がりのあるホール",   "categories": ["spatial-texture"], "term": { "en": "wide hall reverb" } },
    { "id": "cathedral",    "label": "荘厳な礼拝堂的残響",   "categories": ["spatial-texture"], "term": { "en": "grand cathedral reverb" } },
    { "id": "outdoor",      "label": "屋外・開放的な響き",   "categories": ["spatial-texture"], "term": { "en": "open-air outdoor ambience" } },
    { "id": "intimate",     "label": "親密でクローズド",     "categories": ["spatial-texture"], "term": { "en": "intimate, close-mic'd" } }
  ]
}
```

## 2. 音質・録音の質感

`../../research/suno-profile.md`・`../../examples/suno-test-03-village-town-city.md` の
実例を根拠に含む。見直しでヴィニール・ラジオの2語を追加した（§4）。

| 語 | 根拠 |
|---|---|
| クリアなスタジオ品質 | `../input-items.md` グループ6の既定値（②の既定） |
| ヴィンテージ・アナログ質感 | `suno-test-03-village-town-city.md`「subtle tape warmth」「控えめなテープヒス」 |
| ヴィニール・レコード風 | 見直しで追加（§4）。ヴィンテージ・アナログ質感（テープ）とは別の、レコード特有のスクラッチノイズ・ポップ音 |
| ローファイ | `suno-test-03-village-town-city.md`「12-bit sample texture with crunchy lo-fi transients」「lo-fi sampler grain」 |
| チップチューン・8/16bit風 | `suno-test-03-village-town-city.md`「16-bit game-console mix」 |
| ラジオ・帯域制限風 | 見直しで追加（§4）。中域に絞られた電話・ラジオ的な質感。ローファイとは異なり帯域そのものを狭める効果 |
| ライブ録音風 | 一般的な知識による（対比としての需要） |

```json
{
  "items": [
    { "id": "clean-studio", "label": "クリアなスタジオ品質",     "categories": ["recording-texture"], "term": { "en": "clean studio quality" } },
    { "id": "vintage-tape", "label": "ヴィンテージ・アナログ質感", "categories": ["recording-texture"], "term": { "en": "vintage analog tape warmth" } },
    { "id": "vinyl",        "label": "ヴィニール・レコード風",   "categories": ["recording-texture"], "term": { "en": "vinyl crackle" } },
    { "id": "lofi",         "label": "ローファイ",               "categories": ["recording-texture"], "term": { "en": "lo-fi" } },
    { "id": "chiptune-bit", "label": "チップチューン・8/16bit風", "categories": ["recording-texture"], "term": { "en": "chiptune, 8/16-bit console" } },
    { "id": "radio",        "label": "ラジオ・帯域制限風",       "categories": ["recording-texture"], "term": { "en": "radio, band-limited" } },
    { "id": "live",         "label": "ライブ録音風",             "categories": ["recording-texture"], "term": { "en": "live recording feel" } }
  ]
}
```

## 3. ミックスの方向性

`../../research/suno-profile.md` の実例を根拠に含む。
見直しで密度の高いミックス・リード楽器前面の2語を追加した（§4）。

| 語 | 根拠 |
|---|---|
| 自然な | `../input-items.md` グループ6の既定値（②の既定） |
| パンチの効いた・力強い | §5-1「powerful climactic accents」「荘厳なスタジオミックス」 |
| ワイドで広がりのある | `suno-test-03-village-town-city.md`「ワイドなステレオパッドとクリアなデジタルミックス」 |
| 密度が高く層が厚い | 見直しで追加（§4）。クリーンでミニマルの対極として、音数・層を重ねた濃密なミックスの需要 |
| リード楽器を前面に出す | 見直しで追加（§4）。主旋律の楽器を際立たせ、伴奏を控えめにするミックスの方向性 |
| クリーンでミニマル | `suno-test-03-village-town-city.md`「clean electronic drums」 |

```json
{
  "items": [
    { "id": "natural-mix", "label": "自然な",                 "categories": ["mix-direction"], "term": { "en": "natural" } },
    { "id": "punchy",      "label": "パンチの効いた・力強い", "categories": ["mix-direction"], "term": { "en": "punchy, powerful" } },
    { "id": "wide",        "label": "ワイドで広がりのある",   "categories": ["mix-direction"], "term": { "en": "wide, spacious" } },
    { "id": "dense",       "label": "密度が高く層が厚い",     "categories": ["mix-direction"], "term": { "en": "dense, layered" } },
    { "id": "lead-forward","label": "リード楽器を前面に出す", "categories": ["mix-direction"], "term": { "en": "lead-forward" } },
    { "id": "clean-minimal","label": "クリーンでミニマル",     "categories": ["mix-direction"], "term": { "en": "clean, minimal" } }
  ]
}
```

## 既定で非表示の語（V-16）

該当なし。

## 4. カバレッジの見直し（判断ポイント202）

自由記述の逃げ道がないという性質を踏まえ、利用者の指摘を受けて初版（空間5・音質5・ミックス4の14語）を
見直した。各項目で「今の語では表せない組み合わせ」を検討し、6語を追加した（空間+2・音質+2・ミックス+2）。

| # | 見落としていた組み合わせの例 | 追加した語 |
|---|---|---|
| 1 | 「デッドで固いスタジオ収録」のような、ドライでも自然でもない中間の狭い空間 | 空間: タイトな小部屋 |
| 2 | 森・草原のような、ホールの人工的な反射とは異なる自然な開放感 | 空間: 屋外・開放的な響き |
| 3 | テープではなく、アナログレコード特有のスクラッチノイズ・ポップ音 | 音質: ヴィニール・レコード風 |
| 4 | ローファイ（サンプルレート等の劣化）とは別の、帯域そのものを狭める電話・ラジオ的な質感 | 音質: ラジオ・帯域制限風 |
| 5 | クリーンでミニマルの対極にある、音数の多い濃密なミックス | ミックス: 密度が高く層が厚い |
| 6 | 主旋律の楽器を際立たせたい（伴奏を控えめにしたい）という需要 | ミックス: リード楽器を前面に出す |

これで3項目とも表示語数は 20語（空間7・音質7・ミックス6）になった。専用資料がないため、
この6語も一般的な知識による判定であり、資料・Suno実績の裏付けはない（判定の注記5）。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 3項目とも代表項目は置かない。各語は独立した選択肢で、束ねる総称語の概念がない |
| 2 | `../input-items.md` グループ6自体が「Suno が書き換えたスタイルには必ず残響やミックスの記述が含まれており、指定しなくても何かが決まる」と明記しており、本軸は他の軸（用途・情緒等）より実例による裏付けが厚い |
| 3 | ドライ・親密でクローズド・ライブ録音風は対比のための一般的な知識による追加で、Suno実績の直接の裏付けはない |
| 4 | すべて Suno v6 で個別の語としては未検証（DP-06）。ただし空間の質感・音質の多くはSuno自身の出力に現れたフレーズを根拠にしている点で、他の多くの軸の語彙より根拠が強い |
| 5 | §4 で追加した6語（タイトな小部屋、屋外・開放的な響き、ヴィニール・レコード風、ラジオ・帯域制限風、密度が高く層が厚い、リード楽器を前面に出す）は一般的な知識による判定。自由記述の逃げ道がないという本軸の性質上、他の軸より広めに見込んで追加した |
