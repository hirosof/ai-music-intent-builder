# シネマティック系（`cinematic-family`）

- 作成日: 2026-09-18
- 語数: 3（既定で表示。本カテゴリで審査した語。段階4b の前）
- 他カテゴリで審査済みで本カテゴリにも表示される語: 0
- 既定で非表示の語: 3（V-16）
- 所属は V-14 で判定（(6)・(7) を含む）。段階3 の (ii) は V-15 で判定
- 用途（Battle Theme、Soundtrack など）と情緒（Epic、Dark、Dramatic など）は、ジャンルではなく軸A・軸C の語彙で扱う（`../README.md` §1-1・§3-3）
- 手順・細則・略号: `../README.md`

---

## 段階1: 3資料以上に登場する語

見出しの対応は C の「Orchestra / Cinematic」だけで、O の「映画・ゲーム・機能性音楽」、C の「映画 / TV / ゲーム音楽」「Musical / Stage」、S の §16 はいずれも対応なし（`../README.md` §3-5 の補足）。G には該当する見出しがない。
このため**本カテゴリの語の配置は C の1資料にしか付かず**、V-02 の過半数はほとんどの語で成立しない（判断ポイント142）。

| 語 | C | O | G | S | 数 | 所属 |
|---|---|---|---|---|---|---|
| Musical Theatre | 対応なし（Musical / Stage） | 対応なし（「Musical theatre / Showtunes」） | — | 対応なし（§16「ミュージカル」） | 3 | 配置なし。`../README.md` §3-3 で境界にまたがる語とされた語。判断で本カテゴリで審査した（判断ポイント147） |

3資料以上に登場するが、ジャンルとして審査しない語（判断ポイント146）:

| 語 | 出現 | 扱い |
|---|---|---|
| Soundtrack | C（映画 / TV / ゲーム音楽）・O（「Film score / Soundtrack」）・S（§16「サウンドトラック」） | いずれも配置なし。`../README.md` §3-3 で軸A（用途）とした語。軸A の語彙を作るときの材料にする |
| Film Score | C・O・G（本文「映画音楽の作曲技法」。関係の説明） | 同上 |

## 段階2: Suno での実績

| 実例 | 扱い |
|---|---|
| `Orchestral`（`../../../examples/suno-test-01-granularity.md`。基本プロンプトの先頭の語で、バリエーション標準の4曲すべてが `Orchestral` で始まるスタイルに書き換えられた） | **Orchestral を追加**。資料は C（cinematic）・O（「Orchestral / Cinematic」。対応なし）の2資料 |
| `cinematic`（`../../../research/suno-profile.md` §5-1。Suno が書き換えたスタイル「cinematic studio reverb and powerful climactic accents」） | **Cinematic を追加**。Suno 自身が出力した語で、Suno が認識する語と判断した。資料は C・O（本文でも Suno で安定するジャンルとして言及）の2資料。Suno の出力では質感の形容として使われている（判断ポイント142・143） |

## 段階3: 2資料以下の語の審査（V-03、V-15）

| 語 | 判定 | 理由 |
|---|---|---|
| Trailer Music | **追加** | C（cinematic）・O（「Epic / Trailer music」。対応なし）。(i) 器楽で成立する。(ii) 衝撃音（ヒット、ブラーム）やうねりの音色と、段階的に盛り上げて止める構成の組み合わせは、展開の形だけでは表せない。Cinematic は総称で、この音作りを表せない（V-15。判断ポイント144） |
| Epic Music | 追加しない | C（cinematic）・O（「Epic / Trailer music」。対応なし）。Cinematic と情緒（壮大）・強度（強い）で代替できる。「Epic」は情緒の語としても扱う（`../README.md` §1-1。判断ポイント145） |
| Show Tunes | 追加しない | C（Musical / Stage。対応なし）・O（「Musical theatre / Showtunes」。対応なし）。O が Musical Theatre と併記しており、同じ語を指す |
| 1資料のみの語（Symphonic、Epic Orchestral、Hybrid Orchestral、Hybrid Cinematic、Cinematic Electronic、Dark Cinematic、Emotional Cinematic、Dramatic Music、Fantasy Music、Adventure Music、Action Music、Battle Music、Television Score、Anime Soundtrack、Visual Novel Music、JRPG Music、Dungeon Synth、Production / Library Music、Broadway ほか） | 追加しない | 1資料のみ。語ごとの判定がないため辞典に記録しない（V-16）。多くは用途（軸A）や情緒（軸C）の語で、軸A・軸C の語彙を作るときの材料にする |

