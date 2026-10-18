# H-09 信号解析の結果

- 作成: 2026-09-18T00:18:27（compare_styles.py 1.0.0）
- 入力: `..\..\temp (user-to-claude)\suno_exports\jp_traditional_style`（A 4曲、B 4曲）
- モデル: ast,clap

## 判定: **判定不能**

主指標 6 個のうち、予想どおりに分離 0 個（必要数 4）、予想と逆に分離 0 個。

| 主指標 | 予想 | 予想どおりの組 / 全組 | 状態 |
|---|---|---|---|
| D1 ビートの明瞭さ | B が大きい | 12 / 16 | 差なし |
| D2 打楽器成分の比率 | B が大きい | 12 / 16 | 差なし |
| D3 同時に鳴る音高の数（和音の厚さ） | B が大きい | 13 / 16 | 傾向あり |
| D4 日本の音階への当てはまり − 七音音階 | A が大きい | 7 / 16 | 差なし |
| M1 AST: 伝統寄りラベル − 現代寄りラベル | A が大きい | 13 / 16 | 傾向あり |
| M2 CLAP: 伝統寄りの文 − 現代寄りの文 | A が大きい | 11 / 16 | 差なし |

判定規則: `docs/examples/suno-test-02-jp-traditional-vs-style.md` §7-3。

## 曲ごとの値

| 曲 | 群 | pulse_clarity | perc_ratio | polyphony_index | scale_index | ast_index | clap_index |
|---|---|---|---|---|---|---|---|
| a1_cherry blossoms in the rain.mp3 | A | 0.8090 | 0.0695 | 2.0712 | -0.0606 | 0.0211 | -0.0000 |
| a2_cherry blossoms in the rain.mp3 | A | 0.7904 | 0.0470 | 2.2566 | -0.0735 | 0.0368 | -0.0001 |
| a3_cherry blossoms in the rain.mp3 | A | 0.7815 | 0.0601 | 2.2358 | -0.0741 | 0.0455 | 0.0000 |
| a4_cherry blossoms in the rain.mp3 | A | 0.8051 | 0.0973 | 2.4850 | -0.0500 | 0.0274 | -0.0000 |
| b1_桜の下で.mp3 | B | 0.8482 | 0.0768 | 2.8058 | -0.0608 | 0.0085 | -0.0001 |
| b2_桜の下で.mp3 | B | 0.8501 | 0.0779 | 2.9079 | -0.0781 | 0.0026 | -0.0001 |
| b3_桜の季節.mp3 | B | 0.7759 | 0.0617 | 2.1357 | -0.0546 | 0.0380 | -0.0000 |
| b4_桜の季節.mp3 | B | 0.8510 | 0.1234 | 2.7284 | -0.0479 | 0.0116 | -0.0001 |

### 参考指標（判定には使わない）

| 曲 | 推定テンポ (BPM) | 拍間隔のばらつき（大きいほど拍が揺れる） | 低域(<150Hz)の打楽器成分の比率 | 発音の頻度 (回/秒) | 静かな区間の比率（-40dB 未満） | 1秒ごとの和声の変化量 | 七音音階への当てはまり | 半音を含まない五音音階（民謡・律・ヨナ抜き）への当てはまり | 半音を含む五音音階（都節）への当てはまり |
|---|---|---|---|---|---|---|---|---|---|
| a1_cherry blossoms in the rain.mp3 | 172.2656 | 0.0399 | 0.0165 | 3.9610 | 0.0110 | 0.1893 | 0.9288 | 0.8682 | 0.8036 |
| a2_cherry blossoms in the rain.mp3 | 135.9992 | 0.0290 | 0.0110 | 3.2119 | 0.0039 | 0.1972 | 0.9344 | 0.8610 | 0.8110 |
| a3_cherry blossoms in the rain.mp3 | 135.9992 | 0.0303 | 0.0239 | 3.3705 | 0.0085 | 0.1815 | 0.9255 | 0.8514 | 0.8038 |
| a4_cherry blossoms in the rain.mp3 | 151.9991 | 0.0287 | 0.0092 | 3.5020 | 0.0046 | 0.1911 | 0.9016 | 0.8516 | 0.7971 |
| b1_桜の下で.mp3 | 143.5547 | 0.0287 | 0.0367 | 4.1836 | 0.0053 | 0.1464 | 0.8905 | 0.8297 | 0.7848 |
| b2_桜の下で.mp3 | 143.5547 | 0.0285 | 0.0400 | 4.3209 | 0.0016 | 0.1459 | 0.9197 | 0.8416 | 0.8216 |
| b3_桜の季節.mp3 | 135.9992 | 0.0385 | 0.0204 | 3.7815 | 0.0044 | 0.1921 | 0.9193 | 0.8647 | 0.7925 |
| b4_桜の季節.mp3 | 99.3840 | 0.0300 | 0.0578 | 4.6117 | 0.0042 | 0.1330 | 0.9255 | 0.8776 | 0.7909 |

