# 音楽ジャンル系統別一覧（音楽生成AIプロンプト向け）

本一覧は、Wikipedia の各種「List of ... genres」、AllMusic、Rate Your Music、Every Noise at Once、および Suno/Udio 向けプロンプトガイドを参照し、世界の音楽ジャンルを系統（大分類）別に整理したものです。ジャンル名は英語の一般的表記を基本とし、必要に応じ日本語補足を付けています。サブジャンルは親ジャンルの下にインデントで示します。

**TL;DR（要点）**

* 音楽ジャンルは POP／ロック／パンク／メタル／ダンス・エレクトロニック／ベース・ミュージック／ヒップホップ・R&B／ソウル・ファンク／ジャズ／ブルース／クラシック／カントリー・フォーク／レゲエ／ラテン／ワールド／アンビエント・実験／映画・ゲーム・機能性音楽 の **17系統** に整理でき、各系統に主要ジャンルと代表サブジャンルを収録した。
* 音楽生成AI（Suno / Udio）のプロンプトでは、**明確に定義された音像を持つジャンル**（Synthwave, Lo-fi hip hop, City Pop, Vaporwave, Chiptune, Cinematic/Epic, Amapiano 等）が特に高精度で機能する。単に「Rock」「Jazz」と書くより、サブジャンル名＋テンポ（BPM）＋楽器＋ムードを重ねるのが定石。
* ジャンルは文化的現象であり厳密な生物分類のような階層ではない。複数系統にまたがるものは主たる系統に配置し、重複は注記した（例：Synth-pop→POP、Trip hop→エレクトロニック、Reggaeton→ラテン）。

## Key Findings（主要な発見）

* **系統の骨格は Wikipedia のカテゴリ体系がベースとして最も信頼できる。** Wikipedia「Category:Musical subgenres by genre」は Pop（62サブカテゴリ）、Rock（45）、Hip-hop（52）、Heavy metal（38）、Electronic（30）、Jazz（29）など、系統ごとの規模を数値で示しており大分類設定の裏付けになる。
* **地域特有ジャンルは POP 系統に統合できる。** J-POP は Wikipedia 上で City pop / technopop / J-Euro をサブジャンルに持ち、Shibuya-kei・Enka・Anime song（アニソン）・Vocaloid を周辺に置く。K-POP は Trot、C-POP は Mandopop／Cantopop に分岐する。
* **音楽生成AI実務では「機能性音楽」が独立した重要カテゴリになる。** Suno のジャンル別信頼性ランキングでは Synthwave・Lo-fi・Ambient・Cinematic が「最も安定して高品質」とされ、これらは伝統的な学術的ジャンル分類には収まりにくいため本一覧では独立系統とした。
* **ジャンルの網羅数は情報源で大きく異なる。** Every Noise at Once は元Spotify「データ・アルケミスト」Glenn McDonald が2013年5月に The Echo Nest 在籍時に作成し、約100万アーティストを6,291のジャンルに分類（reggae 56種、folk 202種、hip hop 230種を含む／2023年12月のレイオフ以降は更新停止）。一方で本一覧は「代表的・人気のあるもの」に絞り、実用可能な粒度に留めた。

## Details（系統別一覧）

## POP（ポップス）

* POP（ポップ全般）
* J-POP（日本）
    * City Pop（シティポップ）
    * Shibuya-kei（渋谷系）
    * Technopop（テクノポップ）
    * Kayōkyoku（歌謡曲）
    * Anime song / Anison（アニソン）
    * Idol / アイドルポップ
    * Vocaloid（ボーカロイド）
* K-POP（韓国）
    * Trot（トロット）
    * K-ballad（バラード）
* C-POP（中華圏）
    * Mandopop（マンドポップ／華語）
    * Cantopop（広東ポップ）
* Synth-pop（シンセポップ／テクノポップ）
* Dance-pop（ダンスポップ）
* Electropop（エレクトロポップ）
* Dream pop（ドリームポップ）
* Bedroom pop（ベッドルームポップ）
* Art pop（アートポップ）
* Baroque pop / Chamber pop（バロックポップ）
* Indie pop（インディーポップ）
    * Twee pop
