# 民族・ワールド打楽器系（`percussion-world-instrument-family`）

- 作成日: 2026-09-18
- 語数: 17（既定で表示）
- 既定で非表示の語: 0
- 手順・細則・略号: `../README.md`、`../instruments/README.md`（楽器の骨格、判断ポイント179: 打楽器系の3分割）
- 辞典形式（R-19）を適用（判断ポイント167）

---

## 段階1: 3資料以上に登場する語

値は各資料での言及の有無（○＝あり、—＝なし）。表記揺れは同一語として数える（V-01）。

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| 太鼓 | ○ | ○ | ○ | ○ | 4 |
| ジャンベ | ○ | ○ | ○ | ○ | 4 |
| コンガ | ○ | ○ | — | ○ | 3 |
| カホン | ○ | ○ | — | ○ | 3 |
| ギロ | ○ | ○ | — | ○ | 3 |
| マラカス | ○ | ○ | — | ○ | 3 |
| クラーベ | ○ | ○ | — | ○ | 3 |

### 3資料未満（段階3の審査対象）

| 語 | C | O | G | S | 数 |
|---|---|---|---|---|---|
| ボンゴ | ○ | — | — | ○ | 2 |
| カリンバ | — | ○ | — | ○ | 2 |
| トーキングドラム | — | ○ | ○ | — | 2 |
| 鼓（つづみ） | ○ | — | — | ○ | 2 |
| ティンバレス | ○ | — | — | ○ | 2 |
| ダルブッカ | — | ○ | — | ○ | 2 |
| タブラ | — | ○ | — | ○ | 2 |
| ウドゥ | ○ | — | — | ○ | 2 |
| シェケレ | ○ | — | — | ○ | 2 |
| アゴゴ | ○ | — | — | ○ | 2 |

## 段階2: Suno での実績

`../../../research/suno-profile.md` を確認した。**太鼓**がSuno自身の出力に実際に現れていた実績がある
（段階1で既に通過済みのため結果には影響しない。判断ポイント182）。
それ以外の語に総称的な実績はなく、代表項目は**置かない**（判断ポイント183。日本・アフリカ・
中南米・中東・南アジアの各地の打楽器を束ねる自然な総称語が資料にない。他の民族楽器系カテゴリと同型）。

## 段階3: 2資料以下の語の審査（V-03・V-15）

いずれも実際の音色・役割が明確に異なり代替が利かないため、全語を追加した
（木管楽器系・判断ポイント177と同型の一般的な知識による判定）。

| 語 | 数 | 判定 | 理由 |
|---|---|---|---|
| ボンゴ | 2 | **追加** | (i) コンガより高く乾いた音色の対のドラム。(ii) ラテン音楽の標準編成でコンガとは別に必要、代替不可 |
| カリンバ | 2 | **追加** | (i) 金属製リードを弾くラメラフォンの柔らかい旋律的な音色は他に類がない。(ii) 代替不可 |
| トーキングドラム | 2 | **追加** | (i) 紐を締めて音程を操作し、話し言葉を模す西アフリカ特有の音色。(ii) 代替不可 |
| 鼓（つづみ） | 2 | **追加** | (i) 砂時計型の胴と甲高い掛け声を伴う音色は太鼓とは明確に異なる。(ii) 能楽・歌舞伎の文脈で太鼓では代替できない |
| ティンバレス | 2 | **追加** | (i) 金属シェルの浅い胴による鋭いアタックとカスカラ・パターンは、コンガ・ボンゴでは代替できない。(ii) ラテン音楽の需要が明確 |
| ダルブッカ | 2 | **追加** | (i) ゴブレット型の胴によるドゥム・テクの鋭い打ち分けは中東音楽特有。(ii) 代替不可 |
| タブラ | 2 | **追加** | (i) 対になった太鼓の複雑な音程操作はインド古典音楽の中心的な音像。(ii) 代替不可 |
| ウドゥ | 2 | **追加** | (i) 陶器の壺特有の空気共鳴による「ウォブル」低音は他に類がない。(ii) 代替不可 |
| シェケレ | 2 | **追加** | (i) ビーズを編んだ瓢箪によるラトル＋擦過の音色はマラカスとは異なる。(ii) 代替不可 |
| アゴゴ | 2 | **追加** | (i) 音程差のある2つのベルによる音色はブラジル・アフロ系パーカッションアンサンブル特有。(ii) 代替不可 |

## 段階4a: 規則による刈り込み（V-05）

該当なし。R-a・R-b・R-c に該当する語はない。

## 結果

```json
{
  "items": [
    { "id": "taiko", "label": "太鼓", "categories": ["percussion-world-instrument-family"], "term": { "en": "Taiko" }, "jpNative": true },
    { "id": "djembe", "label": "ジャンベ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Djembe" } },
    { "id": "conga", "label": "コンガ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Conga" } },
    { "id": "cajon", "label": "カホン", "categories": ["percussion-world-instrument-family"], "term": { "en": "Cajón" } },
    { "id": "guiro", "label": "ギロ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Güiro" } },
    { "id": "maracas", "label": "マラカス", "categories": ["percussion-world-instrument-family"], "term": { "en": "Maracas" } },
    { "id": "claves", "label": "クラーベ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Claves" } },
    { "id": "bongo", "label": "ボンゴ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Bongo" } },
    { "id": "kalimba", "label": "カリンバ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Kalimba" } },
    { "id": "talking-drum", "label": "トーキングドラム", "categories": ["percussion-world-instrument-family"], "term": { "en": "Talking Drum" } },
    { "id": "tsuzumi", "label": "鼓", "categories": ["percussion-world-instrument-family"], "term": { "en": "Tsuzumi" }, "jpNative": true },
    { "id": "timbales", "label": "ティンバレス", "categories": ["percussion-world-instrument-family"], "term": { "en": "Timbales" } },
    { "id": "darbuka", "label": "ダルブッカ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Darbuka" } },
    { "id": "tabla", "label": "タブラ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Tabla" } },
    { "id": "udu", "label": "ウドゥ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Udu" } },
    { "id": "shekere", "label": "シェケレ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Shekere" } },
    { "id": "agogo", "label": "アゴゴ", "categories": ["percussion-world-instrument-family"], "term": { "en": "Agogô" } }
  ]
}
```

## 既定で非表示の語（V-16）

該当なし。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 代表項目を置かない（判断ポイント183）。ハープ・ツィター系・世界のリュート系・木管楽器系と同型 |
| 2 | 太鼓はSuno自身の出力に実績があり（判断ポイント182）、需要の裏付けとして特筆した |
| 3 | 段階3の語を通常より広く追加した（判断ポイント177の木管楽器系と同型の判断） |
| 4 | 17語はすべて Suno v6 で未検証（DP-06） |

---

これで打楽器系（`percussion-instrument-family`、判断ポイント179の3分割）が全て完了した。
音程打楽器系5語＋ドラムセット・オーケストラ打楽器系10語＋民族・ワールド打楽器系17語＝表示32語（非表示0語）。