C の「ゲーム用途による分類」（Battle Theme、Boss Battle、Town Theme など）は、C 自身が「厳密にはジャンルではなく用途・曲調」としており、軸A の語彙で扱う（V-11）。

## 段階4a: 規則による刈り込み

| 語 | 規則 | 扱い |
|---|---|---|
| Musical Theatre | R-b | **除外**。歌と台詞による音楽劇で、区別の主因が歌唱（判断ポイント147） |

次の適用も検討したが、適用しない。

- Orchestral への R-a（編成）: 判断ポイント16 で軸B（ジャンル）に置くと決めている。編成の規模は別の項目で持つ
- Cinematic への R-a（用途: 映画）: 名前は用途に由来するが、Suno 自身がスタイルの語として出力しており、壮大な管弦楽・大きな残響・劇的な強弱という音の方向を指す（判断ポイント143）
- Trailer Music への R-a（用途: 予告編）: 名前は用途に由来するが、衝撃音と段階的な構成という音の型が定着している。資料に音の記述はなく、用途の語とする解釈もある（`pop.md` の Anime Song と同型。判断ポイント144）

## 結果

### 既定で表示する語

```json
{
  "items": [
    { "id": "cinematic",     "label": "Cinematic",     "categories": ["cinematic-family"], "represents": "cinematic-family", "aliases": ["シネマティック"] },
    { "id": "orchestral",    "label": "Orchestral",    "categories": ["cinematic-family"], "aliases": ["オーケストラル", "オーケストラ"] },
    { "id": "trailer-music", "label": "Trailer Music", "categories": ["cinematic-family"], "aliases": ["トレーラー音楽", "トレーラーミュージック"] }
  ]
}
```

### 既定で非表示の語（V-16）

```json
{
  "items": [
    { "id": "epic-music", "label": "Epic Music", "categories": ["cinematic-family"], "aliases": ["エピックミュージック"], "defaultVisible": false,
      "exclusion": { "kind": "substitutable", "substitute": "Cinematic ＋ 情緒（壮大）・強度（強い）" } },
    { "id": "show-tunes", "label": "Show Tunes", "categories": ["cinematic-family"], "aliases": ["Showtunes", "ショーチューン"], "defaultVisible": false,
      "exclusion": { "kind": "contained", "note": "O が Musical Theatre と併記", "substitute": "Musical Theatre" } },
    { "id": "musical-theatre", "label": "Musical Theatre", "categories": ["cinematic-family"], "aliases": ["Musical Theater", "ミュージカル"], "defaultVisible": false,
      "exclusion": { "kind": "vocal", "note": "歌と台詞による音楽劇で、区別の主因が歌唱" } }
  ]
}
```

## 他カテゴリへ送る語

なし。

## 判定の注記

| # | 内容 |
|---|---|
| 1 | 表示順: 代表項目 → Orchestral → Trailer Music。非表示の語は段階3 → 段階4a の表の順 |
| 2 | 代表項目は Cinematic（C の最上位の見出し名で、カテゴリのラベルと同じ）。Orchestral と Trailer Music を含む映画音楽風の音の総称で、判断ポイント90 の条件を満たす。C の見出しの「Orchestra」は Orchestral の表記揺れとして語に数えたため、カテゴリの別名はない（V-14 (6)） |
| 3 | Orchestral はクラシック系の管弦楽曲とも音が近いが、資料の配置は C の cinematic のみのため、クラシック系のタグは付けない。TreeTable の検索では見つかる |
| 4 | 本カテゴリは V-12 で「Cinematic 系は厚めに」の方針から追加したが、ジャンル語としては3語にとどまった。壮大・暗い・感動的などの幅は情緒（軸C）、戦闘曲・フィールド曲などの幅は用途（軸A）、ハイブリッドは副ジャンル Electronic で表す（判断ポイント148） |
| 5 | Suno の実例は `Orchestral` がバリエーション標準での書き換え、`cinematic` が Suno の出力で、いずれもインストの生成だが、ジャンル語単独での効き方は未検証（DP-06） |