* Power pop（パワーポップ）
* Teen pop / Bubblegum pop
* Hyperpop（ハイパーポップ）※起源は2010年代初頭の A. G. Cook 主宰ロンドンのレーベル PC Music。名称は2019年8月に Spotify のエディター Lizzy Szabo が 100 gecs（『1000 gecs』2019年）の急伸を受けて作成したプレイリスト名として定着
* Sophisti-pop
* Latin pop（ラテンポップ）

## ロック

* Rock and roll（ロックンロール）
* Rockabilly（ロカビリー）
* Hard rock（ハードロック）
* Classic rock（クラシックロック）
* Psychedelic rock（サイケデリックロック）
    * Acid rock
    * Space rock
* Progressive rock（プログレッシブロック）
* Art rock（アートロック）
* Glam rock（グラムロック）
* Alternative rock（オルタナティブロック）
    * Grunge（グランジ）
    * Britpop（ブリットポップ）
    * Shoegaze（シューゲイザー）
    * Post-grunge
* Indie rock（インディーロック）
* Garage rock（ガレージロック）
* Surf rock（サーフロック）
* Folk rock（フォークロック）
* Country rock（カントリーロック）
* Blues rock（ブルースロック）
* Soft rock / Arena rock（ソフトロック／アリーナロック）
* Post-rock（ポストロック）
* Math rock（マスロック）
* Emo（エモ）
* Post-punk（ポストパンク）
* J-rock（日本のロック）

## パンク

* Punk rock（パンクロック）
* Proto-punk（プロトパンク）
* Hardcore punk（ハードコアパンク）
    * D-beat
    * Powerviolence
    * Melodic hardcore
* Post-hardcore（ポストハードコア）
    * Screamo（スクリーモ）
* Pop-punk（ポップパンク）
* Skate punk（スケートパンク）
* Oi! / Street punk（ストリートパンク）
* Anarcho-punk（アナルコパンク）
* Crust punk（クラストパンク）
* Ska punk（スカパンク）
* Folk punk（フォークパンク）
* Riot grrrl / Queercore / Horror punk

## メタル

* Heavy metal（ヘヴィメタル／トラディショナル）
* Thrash metal（スラッシュメタル）
* Speed metal（スピードメタル）
* Death metal（デスメタル）
    * Melodic death metal
    * Technical death metal
    * Brutal death metal
* Black metal（ブラックメタル）
    * Symphonic black metal
* Doom metal（ドゥームメタル）
    * Funeral doom / Death-doom
* Power metal（パワーメタル）
* Symphonic metal（シンフォニックメタル）
* Progressive metal（プログレッシブメタル）
    * Djent
* Groove metal（グルーヴメタル）
* Nu metal（ニューメタル）
* Metalcore（メタルコア）
    * Deathcore
* Folk metal / Viking metal（フォークメタル）
* Gothic metal（ゴシックメタル）
* Industrial metal（インダストリアルメタル）
* Sludge metal / Stoner metal（スラッジ／ストーナー）
* Grindcore（グラインドコア）
* Kawaii metal（日本／アイドルメタル）

## ダンス／エレクトロニック

* EDM（エレクトロニック・ダンス・ミュージック全般）
* House（ハウス）
    * Deep house
    * Tech house
    * Progressive house
    * Electro house
    * Future house
    * Afro house
    * Big room house
* Techno（テクノ）
    * Detroit techno
    * Minimal techno
    * Melodic techno
    * Industrial techno
    * Dub techno
* Trance（トランス）
    * Uplifting trance
    * Progressive trance
    * Psytrance / Goa trance
    * Tech trance
    * Vocal trance
* Electro（エレクトロ／エレクトロファンク）
* Eurodance（ユーロダンス）
* Hi-NRG / Eurobeat
* IDM（インテリジェント・ダンス・ミュージック）
* Glitch（グリッチ）
* Downtempo（ダウンテンポ）
    * Trip hop（トリップホップ）
    * Chill-out
* Synthwave / Retrowave（シンセウェイヴ）
    * Darksynth
* Vaporwave（ヴェイパーウェイヴ）※Daniel Lopatin（別名 Chuck Person）の『Chuck Person's Eccojams Vol. 1』（2010年）が原型、Macintosh Plus（Ramona Xavier）の『Floral Shoppe』（2011年）で確立
    * Future funk / Mallsoft
* Chillwave（チルウェイヴ）

## ベース・ミュージック（EDM ベース系）