## AST（AudioSet ラベルの確率。10秒窓の平均）

| 曲 | Music of Asia | Traditional music | Flute | Zither | Synthesizer | Piano | Drum kit | Drum machine | Electronic music | Harp | Guitar | Acoustic guitar | Bowed string instrument | Orchestra | Percussion | Drum | New-age music | Ambient music | Theremin |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a1_cherry blossoms in the rain.mp3 | 0.0019 | 0.0291 | 0.0060 | 0.0599 | 0.0022 | 0.0102 | 0.0002 | 0.0001 | 0.0027 | 0.0193 | 0.0092 | 0.0020 | 0.0063 | 0.0020 | 0.0023 | 0.0009 | 0.0561 | 0.0038 | 0.0028 |
| a2_cherry blossoms in the rain.mp3 | 0.0019 | 0.0198 | 0.1166 | 0.0270 | 0.0033 | 0.0151 | 0.0002 | 0.0001 | 0.0036 | 0.0361 | 0.0079 | 0.0021 | 0.0068 | 0.0032 | 0.0009 | 0.0006 | 0.0922 | 0.0046 | 0.0086 |
| a3_cherry blossoms in the rain.mp3 | 0.0034 | 0.0236 | 0.1152 | 0.0556 | 0.0020 | 0.0145 | 0.0002 | 0.0001 | 0.0028 | 0.0215 | 0.0082 | 0.0025 | 0.0056 | 0.0028 | 0.0010 | 0.0005 | 0.0620 | 0.0035 | 0.0090 |
| a4_cherry blossoms in the rain.mp3 | 0.0017 | 0.0404 | 0.0182 | 0.0588 | 0.0015 | 0.0082 | 0.0001 | 0.0001 | 0.0022 | 0.0387 | 0.0089 | 0.0020 | 0.0071 | 0.0023 | 0.0009 | 0.0004 | 0.0490 | 0.0021 | 0.0025 |
| b1_桜の下で.mp3 | 0.0023 | 0.0091 | 0.0474 | 0.0112 | 0.0062 | 0.0198 | 0.0005 | 0.0005 | 0.0184 | 0.0305 | 0.0107 | 0.0026 | 0.0044 | 0.0030 | 0.0008 | 0.0008 | 0.0848 | 0.0063 | 0.0035 |
| b2_桜の下で.mp3 | 0.0025 | 0.0113 | 0.0420 | 0.0130 | 0.0068 | 0.0525 | 0.0004 | 0.0006 | 0.0128 | 0.0105 | 0.0112 | 0.0034 | 0.0053 | 0.0040 | 0.0009 | 0.0008 | 0.0582 | 0.0044 | 0.0035 |
| b3_桜の季節.mp3 | 0.0019 | 0.0244 | 0.0996 | 0.0419 | 0.0022 | 0.0145 | 0.0002 | 0.0001 | 0.0026 | 0.0555 | 0.0071 | 0.0020 | 0.0046 | 0.0016 | 0.0013 | 0.0007 | 0.0828 | 0.0042 | 0.0034 |
| b4_桜の季節.mp3 | 0.0029 | 0.0143 | 0.0659 | 0.0139 | 0.0097 | 0.0304 | 0.0008 | 0.0015 | 0.0211 | 0.0143 | 0.0093 | 0.0029 | 0.0030 | 0.0025 | 0.0015 | 0.0013 | 0.0410 | 0.0053 | 0.0023 |

上位10ラベル:

- a1_cherry blossoms in the rain.mp3: Music 0.764, Zither 0.060, New-age music 0.056, Tender music 0.050, Musical instrument 0.048, Pizzicato 0.039, Background music 0.037, Sad music 0.037, Traditional music 0.029, Folk music 0.022
- a2_cherry blossoms in the rain.mp3: Music 0.703, Flute 0.117, New-age music 0.092, Tender music 0.079, Sad music 0.070, Musical instrument 0.061, Background music 0.054, Harp 0.036, Wind instrument, woodwind instrument 0.036, Pizzicato 0.032
- a3_cherry blossoms in the rain.mp3: Music 0.731, Flute 0.115, New-age music 0.062, Tender music 0.060, Zither 0.056, Musical instrument 0.052, Sad music 0.047, Background music 0.038, Pizzicato 0.034, Wedding music 0.025
- a4_cherry blossoms in the rain.mp3: Music 0.780, Tender music 0.063, Zither 0.059, Sad music 0.055, Musical instrument 0.051, New-age music 0.049, Background music 0.048, Traditional music 0.040, Pizzicato 0.040, Harp 0.039
- b1_桜の下で.mp3: Music 0.676, New-age music 0.085, Background music 0.079, Musical instrument 0.070, Tender music 0.059, Flute 0.047, Sad music 0.040, Harp 0.031, Soundtrack music 0.023, Piano 0.020
- b2_桜の下で.mp3: Music 0.669, Background music 0.078, Musical instrument 0.075, Tender music 0.060, New-age music 0.058, Piano 0.053, Keyboard (musical) 0.044, Electric piano 0.044, Flute 0.042, Sad music 0.040
- b3_桜の季節.mp3: Music 0.742, Flute 0.100, New-age music 0.083, Tender music 0.070, Background music 0.064, Harp 0.055, Sad music 0.052, Musical instrument 0.050, Zither 0.042, Pizzicato 0.038
- b4_桜の季節.mp3: Music 0.669, Background music 0.069, Flute 0.066, Musical instrument 0.059, New-age music 0.041, Tender music 0.039, Piano 0.030, Speech 0.025, Keyboard (musical) 0.024, Soundtrack music 0.024

