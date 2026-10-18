# Suno 検証 03: 村・街・都市のBGM

- 最終更新: 2026-09-18
- 目的: `../decisions/vocabulary/usage.md`（用途の語彙）の「街・村のテーマ」を分割すべきかの判定
- 状態: 判定済み（分割する）
- 調査担当者: hirosof（生成・記録）。考察は Claude
- 生成条件: スタイル欄「Game, 村のBGM」「Game, 街のBGM」「Game, 都市のBGM」の3通り。バリエーション設定は Normal。各4曲

## 1. 背景

`vocabulary/usage.md` 初版では「街・村のテーマ」を1項目にまとめていたが、
「村」「街」「都市」で生成される音像が実際に異なるかを Suno で確認した。

## 2. 結果（Suno が書き換えたスタイル文。利用者の生成記録）

| 指定したスタイル | バリエーション | Suno が生成した曲の実際のスタイル |
|---|---|---|
| Game, 村のBGM | Normal | ゲーム村BGM, 穏やかな中速ループ, quiet ambient bed, instrumental, 木質マリンバの素朴な反復フレーズと柔らかな余韻 |
| Game, 村のBGM | Normal | ゲーム用の村BGM, インストゥルメンタル, 穏やかな中テンポ, 柔らかなアコースティックピアノの反復フレーズ, 控えめな旋律, 軽いステレオディレイ |
| Game, 村のBGM | Normal | Game village BGM, low-volume ambient bed, instrumental, gentle unhurried tempo, wooden flute carrying a simple pastoral melody over soft acoustic plucks and restrained hand percussion |
| Game, 村のBGM | Normal | Game soundtrack, instrumental, gentle mid-tempo village theme, warm marimba melody with soft wooden percussion and simple pastoral chordal backing, subtle tape warmth |
| Game, 街のBGM | Normal | Game soundtrack, hard-panned chip channels, sampled electric piano carrying bright city motifs, instrumental, brisk looping mid-tempo groove with compact arcade phrasing |
| Game, 街のBGM | Normal | Game music, FM bell lead, instrumental, steady mid-tempo loop, 16-bit game-console mix |
| Game, 街のBGM | Normal | Game soundtrack, mid-tempo urban groove, digital electric piano carrying the melody, instrumental, loop-friendly fade transitions with clean electronic drums and understated city ambience |
| Game, 街のBGM | Normal | Game music, instrumental; FM synth bass, bright arpeggiated synths, compact electronic drums; 12-bit sample texture with crunchy lo-fi transients; brisk looping city-street groove |
| Game, 都市のBGM | Normal | ゲーム用都市BGM, ローファイサンプルレート感, ミドルテンポの反復グルーヴ, サブベースを軸にした電子ドラムと短いシンセフレーズ, インストゥルメンタル |
| Game, 都市のBGM | Normal | Game music, 控えめなテープヒス, steady mid-tempo pulse, 電子ドラムマシン with restrained synth bass and compact urban pads, instrumental |
| Game, 都市のBGM | Normal | Game soundtrack, 都市の夜を描く中速の反復グルーヴ, analog pad synthesizerと控えめな電子ドラム, instrumental, lo-fi sampler grainと柔らかなテープ質感 |
| Game, 都市のBGM | Normal | ゲーム向け都市BGM, FMベルシンセサイザー, インストゥルメンタル, 軽快な電子グルーヴ, ワイドなステレオパッドとクリアなデジタルミックス |

## 3. 考察（Claude）

3つのスタイルで、Suno が書き換えた楽器・音色の傾向が明確に分かれている。

| 観点 | 村（4曲） | 街（4曲） | 都市（4曲） |
|---|---|---|---|
| 主な楽器・音色 | マリンバ、アコースティックピアノ、木管フルート、生の打楽器（4/4がアコースティック系） | チップチューン、エレクトリックピアノ、FMベル、シンセアルペジオ（4/4がチップ/8-bit・16-bit系） | サブベース、アナログパッドシンセ、電子ドラムマシン、ローファイサンプル（4/4がシンセ・電子系） |
| テンポ感 | 穏やか（gentle, unhurried） | 軽快（brisk） | 中速（mid-tempo）だが「夜」の言及あり |
| 質感 | 素朴・牧歌的（pastoral, warm） | アーケード的（arcade, chip-tune） | ローファイ・夜的（lo-fi, night） |

村＝生楽器の牧歌的な響き、街＝チップチューン調の軽快さ、都市＝ローファイ電子音の夜の雰囲気と、
3語とも一貫して異なる音像に書き換えられている。1項目にまとめると、この音色の違いを利用者が
指定し分けられなくなる。

## 4. 結論

「街・村のテーマ」を「村のテーマ」「街のテーマ」「都市のテーマ」の3項目に分割する
（`vocabulary/usage.md` 判断ポイント197）。