* Dubstep（ダブステップ）
    * Brostep
    * Riddim
* Drum and Bass（ドラムンベース）
    * Jungle（ジャングル）
    * Liquid funk（リキッド）
    * Neurofunk（ニューロファンク）
    * Techstep / Jump-up
* UK Garage（UKガラージ）
    * 2-step
* Grime（グライム）
* Breakbeat（ブレイクビーツ）
    * Big beat
    * Breakcore
* Hardstyle（ハードスタイル）
* Hardcore techno / Gabber（ガバ）
    * Happy hardcore
    * Frenchcore / Speedcore
* Trap（EDMトラップ）
* Future bass（フューチャーベース）
* Moombahton（ムンバートン）
* Drumstep

## ヒップホップ／R&B

* Hip-hop / Rap（ヒップホップ／ラップ）
* Old-school / Golden age hip-hop
* Boom bap（ブーンバップ）
* East Coast / West Coast hip-hop
* Southern hip-hop
* G-funk（Gファンク）
* Gangsta rap（ギャングスタラップ）
* Trap（トラップ）
    * Drill（ドリル：UK/Chicago/Brooklyn）
* Cloud rap（クラウドラップ）
* Mumble rap（マンブルラップ）
* Conscious / Political hip-hop
* Alternative hip-hop（オルタナティブヒップホップ）
* Jazz rap（ジャズラップ）
* Lo-fi hip hop（ローファイヒップホップ）
* Emo rap（エモラップ）
* Latin hip-hop / Reggaeton（ラテン系ヒップホップ）
* Contemporary R&B（コンテンポラリーR&B）
    * Alternative R&B
    * Trap soul（トラップソウル）
    * New jack swing（ニュージャックスウィング）
    * Quiet storm

## ソウル／ファンク

* Soul（ソウル）
    * Motown sound（モータウン）
    * Memphis soul / Southern soul
    * Neo soul（ネオソウル）
    * Psychedelic soul
    * Northern soul
* Funk（ファンク）
    * P-Funk（Pファンク）
    * Funk rock
* Disco（ディスコ）
    * Nu-disco
* Gospel（ゴスペル）
* Rhythm and blues（リズム&ブルース：古典）

## ジャズ

* Dixieland / New Orleans jazz（ディキシーランド）
* Swing / Big band（スウィング／ビッグバンド）
* Bebop（ビバップ）
* Hard bop（ハードバップ）
* Cool jazz（クールジャズ）
* Modal jazz（モードジャズ）
* Free jazz（フリージャズ）
* Post-bop（ポストバップ）
* Jazz fusion（ジャズフュージョン）
* Smooth jazz（スムースジャズ）
* Latin jazz / Afro-Cuban jazz（ラテンジャズ）
* Acid jazz（アシッドジャズ）
* Nu jazz（ヌージャズ）
* Vocal jazz（ボーカルジャズ）
* Gypsy jazz（ジプシージャズ）

## ブルース

* Delta blues（デルタブルース）
* Chicago blues（シカゴブルース）
* Electric blues（エレクトリックブルース）
* Country blues（カントリーブルース）
* Jump blues（ジャンプブルース）
* Boogie-woogie（ブギウギ）
* Piedmont blues
* Blues rock（ブルースロック）
* Desert blues / African blues

## クラシック（芸術音楽）

* Medieval（中世）
* Renaissance（ルネサンス）
* Baroque（バロック）
* Classical period（古典派）
* Romantic（ロマン派）
* 20th-century / Modern classical（近現代）
* Contemporary classical（現代音楽）
* Opera（オペラ）
* Symphony / Concerto / Sonata（交響曲・協奏曲・ソナタなど形式）
* Chamber music（室内楽）
* Choral / Sacred music（合唱・宗教音楽）
* Minimalism（ミニマル音楽）
* Neoclassical（新古典主義）

## カントリー／フォーク

* Country（カントリー全般）
* Traditional / Honky-tonk（ホンキートンク）
* Bluegrass（ブルーグラス）
* Western swing（ウェスタンスウィング）
* Outlaw country（アウトローカントリー）
* Neotraditional country
* Country pop / Bro-country
* Alternative country / Americana（オルタナ・カントリー）
* Rockabilly（ロカビリー）
* Folk（フォーク全般）
    * Contemporary folk / Singer-songwriter
    * Indie folk（インディーフォーク）
    * Folk rock
    * Freak folk / Anti-folk