## CLAP（文との類似度。値の絶対値ではなく曲どうしの比較に使う）

| 文 | a1_cherry blossoms in the rain.mp3 | a2_cherry blossoms in the rain.mp3 | a3_cherry blossoms in the rain.mp3 | a4_cherry blossoms in the rain.mp3 | b1_桜の下で.mp3 | b2_桜の下で.mp3 | b3_桜の季節.mp3 | b4_桜の季節.mp3 |
|---|---|---|---|---|---|---|---|---|
| traditional Japanese music played on shakuhachi and koto | 0.0050 | 0.0025 | 0.0040 | 0.0034 | 0.0050 | 0.0041 | -0.0011 | 0.0051 |
| Japanese classical court music, gagaku | 0.0047 | 0.0021 | 0.0038 | 0.0032 | 0.0047 | 0.0038 | -0.0016 | 0.0048 |
| solo shakuhachi bamboo flute with a breathy tone | 0.0042 | 0.0021 | 0.0033 | 0.0029 | 0.0046 | 0.0037 | -0.0016 | 0.0048 |
| plucked koto zither melody | 0.0068 | 0.0044 | 0.0059 | 0.0052 | 0.0068 | 0.0059 | 0.0006 | 0.0068 |
| shamisen music | 0.0052 | 0.0027 | 0.0043 | 0.0037 | 0.0053 | 0.0044 | -0.0011 | 0.0054 |
| modern Japanese-style background music with piano and strings | 0.0048 | 0.0025 | 0.0039 | 0.0034 | 0.0050 | 0.0040 | -0.0013 | 0.0049 |
| music with warm synthesizer pads | 0.0050 | 0.0027 | 0.0041 | 0.0035 | 0.0052 | 0.0044 | -0.0012 | 0.0054 |
| music with a steady drum kit beat | 0.0045 | 0.0021 | 0.0036 | 0.0031 | 0.0046 | 0.0038 | -0.0017 | 0.0049 |
| electronic music | 0.0061 | 0.0038 | 0.0051 | 0.0046 | 0.0063 | 0.0054 | 0.0001 | 0.0064 |
| cinematic orchestral music | 0.0056 | 0.0032 | 0.0046 | 0.0041 | 0.0058 | 0.0048 | -0.0005 | 0.0058 |
| shakuhachi | 0.0060 | 0.0036 | 0.0052 | 0.0046 | 0.0062 | 0.0055 | -0.0002 | 0.0066 |
| shinobue flute | 0.0073 | 0.0049 | 0.0064 | 0.0058 | 0.0074 | 0.0067 | 0.0009 | 0.0076 |
| koto | 0.0091 | 0.0067 | 0.0081 | 0.0077 | 0.0092 | 0.0085 | 0.0030 | 0.0096 |
| shamisen | 0.0053 | 0.0029 | 0.0044 | 0.0038 | 0.0055 | 0.0047 | -0.0009 | 0.0058 |
| taiko drums | 0.0081 | 0.0057 | 0.0072 | 0.0065 | 0.0084 | 0.0077 | 0.0019 | 0.0088 |
| piano | 0.0051 | 0.0033 | 0.0044 | 0.0039 | 0.0058 | 0.0050 | -0.0004 | 0.0062 |
| acoustic guitar | 0.0033 | 0.0011 | 0.0025 | 0.0019 | 0.0036 | 0.0029 | -0.0025 | 0.0040 |
| harp | 0.0065 | 0.0043 | 0.0056 | 0.0051 | 0.0069 | 0.0061 | 0.0007 | 0.0073 |
| string ensemble | 0.0068 | 0.0043 | 0.0059 | 0.0055 | 0.0069 | 0.0062 | 0.0008 | 0.0073 |
| synthesizer | 0.0074 | 0.0050 | 0.0064 | 0.0058 | 0.0076 | 0.0067 | 0.0013 | 0.0078 |
| drum kit | 0.0071 | 0.0046 | 0.0062 | 0.0056 | 0.0072 | 0.0065 | 0.0009 | 0.0076 |
