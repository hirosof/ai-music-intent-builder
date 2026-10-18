# 「近い系統」の警告ペアリスト（ジャンル）

- 作成日: 2026-09-18
- 状態: 初版（ジャンルのみ。判断ポイント160）
- 関連: `../presets.md` §5-3（警告の対象）・判断ポイント12・22、`stage-4b-plan.md` 手順2

---

## 1. 位置づけ

`../presets.md` §5-3 の警告のうち「同一項目内で近い系統を複数『使用する』」を判定するための組の一覧。
同じカテゴリというだけでは警告しない（判断ポイント22）。生成は止めない。

表示設定に関係なく判定する（`../presets.md` §11-3 の5）。組の語が既定で非表示でも対象にする。

## 2. 組にする基準

| 記号 | 基準 | 例 |
|---|---|---|
| W-a | 名前が似ているが別物で、取り違えて両方を選びやすい | Afrobeat と Afrobeats |
| W-b | 同じ系譜の姉妹様式で、同時には成り立たない特徴（地域の型、リズムの型、時代）で区別される。両方を使うと互いの特徴を打ち消す | J-POP と K-POP |

次は組にしない。

- 代表項目と下位の語（Pop と J-POP など）。冗長だが矛盾しない（判断ポイント12）
- 一方が他方を含む総称と下位の語（Indian Classical と Hindustani Classical など）。同上
- 組み合わせて自然な語（Swing と Big Band、Electric Blues と Chicago Blues など）

## 3. 初版の範囲

初版は、**段階4a までの記録で「別物」「重なりを再確認」と判定した組**と、`../presets.md` §5-3 の例に限った。
語彙全体からの洗い出しは、他の軸（楽器・情緒・地域・文化の様式）の語彙と合わせて行う（警告は項目をまたがずに判定するため、軸ごとにペアリストが要る）。

## 4. 一覧

```json
{
  "pairs": [
    { "ids": ["j-pop", "k-pop"], "basis": "W-b", "reason": "地域ごとの大衆ポップで、制作の特徴が異なる", "source": "../presets.md §5-3 の例" },
    { "ids": ["drill", "uk-drill"], "basis": "W-b", "reason": "シカゴと英国でリズムの型（ベースの動き、ハイハットの刻み）が異なる", "source": "判断ポイント70・158" },
    { "ids": ["hindustani-classical", "carnatic-classical"], "basis": "W-b", "reason": "北インドと南インドで楽器・装飾・リズム周期が異なる", "source": "判断ポイント130・158" },
    { "ids": ["modern-classical", "contemporary-classical"], "basis": "W-b", "reason": "20世紀前半〜中葉と戦後以降で、時代と語法が異なる", "source": "判断ポイント136・158" },
    { "ids": ["afrobeat", "afrobeats"], "basis": "W-a", "reason": "名前が似ているが、1960〜70年代のナイジェリアの様式と2000年代以降の西アフリカのポップで別物", "source": "genres/world.md（O が別物と明記）" },
    { "ids": ["ska", "reggae"], "basis": "W-b", "reason": "同じ系譜で、速いアップビート（スカ）とゆったりしたオフビート（レゲエ）でテンポ感とリズムの型が異なる", "source": "genres/reggae-caribbean.md 段階4a" }
  ]
}
```

| # | 組 | 基準 | 理由 |
|---|---|---|---|
| 1 | J-POP / K-POP | W-b | 地域ごとの大衆ポップで、制作の特徴が異なる |
| 2 | Drill / UK Drill | W-b | リズムの型が異なる |
| 3 | Hindustani Classical / Carnatic Classical | W-b | 楽器・装飾・リズム周期が異なる |
| 4 | Modern Classical / Contemporary Classical | W-b | 時代と語法が異なる |
| 5 | Afrobeat / Afrobeats | W-a | 名前が似た別物 |
| 6 | Ska / Reggae | W-b | テンポ感とリズムの型が異なる |

## 5. 補完・仮定

| 項目 | 内容 | 根拠 |
|---|---|---|
| データの形 | `ids`（2語の `id`）、`basis`、`reason`、`source` | `../presets.md` §5-3 は「警告するペアを明示したリスト」とだけ定めている。表示用の理由と追跡用の出所を持たせた |
| Ska / Rocksteady、Rocksteady / Reggae | 組にしない | Rocksteady は両者の中間の様式で、どちらと組み合わせても打ち消し合いが小さい |
| 警告の文面 | 未定 | 画面の設計（`../ui-and-nonfunctional.md` §5）で決める |