* Celtic（ケルト音楽）
* Zydeco / Cajun（ザディコ／ケイジャン）

## レゲエ／ジャマイカ系

* Ska（スカ）
* Rocksteady（ロックステディ）
* Reggae（レゲエ）
    * Roots reggae（ルーツレゲエ）
    * Lovers rock（ラヴァーズロック）
* Dub（ダブ）
* Dancehall（ダンスホール）
* Ragga / Raggamuffin（ラガ）
* Reggae fusion（レゲエフュージョン）

## ラテン音楽

* Salsa（サルサ）
* Cumbia（クンビア）
* Merengue（メレンゲ）
* Bachata（バチャータ）
* Reggaeton（レゲトン）
    * Latin trap（ラテントラップ）
    * Dembow（デンボウ）
* Regional Mexican（レヒオナル・メヒカーノ）
    * Mariachi / Ranchera
    * Norteño / Banda / Corridos
* Tango（タンゴ）
* Bossa nova（ボサノヴァ）
* Samba（サンバ）
* MPB（ブラジル・ポピュラー音楽）
* Flamenco / Nuevo flamenco（フラメンコ）
* Son cubano / Mambo（ソン／マンボ）
* Bolero（ボレロ）

## ワールドミュージック（アフリカ・アジア・カリブなど地域系）

**アフリカ**
* Afrobeat（アフロビート）※Fela Kuti（1938–1997、ナイジェリア）が1960年代後半に、ドラマー Tony Allen と共に創始。米国のブルース・ジャズ・ファンクと伝統的ヨルバ音楽を融合した近代的スタイル
* Afrobeats（現代西アフリカ・ポップ）※2000〜2010年代にナイジェリア・ガーナ・英国で発展した Afrobeat の後継。代表：Burna Boy、Wizkid、Davido、Mr Eazi、Tiwa Savage
* Highlife（ハイライフ／ガーナ）
* Soukous（スークース／コンゴ）
* Amapiano（アマピアノ）※南アフリカ・ハウテン州（Pretoria／Soweto 等）のタウンシップで2012年頃に発祥（Kwaito・deep house・jazz・lounge の融合、Zulu語で「the pianos」）。2019年に南ア国内で主流化。代表：Kabza De Small、DJ Maphorisa
* Gqom（ゴム／南アフリカ）
* Kwaito（クワイト／南アフリカ）
* Makossa（マコッサ／カメルーン）
* Mbalax（ンバラ／セネガル）
* Juju / Fuji（ナイジェリア）
* Mbube / Isicathamiya（南アフリカ合唱）
* Bongo Flava（タンザニア）

**アジア**
* Bollywood / Filmi（インド映画音楽）
* Indian classical（Hindustani / Carnatic）
* Bhangra（バングラ）
* Indi-pop（インドポップ）
* Gamelan（ガムラン／インドネシア）
* Dangdut（ダンドゥット／インドネシア）
* Enka（演歌／日本）
* Luk thung / Mor lam（タイ・イサーン系）
* V-pop（ベトナム）
* P-pop / OPM（フィリピン）
* Qawwali / Sufi（南アジア）

**カリブ・その他地域**
* Calypso（カリプソ）
* Soca（ソカ）
* Zouk（ズーク）
* Mento（メント）
* Kompa（コンパ／ハイチ）
* Fado（ファド／ポルトガル）
* Klezmer（クレズマー）

## アンビエント／実験音楽

* Ambient（アンビエント）
    * Dark ambient（ダークアンビエント）
    * Space ambient / Drone ambient
    * New age（ニューエイジ）
* Drone（ドローン）
* Noise（ノイズ）
* Musique concrète / Tape music（ミュージック・コンクレート）
* Experimental / Avant-garde（実験・前衛）
* Post-noise / Hypnagogic pop
* Plunderphonics（プランダーフォニックス）
* Lowercase / Field recording

## 映画・ゲーム・機能性音楽

* Film score / Soundtrack（映画音楽・サウンドトラック）
* Orchestral / Cinematic（オーケストラル／シネマティック）
* Epic / Trailer music（エピック／トレーラー音楽）
* Video game music / VGM（ゲーム音楽）
* Chiptune / 8-bit（チップチューン）
* Lo-fi hip hop / Study beats（作業用ローファイ）
* Production / Library music（劇伴・ライブラリ音楽）
* Musical theatre / Showtunes（ミュージカル）
* Holiday / Christmas music（季節・クリスマス音楽）

## Recommendations（プロジェクトへの提言）

1. **まずは「大分類×代表サブジャンル」でプロンプト辞書を作る。** 上記17系統をそのままカテゴリのタブ／タグ群として採用し、各ジャンル名を英語表記でプロンプトに投入するのが最も効率的。日本語補足は社内リファレンス用に併記する。
2. **プロンプトはジャンル名単独で終わらせない。** 実務ガイドの一致した知見として、「genre（ジャンル）＋ groove/BPM ＋ 主要楽器 ＋ vocal（性別・質感）＋ mood ＋ production texture」の順で5〜6要素を重ねると出力が安定する。例：`dark synth-pop, 112 BPM, warm analog synths, female falsetto, moody, spacious 80s production`。
3. **AI が得意な系統から着手する。** Suno のジャンル別信頼性検証では Synthwave・Lo-fi hip hop・Ambient・Cinematic が最も安定して高品質とされ、逆に「Rock」「Jazz」など広すぎる語は平均的で凡庸な出力になりやすい。まずは前者で品質基準を作り、後者は必ずサブジャンル（garage rock, hard bop 等）まで指定する運用にする。
4. **地域系ジャンルは「英語ジャンル名＋固有の楽器・言語指定」で精度が上がる。** 例：Amapiano なら `log drum bassline`、City Pop なら `funky bassline, lush chords, 80s Japanese city pop`、Bollywood なら `Hindustani vocals, tabla, harmonium` を添える。
5. **判断を変える閾値**：あるジャンル指定で6世代生成しても狙った音像に到達しない場合、(a) ジャンル語がAIの学習分布上で希薄と判断し、より上位の代表ジャンルへ切り替える、(b) BPMと楽器指定を先頭に移し「genre drift（ジャンル逸脱）」を抑える、の2段階で対処する。マイクロジャンル（例：mallsoft, drumfunk）は単独では機能しにくいため、必ず親ジャンル＋記述語とセットで使う。

## Caveats（留意点・前提）

* **系統の設定**：大分類は Wikipedia の音楽ジャンル・カテゴリ体系（Pop, Rock, Electronic, Hip-hop, Jazz, Blues, Classical, Country, Folk, Reggae, World, Metal, Punk, Soul/Funk, Experimental 等）を基礎とし、音楽生成AIプロンプトでの実用性を考慮して「ベース・ミュージック」「映画・ゲーム・機能性音楽」を独立させた。
* **粒度**：各系統について主要ジャンルと代表的サブジャンルまでを収録し、マニアックなマイクロジャンルは原則除外した。ただしプロンプトで頻用される City Pop、Anime song、Lo-fi hip hop、Synthwave、Vaporwave、Amapiano 等は積極的に含めた。
* **境界の曖昧さ**：ジャンルは文化的現象であり厳密な階層ではない。複数系統にまたがるジャンルは主たる系統に配置した。例：Synth-pop は POP に配置（エレクトロニックとの重複）、Trip hop は Downtempo（エレクトロニック）に配置（ヒップホップとの重複）、Reggaeton はラテンに配置（レゲエ／ヒップホップとの重複）、Rockabilly はロックとカントリー両方に登場、Disco はソウル／ファンク系統に置いたがダンス系統にも接続する。
* **地域特有ジャンル**：J-POP／K-POP／C-POP は POP 系統に、Enka や各国の伝統・ポップはワールド系統に配置した。Afrobeat（1960年代フェラ・クティ）と Afrobeats（2000年代以降の西アフリカ・ポップ）は別物として区別している。
* **情報源と信頼性**：Wikipedia 各ジャンルの infobox（AllMusic・RYM を集約）、Rate Your Music のジャンル階層、Every Noise at Once（Spotify データ、2023年12月以降更新停止）、および Suno/Udio のプロンプト実務ガイドを参照した。後者は「実際に使われるタグ」の把握には有用だが学術的定義の典拠ではなく、実務者情報として扱うべき点に注意。ジャンル定義には主観・流動性が伴い、分類には一定の揺れがあることに留意されたい。