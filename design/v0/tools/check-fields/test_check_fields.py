# -*- coding: utf-8 -*-
"""check_fields.py の保存データの検証（F0〜F11、依頼ごとの S・R・O 系）と、ツールプロファイルの検証（P0〜P11）の負例テスト。

使い方（リポジトリのどこからでも実行できる）:
    python tools/check-fields/test_check_fields.py

違反を仕込んだ入力を一時ファイルに書き、check_fields.py --song で検証して、
期待した検出コードが出ること、終了コードが期待どおりであることを確かめる。
仕様書のデータ（ツールプロファイル、fields.json）の違反は、docs/specifications の写しに変更を加え、--spec で検証する。
正例（docs/specifications の例）は、エラー 0・警告 0 で通ることを確かめる。
標準ライブラリだけで動く。F1（スキーマ）を使うケースは、jsonschema 4.18 以降がなければスキップする。
終了コード: 0 = すべて期待どおり、1 = 期待と違うケースがある。

仕様: docs/specifications/song-file.md §9-2、docs/specifications/tool-profile.md §10-2
"""
import copy
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = HERE.parents[1] / "docs" / "specifications"
CHECKER = HERE / "check_fields.py"
SONG = json.loads((SPEC / "song.example.json").read_text(encoding="utf-8"))
EXPORT = json.loads((SPEC / "song-export.example.json").read_text(encoding="utf-8"))
FACTORY = json.loads((SPEC / "factory-profiles.json").read_text(encoding="utf-8"))


def schema_support():
    try:
        import jsonschema  # noqa: F401
        import referencing  # noqa: F401
    except ImportError:
        return False
    return True


HAS_SCHEMA = schema_support()
_TMP = tempfile.TemporaryDirectory()


def spec_copy():
    """docs/specifications の写しを作る（仕様書のデータに違反を仕込むため）。"""
    dst = Path(tempfile.mkdtemp(dir=_TMP.name)) / "specifications"
    shutil.copytree(SPEC, dst)
    return dst


def run(obj, raw=None, strict=False, mutate=None):
    """obj か raw があれば --song で検証する。mutate（写しのディレクトリを受け取る関数）があれば、変更を加えた写しを --spec で検証する。"""
    cmd = [sys.executable, str(CHECKER)]
    if mutate is not None:
        spec = spec_copy()
        mutate(spec)
        cmd += ["--spec", str(spec)]
    if obj is not None or raw is not None:
        path = Path(_TMP.name) / "case.json"
        path.write_text(raw if raw is not None else json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
        cmd += ["--song", str(path)]
    if strict:
        cmd.append("--strict")
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    m = re.search(r"エラー (\d+) 件、警告 (\d+) 件", p.stderr)
    counts = (int(m.group(1)), int(m.group(2))) if m else (None, None)
    return p.returncode, p.stderr, counts


# ---------------------------------------------------------------------------
# 入力の作り方
# ---------------------------------------------------------------------------
def song(f=None):
    x = copy.deepcopy(SONG)
    if f:
        f(x)
    return x


def export(f=None):
    x = copy.deepcopy(EXPORT)
    if f:
        f(x)
    return x


def store(profiles=None, folders=None):
    return {"schemaVersion": 2,
            "folders": copy.deepcopy(EXPORT["folders"]) if folders is None else folders,
            "profiles": copy.deepcopy(EXPORT["profiles"]) if profiles is None else profiles}


def v1(x):
    """版2 のストア／ファイルを、版1 の形（folders なし、プロファイルに id・folderId なし）にする。"""
    x = copy.deepcopy(x)
    x["schemaVersion"] = 1
    x.pop("folders", None)
    for p in x["profiles"]:
        p.pop("id", None)
        p.pop("folderId", None)
    return x


def folder(fid, name, parent=None):
    return {"id": fid, "parentId": parent, "name": name}


def prof(pid, name, folder_id=None):
    """例のプロファイル（data は例のまま）の id・名前・所属を変えたもの。"""
    return dict(copy.deepcopy(EXPORT["profiles"][0]), id=pid, name=name, folderId=folder_id)


def req(x):
    """楽曲データの1件目の依頼。"""
    return x["requests"][0]


def in_export(f):
    """エクスポートファイルの、1件目のプロファイルの data（楽曲データ）に変更を加える。"""
    return export(lambda x: f(x["profiles"][0]["data"]))


def second_request(x, **changes):
    b = copy.deepcopy(req(x))
    b["id"] = "r2"
    b.update(changes)
    x["requests"].append(b)
    return b


CASES = []


def case(name, obj=None, rc=1, has=(), lacks=(), schema=False, strict=False, raw=None, counts=None, once=None, mutate=None):
    CASES.append(dict(name=name, obj=obj, rc=rc, has=list(has), lacks=list(lacks), schema=schema,
                      strict=strict, raw=raw, counts=counts, once=once, mutate=mutate))


# ---------------------------------------------------------------------------
# 正例
# ---------------------------------------------------------------------------
case("正例: song.example.json", song(), rc=0, counts=(0, 0), has=["形: 楽曲データ"])
case("正例: song-export.example.json", export(), rc=0, counts=(0, 0), has=["プロファイル 1 件"])
case("正例: factory-profiles.json（同梱のファクトリープロファイル6件）", copy.deepcopy(FACTORY), rc=0, counts=(0, 0), has=["プロファイル 6 件"], lacks=["F5"])
case("正例: factory-profiles.json はスキーマにも適合する", copy.deepcopy(FACTORY), schema=True, rc=0, counts=(0, 0), lacks=["F1"])
case("正例: ストア（プロファイル1件）", store(), rc=0, counts=(0, 0), has=["プロファイルのストア"])
case("正例: ストア（0件）", store([]), rc=0, counts=(0, 0))
case("正例: 名前が違うプロファイルが2件", export(lambda x: x["profiles"].append(
    dict(copy.deepcopy(x["profiles"][0]), id="p2", name="別の曲"))), rc=0, counts=(0, 0), lacks=["F5"])

# ---------------------------------------------------------------------------
# F0 形
# ---------------------------------------------------------------------------
case("F0: JSON として読めない", raw="{ this is not json", has=["F0 JSON として読めない"])
case("F0: 形を判別できない", {"foo": 1}, has=["F0 形を判別できない"])
case("F0: 旧形式（axes が最上位）", dict({"schemaVersion": 1}, **{k: v for k, v in req(song()).items() if k != "id"}),
     has=["F0 旧形式"])
case("F0: exportType が profiles 以外", export(lambda x: x.update(exportType="song")), has=["F0 exportType"])
case("F0: プロファイルに data がない", export(lambda x: x["profiles"][0].pop("data")),
     has=["F0 プロファイルがオブジェクトでない、または data がない"])
case("F0: axes の値がオブジェクトでない（例外で落ちない）",
     song(lambda x: req(x)["axes"].update(purpose="boss")), has=["F0 構造が不正"])

# ---------------------------------------------------------------------------
# F8 schemaVersion（新しい版・古い版は拒否し、それ以降を検証しない）
# ---------------------------------------------------------------------------
case("F8: 楽曲データの版が新しい", song(lambda x: x.update(schemaVersion=2)),
     has=["F8 新しい版"], lacks=["F6", "F2", "S1"])
case("F8: 楽曲データの版が古い", song(lambda x: x.update(schemaVersion=0)), has=["F8 古い版"])
case("F8: 楽曲データの版が整数でない", song(lambda x: x.update(schemaVersion="1")),
     has=["F8 schemaVersion がない、または整数でない"])
case("F8: エクスポートファイルの版が新しい", export(lambda x: x.update(schemaVersion=3)),
     has=["F8 新しい版"], lacks=["[プロファイル「"])
case("F8: プロファイルの data の版が新しい（外側の版とは別に判定する）",
     in_export(lambda d: d.update(schemaVersion=2)),
     has=["F8 新しい版", "[プロファイル「和風戦闘BGM」]"], lacks=["F1 スキーマ違反"])
case("F8: ストアの版が新しい", dict(store(), schemaVersion=3), has=["F8 新しい版（3。このツールが読めるのは 2 まで）"])
case("F8: エクスポートファイルの版が古い（移行が未定義）", export(lambda x: x.update(schemaVersion=0)),
     has=["F8 古い版（0）"], lacks=["[プロファイル「"])

# ---------------------------------------------------------------------------
# F2 依頼の id の一意
# ---------------------------------------------------------------------------
case("F2: 依頼の id が重複", song(lambda x: x["requests"].append(copy.deepcopy(req(x)))),
     has=["F2 依頼の id が重複"])

# ---------------------------------------------------------------------------
# F3 derivedFrom の参照先
# ---------------------------------------------------------------------------
case("F3: 参照先がない", song(lambda x: req(x).update(
    generationType="derived", derivedFrom={"source": "internal", "requestId": "zz", "operation": None})),
     has=["F3 derivedFrom の参照先の依頼がない"])
case("F3: 自己参照", song(lambda x: req(x).update(
    generationType="derived", derivedFrom={"source": "internal", "requestId": "r1", "operation": None})),
     has=["F3 derivedFrom が自分自身を指している"])


def _cycle(x):
    a = req(x)
    b = second_request(x, generationType="derived", derivedFrom={"source": "internal", "requestId": "r1", "operation": None})
    a.update(generationType="derived", derivedFrom={"source": "internal", "requestId": "r2", "operation": None})
    return b


case("F3: 循環", song(_cycle), has=["F3 derivedFrom を辿ると循環している"])
case("F3・F4: 正しい参照（new → derived）はエラーにならない（F6 の初版の制約だけが出る）",
     song(lambda x: second_request(x, generationType="derived",
                                   derivedFrom={"source": "internal", "requestId": "r1", "operation": "edit-vocals"})),
     has=["F6"], lacks=["F3", "F4", "F2", "F9"])

# ---------------------------------------------------------------------------
# F4 generationType と derivedFrom の整合
# ---------------------------------------------------------------------------
case("F4: new なのに derivedFrom がある", song(lambda x: req(x).update(
    derivedFrom={"source": "internal", "requestId": "r1", "operation": None})), has=["F4 generationType が new"])
case("F4: derived なのに derivedFrom が null", song(lambda x: req(x).update(generationType="derived")),
     has=["F4 generationType が derived"])

# ---------------------------------------------------------------------------
# F5 プロファイル名の一意
# ---------------------------------------------------------------------------
case("F5: name が重複（同じフォルダ）", export(lambda x: x["profiles"].append(
    dict(copy.deepcopy(x["profiles"][0]), id="p2"))),
     has=["F5 プロファイルの name が、同じフォルダの中で重複: '和風戦闘BGM'（要素 #0, #1）"], lacks=["F14"])
case("F5: ストア内の name が重複", store([prof("a", "曲"), prof("b", "曲")], []),
     has=["F5 プロファイルの name が、同じフォルダの中で重複: '曲'"])
case("F5: 別のフォルダなら同じ name でよい（判断ポイント68）",
     store([prof("a", "曲"), prof("b", "曲", "f1")], [folder("f1", "ゲーム")]), rc=0, counts=(0, 0), lacks=["F5"])

# ---------------------------------------------------------------------------
# F14〜F17 フォルダと id（版2。判断ポイント68）
# ---------------------------------------------------------------------------
case("F14: プロファイルの id が重複", store([prof("a", "曲1"), prof("a", "曲2")], []),
     has=["F14 プロファイルの id が重複: 'a'（要素 #0, #1）"], counts=(1, 0))
case("F14: フォルダの id が重複", store([], [folder("f", "A"), folder("f", "B")]),
     has=["F14 フォルダの id が重複: 'f'（要素 #0, #1）"], counts=(1, 0))
case("F14: フォルダとプロファイルの id は別々に一意を見る", store([prof("x", "曲", "x")], [folder("x", "A")]),
     rc=0, counts=(0, 0))
case("F14: id の形式は縛らない（UUID でなくてよい）", store([prof("1", "曲", "abc")], [folder("abc", "A")]),
     rc=0, counts=(0, 0))
case("F14: id が空はスキーマ違反", store([prof("", "曲")], []), schema=True, has=["F1 スキーマ違反: profiles/0/id"])
case("F15: プロファイルの folderId が実在しない", store([prof("a", "曲", "zz")], []),
     has=["F15 プロファイルの folderId が、実在するフォルダを指さない: 'zz'（要素 #0）"], counts=(1, 0))
case("F15: フォルダの parentId が実在しない", store([], [folder("f", "A", "zz")]),
     has=["F15 フォルダの parentId が、実在するフォルダを指さない: 'zz'（要素 #0）"], counts=(1, 0))
case("F16: フォルダが自分自身を親にしている", store([], [folder("f", "A", "f")]),
     has=["F16 フォルダの親子が循環している（要素 #0）"], counts=(1, 0))
case("F16: フォルダの親子が循環している（3つ。循環の外の子は指摘しない）",
     store([], [folder("a", "A", "c"), folder("b", "B", "a"), folder("c", "C", "b"), folder("d", "D", "a")]),
     once=("F16", 3), lacks=["要素 #3"])
case("F16: 深い入れ子は正しい（深さの上限なし）",
     store([prof("p", "曲", "e")], [folder("a", "A"), folder("b", "B", "a"), folder("c", "C", "b"),
                                   folder("d", "D", "c"), folder("e", "E", "d")]), rc=0, counts=(0, 0))
case("F17: フォルダの name が空白だけ", store([], [folder("f", "  ")]),
     has=["F17 フォルダの name が、前後の空白を除いて空（要素 #0）"], counts=(1, 0))
case("F17: フォルダの name が空はスキーマ違反", store([], [folder("f", "")]), schema=True,
     has=["F1 スキーマ違反: folders/0/name"])
case("F17: 同じ親の中でフォルダの name が重複", store([], [folder("a", "ゲーム"), folder("b", "ゲーム")]),
     has=["F17 フォルダの name が、同じ親の中で重複: 'ゲーム'（要素 #0, #1）"], counts=(1, 0))
case("F17: 親が違えば同じ name でよい", store([], [folder("a", "ゲーム"), folder("b", "ゲーム", "a")]),
     rc=0, counts=(0, 0))
case("F15: どのプロファイルからも参照されない空のフォルダがあってもよい（構成ごとの書き出し。判断ポイント69 の細部 (k)）",
     export(lambda x: x["folders"].extend([folder("e1", "空", x["folders"][0]["id"]), folder("e2", "空の下", "e1")])),
     rc=0, counts=(0, 0))
case("F1: 版2 のファイルに folders がない", export(lambda x: x.pop("folders")), schema=True,
     has=["F1 スキーマ違反: : 'folders' is a required property"])
case("F1: 版2 のプロファイルに id がない", export(lambda x: x["profiles"][0].pop("id")), schema=True,
     has=["F1 スキーマ違反: profiles/0: 'id' is a required property"])

# ---------------------------------------------------------------------------
# 版1 → 2 の移行（song-file.md §6-2。判断ポイント68）
# ---------------------------------------------------------------------------
case("移行: 版1 のエクスポートファイルは、版2 に移行して読める", v1(export()), rc=0, counts=(0, 0),
     has=["移行: 版1 のため、版2 に移行して検証する", "プロファイル 1 件"])
case("移行: 版1 のストアは、版2 に移行して読める", v1(store()), rc=0, counts=(0, 0),
     has=["移行: 版1 のため、版2 に移行して検証する", "プロファイルのストア"])
case("移行: 版1 のストア（0件）", v1(store([], [])), rc=0, counts=(0, 0), has=["移行: 版1"])
case("移行: 版1 のファイルも、版1 の形として検証する（folders は持てない）",
     dict(v1(export()), folders=[]), schema=True, has=["F1 スキーマ違反: : Additional properties"])
case("移行: 版1 のプロファイルは id を持てない", v1(export(lambda x: x["profiles"][0].update(name="曲"))) | {
    "profiles": [dict(v1(export())["profiles"][0], id="a")]}, schema=True, has=["F1 スキーマ違反: profiles/0: Additional properties"])
case("移行: 版1 の name の重複は、移行後もルートで重複（F5）",
     v1(store([prof("a", "曲"), prof("b", "曲")], [])), has=["F5 プロファイルの name が、同じフォルダの中で重複: '曲'"],
     lacks=["F14"])
case("移行: 移行した版1 のファイルの data も検証する", v1(in_export(lambda d: req(d).update(vocalMode="x"))),
     has=["[プロファイル「和風戦闘BGM」]"])

# ---------------------------------------------------------------------------
# F6 初版の制約
# ---------------------------------------------------------------------------
case("F6: 依頼が0件", song(lambda x: x.update(requests=[])), has=["F6 依頼はちょうど1件"])
case("F6: 依頼が2件", song(lambda x: second_request(x)),
     has=["F6 依頼はちょうど1件（初版の対象外: 2 件）"], lacks=["F2"])

# ---------------------------------------------------------------------------
# F12 vocalMode と lyricsAuthor の整合（L-01a。input-items.md 判断ポイント20。宿題38で F6 から分離）
# ---------------------------------------------------------------------------
def vocal_axes(structure_state="delegated"):
    """歌あり対応で必要な axes の更新（歌詞関連3項目は①指定）。structure_state が None なら structure は触らず（song.example.json の①指定のまま。S6 の負例用）。"""
    d = {
        "lyricsTheme": {"state": "specified", "value": "静かな夜に思いを巡らせる物語"},
        "lyricsLanguage": {"state": "specified", "value": "japanese"},
        "lyricsStructure": {"state": "specified", "value": ["intro", "verse", "chorus", "outro"]},
    }
    if structure_state is not None:
        d["structure"] = {"state": structure_state}
    return d


def vocal_song(lyrics_author="chat-ai", structure_state="delegated"):
    """vocalMode = vocal と、歌詞関連の項目を整えた依頼（既定では正例。structure_state を None にすれば S6 の負例を作れる）。"""
    def f(x):
        r = req(x)
        r.update(vocalMode="vocal", lyricsAuthor=lyrics_author)
        r["axes"].update(vocal_axes(structure_state))
    return song(f)


case("F12・正例: vocalMode が vocal、lyricsAuthor が chat-ai（歌詞関連項目も整えた正例）", vocal_song("chat-ai"), rc=0, counts=(0, 0))
case("F12・正例: vocalMode が vocal、lyricsAuthor が chat-ai-instruction", vocal_song("chat-ai-instruction"), rc=0, counts=(0, 0))
case("F12: vocalMode が vocal なのに lyricsAuthor が null（既定値のまま）",
     song(lambda x: req(x).update(vocalMode="vocal")),
     has=["F12 vocalMode が vocal のとき、lyricsAuthor は chat-ai／chat-ai-instruction のいずれかが必須: None"], lacks=["F6"])
case("F12: vocalMode が instrumental（既定値）なのに lyricsAuthor が null 以外",
     song(lambda x: req(x).update(lyricsAuthor="chat-ai")),
     has=["F12 vocalMode が instrumental のとき、lyricsAuthor は null: 'chat-ai'"], lacks=["F6"])
case("F1: lyricsAuthor が列挙にない値（F12 とスキーマ違反の両方が出る）",
     song(lambda x: req(x).update(vocalMode="vocal", lyricsAuthor="A")), schema=True,
     has=["F1 スキーマ違反: requests/0/lyricsAuthor", "F12 vocalMode が vocal のとき、lyricsAuthor は"])

# ---------------------------------------------------------------------------
# S6 vocalMode で無効になる項目に①指定がある（L-01。宿題38）
# ---------------------------------------------------------------------------
case("S6: vocalMode が vocal なのに structure（インスト専用）に①指定がある（song.example.json の structure を残したまま vocal にする）",
     vocal_song(structure_state=None), has=["S6 vocalMode vocal では無効な項目に①指定がある: structure"])
case("S6: vocalMode が instrumental（既定値）なのに lyricsTheme（歌あり専用）に①指定がある",
     song(lambda x: req(x)["axes"].update(lyricsTheme={"state": "specified", "value": "例"})),
     has=["S6 vocalMode instrumental では無効な項目に①指定がある: lyricsTheme"])

# ---------------------------------------------------------------------------
# F13 output.requestScope と vocalMode の整合（候補7。input-items.md 判断ポイント28）
# ---------------------------------------------------------------------------
def scoped_song(scope, lyrics_author="chat-ai", vocal=True):
    """requestScope を指定した依頼。vocal=False ならインスト（lyricsAuthor は null）。"""
    base = vocal_song(lyrics_author) if vocal else song()
    req(base)["output"]["requestScope"] = scope
    return base


case("F13・正例: 歌ありで requestScope が combined", scoped_song("combined"), rc=0, counts=(0, 0))
case("F13・正例: 歌ありで requestScope が style（lyricsAuthor は使わないが値は保持してよい）", scoped_song("style"), rc=0, counts=(0, 0))
case("F13・正例: 歌ありで requestScope が lyrics（chat-ai）", scoped_song("lyrics"), rc=0, counts=(0, 0))
case("F13・正例: 歌ありで requestScope が lyrics（chat-ai-instruction）", scoped_song("lyrics", "chat-ai-instruction"), rc=0, counts=(0, 0))
case("F13・正例: インストで requestScope が combined", scoped_song("combined", vocal=False), rc=0, counts=(0, 0))
case("F13・正例: requestScope を省略（既定は combined）", song(), rc=0, counts=(0, 0))
case("F13: インストなのに requestScope が style", scoped_song("style", vocal=False),
     has=["F13 output.requestScope が style のとき、vocalMode は vocal が必須"], counts=(1, 0))
case("F13: インストなのに requestScope が lyrics", scoped_song("lyrics", vocal=False),
     has=["F13 output.requestScope が lyrics のとき、vocalMode は vocal が必須"], counts=(1, 0))
case("O2: requestScope が選択肢にない値（both は lyricsAuthor の将来予約値で、ここでは取れない）",
     scoped_song("both"), has=["O2 選択肢にない値: output.requestScope = 'both'"], lacks=["F13"], counts=(1, 0))

# ---------------------------------------------------------------------------
# F7 ツールと版
# ---------------------------------------------------------------------------
case("F7: 未知の toolId", song(lambda x: req(x).update(toolId="udio")), has=["F7 未知の toolId"])
case("F7: toolVersion の差は警告（読み込みは止めない）", song(lambda x: req(x).update(toolVersion="v5")),
     rc=0, counts=(0, 1), has=["F7 toolVersion が対象ツールの版と違う"])
case("F7: --strict では、toolVersion の差もエラー", song(lambda x: req(x).update(toolVersion="v5")),
     rc=1, strict=True, has=["F7 toolVersion"])

# ---------------------------------------------------------------------------
# F1 スキーマ（jsonschema 4.18 以降が必要）
# ---------------------------------------------------------------------------
case("F1: 依頼の id が大文字", song(lambda x: req(x).update(id="R1")), schema=True, has=["F1 スキーマ違反"])
case("F1: derivedFrom が文字列", song(lambda x: req(x).update(derivedFrom="r1")), schema=True,
     has=["F1 スキーマ違反"])
case("F1: exportedAt にタイムゾーンがない", export(lambda x: x.update(exportedAt="2026-09-21T10:00:00")),
     schema=True, has=["F1 スキーマ違反: exportedAt"])
case("F1: プロファイルに未知のキー", export(lambda x: x["profiles"][0].update(folder="a/b")),
     schema=True, has=["F1 スキーマ違反: profiles/0"])
case("F1: ファイルの profiles が空", export(lambda x: x.update(profiles=[])), schema=True,
     has=["F1 スキーマ違反: profiles"])
case("F1: data の違反は1回だけ報告する（外側のスキーマと二重に数えない）",
     in_export(lambda d: req(d).update(id="R1")), schema=True, once=("F1 スキーマ違反", 1))

# ---------------------------------------------------------------------------
# 依頼ごとの S・R・O 系（既存の検証が、要素ごとに適用される）
# ---------------------------------------------------------------------------
case("S1: 未知の項目 id は拒否する（song-file.md §6-2 の4）",
     song(lambda x: req(x)["axes"].update(noSuchField={"state": "delegated"})),
     has=["[楽曲データ] 依頼 r1: S1 未知の項目: noSuchField"])
case("S2: 取れない状態", song(lambda x: req(x)["axes"].update(leadInstruments={"state": "defaulted"})), has=["S2"])
case("S4: 語彙にない語 id", song(lambda x: req(x)["axes"].update(
    mood={"state": "specified", "choices": {"no-such-term": "use"}})), has=["S4 語彙にない選択肢"])
case("S5: 指定なのに値が空", song(lambda x: req(x)["axes"].update(purpose={"state": "specified"})), has=["S5"])
case("R: 楽器の除外の連動（警告）", song(lambda x: req(x)["axes"].update(leadInstruments={
    "state": "specified", "choices": {"shakuhachi": "use", "guitar": "use"}})),
     rc=0, has=["R instrument-exclusion-linked"])
# 項目をまたぐ規則の残りの分岐（2026-10-18 追加。アプリへの移植の照合で、どのテストも通らない分岐として見つかった）
case("R: 楽器の除外が他の項目に反映されていない（警告。連動で補う）", song(lambda x: req(x)["axes"].update(
    accompanimentInstruments={"state": "specified", "choices": {"taiko": "use"}})),
     rc=0, has=["R instrument-exclusion-linked: guitar は他の項目で除外されているが、accompanimentInstruments に反映されていない"])
case("R: 用途が②お任せのとき、用途の詳細の①指定は②として扱う（警告）", song(lambda x: req(x)["axes"].update(
    purpose={"state": "delegated"}, purposeDetail={"state": "specified", "value": "ラスボス戦"})),
     rc=0, has=["R purposeDetail-follows-purpose"])
case("R: 地域・文化の様式に「使用する」がないとき、様式の寄せ方は出ない（情報）", song(lambda x: req(x)["axes"].update(
    regionStyles={"state": "delegated"})),
     rc=0, counts=(0, 0), has=["R styleLean-needs-region"])
case("R: 主ジャンルを副ジャンルで「使用しない」にしている（警告）", song(lambda x: req(x)["axes"].update(
    subGenres={"state": "specified", "choices": {"orchestral": "exclude"}})),
     rc=0, has=["R mainGenre-not-excluded"])
case("O2: 出力項目の値が不正", song(lambda x: req(x)["output"].update(variantCount="three")), has=["O2 数値でない"])


# --- recommendParams（項目ごとの真偽 `{項目 id: 真偽}`。input-items.md 判断ポイント18）---
def with_rec(v):
    return song(lambda x: req(x)["output"].update(recommendParams=v))
def rec_on_derived(v):
    def f(x):
        b = second_request(x, generationType="derived", derivedFrom={"source": "internal", "requestId": "r1", "operation": None})
        b["output"]["recommendParams"] = v
    return song(f)
case("O2: recommendParams は項目ごとの真偽（正例）", with_rec({"weirdness": True, "max-mode": False}), rc=0, counts=(0, 0))
case("O2: recommendParams が空のオブジェクト（すべてオフ）は通る", with_rec({}), rc=0, counts=(0, 0))
case("O2: recommendParams が真偽1つ（採らなかった案 B1）", with_rec(True),
     has=["O2 項目ごとの真偽（{項目 id: 真偽}）でない: output.recommendParams"])
case("O2: recommendParams が配列", with_rec(["weirdness"]),
     has=["O2 項目ごとの真偽（{項目 id: 真偽}）でない: output.recommendParams"])
case("O2: 項目の値が真偽値でない", with_rec({"weirdness": "on"}), has=["O2 真偽値でない: output.recommendParams.weirdness"])
case("O2: 項目の値が数値（真偽値として扱わない）", with_rec({"weirdness": 1}), has=["O2 真偽値でない: output.recommendParams.weirdness"])
case("O3: プロファイルにない項目", with_rec({"no-such-param": True}),
     has=["O3 プロファイルにない項目: output.recommendParams.no-such-param"])
case("O3: requestRole が recommend でないパラメータ（variation は input）", with_rec({"variation": True}),
     has=["O3 プロファイルにない項目: output.recommendParams.variation"])
case("O4: 通常モードに、リミックスだけのパラメータ（警告。無視される）", with_rec({"audio-influence": True}), rc=0, counts=(0, 1),
     has=["O4 output.recommendParams.audio-influence は、この依頼のモード（standard）にないため無視される"])
case("O4: リミックス（derived）では audio-influence は警告にならない（F6 の初版の制約だけが出る）",
     rec_on_derived({"audio-influence": True}), has=["F6"], lacks=["O3 ", "O4 "])
case("O3・O4: 未知の toolId では F7 だけを報告する（項目の一覧を判定できない）",
     song(lambda x: (req(x).update(toolId="udio"), req(x)["output"].update(recommendParams={"weirdness": True}))),
     has=["F7 未知の toolId"], lacks=["O3 ", "O4 ", "F0 構造が不正"], counts=(1, 0))
case("指摘に、プロファイル名と依頼 id の接頭辞が付く",
     in_export(lambda d: req(d)["axes"].update(noSuchField={"state": "delegated"})),
     has=["[プロファイル「和風戦闘BGM」] 依頼 r1: S1"])


# ---------------------------------------------------------------------------
# F9 派生元の操作種別（値の一覧は、ツールプロファイルの operations。song-file.md §3、tool-profile.md §4-3）
# 派生生成は初版の対象外（F6）なので、どのケースも F6 が併せて出る
# ---------------------------------------------------------------------------
def derived_song(op):
    return song(lambda x: second_request(x, generationType="derived", derivedFrom={"source": "internal", "requestId": "r1", "operation": op}))


case("F9: 操作種別が null は許される", derived_song(None), has=["F6"], lacks=["F9"])
case("F9: 第一候補の操作（edit-vocals）", derived_song("edit-vocals"), has=["F6"], lacks=["F9"])
case("F9: 候補の操作（cover）", derived_song("cover"), has=["F6"], lacks=["F9"])
case("F9: 未知の操作種別（暫定値だった add-vocal は取れない）", derived_song("add-vocal"),
     has=["F9 未知の操作種別: 'add-vocal'", "取れる値: cover, edit-instruments, edit-vocals"])
case("F9: 対象外（excluded）の操作", derived_song("trim"), has=["F9 依頼文の対象外の操作: 'trim'（scope: excluded）"])
case("F9: 保留（pending）の操作", derived_song("mashup"), has=["F9 依頼文の対象外の操作: 'mashup'（scope: pending）"])
case("F9: 未知の toolId では、F7 だけを報告する（プロファイルがないので操作を判定できない）",
     song(lambda x: second_request(x, toolId="udio", generationType="derived",
                                   derivedFrom={"source": "internal", "requestId": "r1", "operation": "add-vocal"})),
     has=["F7 未知の toolId: 'udio'（既知: suno）"], lacks=["F9"])


# ---------------------------------------------------------------------------
# F3・F10・F11 派生元の source と、元のスタイル（song-file.md §3。判断ポイント23〜27）
# 派生生成は初版の対象外（F6）なので、どのケースも F6 の3件（依頼が2件、generationType、derivedFrom）が併せて出る。
# 「正例」は、その3件だけで、警告が 0 であることを確かめる（counts=(3, 0)）
# ---------------------------------------------------------------------------
F6_ONLY = (3, 0)


def df_song(d):
    """new の依頼 r1 の隣に、derived の依頼 r2 を足す。d は r2 の derivedFrom そのもの（欠けたキーも再現できる）。"""
    return song(lambda x: second_request(x, generationType="derived", derivedFrom=copy.deepcopy(d)))


def internal(**kw):
    return dict({"source": "internal", "requestId": "r1", "operation": None}, **kw)


def external(**kw):
    return dict({"source": "external", "operation": None}, **kw)


def style(state, value=None):
    return dict({"state": state}, **({"value": value} if value is not None else {}))


NO_SOURCE_ERRORS = ["F3", "F10", "F11", "F9"]

# --- 正例（仕様書 §3 の形）--------------------------------------------------
case("F3・F10・F11: 仕様書 §3 の例（internal。元のスタイルの2項目が②お任せ、text なし）は、F6 の3件だけが出る",
     df_song(internal(operation="edit-vocals", sourceStyleText=None, sourceStyleEditMethod=style("delegated"),
                      sourceStyleCloseness=style("delegated"), originalLength=None)),
     has=["F6"], lacks=NO_SOURCE_ERRORS, counts=F6_ONLY)
case("F3・F10・F11: 全キーを持つ internal（text あり、change＋far、originalLength あり）",
     df_song(internal(operation="cover", sourceStyleText="lo-fi hip hop, mellow piano", sourceStyleEditMethod=style("specified", "change"),
                      sourceStyleCloseness=style("specified", "far"), originalLength=180)),
     has=["F6"], lacks=NO_SOURCE_ERRORS, counts=F6_ONLY)
case("F3・F10: external は requestId を持たなくてよい（externalSourceLabel を持てる）",
     df_song(external(externalSourceLabel="2025年の自作曲（Suno v4.5）")),
     has=["F6"], lacks=NO_SOURCE_ERRORS, counts=F6_ONLY)
case("F3: 最小の external（source と operation だけ）", df_song(external()), has=["F6"], lacks=NO_SOURCE_ERRORS, counts=F6_ONLY)
case("F3: external は、同じ楽曲データに元曲の依頼がなくても、参照先なしにならない",
     song(lambda x: req(x).update(generationType="derived", derivedFrom=external())),
     has=["F6"], lacks=["F3"])
case("F3: external の requestId（F10 の違反）は、循環の判定にたどらない（F10 だけが出る）",
     song(lambda x: (req(x).update(generationType="derived", derivedFrom=internal(requestId="r2")),
                     second_request(x, generationType="derived", derivedFrom=external(requestId="r1")))),
     has=["F10 source が external なのに requestId がある"], lacks=["F3"])
case("F3: 依頼 r2（internal）が、依頼 r1（external の derived）を指すのは、循環ではない",
     song(lambda x: (req(x).update(generationType="derived", derivedFrom=external()),
                     second_request(x, generationType="derived", derivedFrom=internal()))),
     has=["F6"], lacks=["F3", "F10"])

# --- F3 / F10 source と requestId・externalSourceLabel の整合 ---------------------
case("F3: internal なのに requestId がない", df_song({"source": "internal", "operation": None}),
     has=["F3 derivedFrom の参照先の依頼がない: None"], counts=(4, 0))
case("F3: internal の参照先がない（source を補っても検出される）", df_song(internal(requestId="zz")),
     has=["F3 derivedFrom の参照先の依頼がない: 'zz'"], counts=(4, 0))
case("F10: external なのに requestId がある", df_song(external(requestId="r1")),
     has=["F10 source が external なのに requestId がある"], lacks=["F3"], counts=(4, 0))
case("F10: internal なのに externalSourceLabel がある", df_song(internal(externalSourceLabel="別の曲")),
     has=["F10 source が internal なのに externalSourceLabel がある"], lacks=["F3"], counts=(4, 0))
case("F9: external でも、操作種別は検証される（未知の操作）", df_song(external(operation="add-vocal")),
     has=["F9 未知の操作種別: 'add-vocal'"], counts=(4, 0))
case("F9: external でも、対象外の操作（trim）はエラー", df_song(external(operation="trim")),
     has=["F9 依頼文の対象外の操作: 'trim'"], counts=(4, 0))
case("F9: external の第一候補の操作は通る", df_song(external(operation="edit-vocals")), has=["F6"], lacks=["F9"])

# --- F11 元のスタイル ----------------------------------------------------------
TXT = "ambient piano, soft pads"
case("F11: EditMethod が①指定なのに value がない",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("specified"))),
     has=["F11 ①指定なのに値が空: derivedFrom.sourceStyleEditMethod"], counts=(4, 0))
case("F11: Closeness が①指定なのに value がない",
     df_song(internal(sourceStyleText=TXT, sourceStyleCloseness=style("specified"))),
     has=["F11 ①指定なのに値が空: derivedFrom.sourceStyleCloseness"], counts=(4, 0))
case("F11: EditMethod が②お任せなのに value が残っている（警告。無視される）",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("delegated", "keep"))),
     has=["F11 ②お任せなのに値が残っている（無視される）: derivedFrom.sourceStyleEditMethod"], counts=(3, 1))
case("F11: Closeness が①指定、EditMethod が①指定の keep は矛盾",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("specified", "keep"),
                      sourceStyleCloseness=style("specified", "near"))),
     has=["F11 sourceStyleCloseness が①指定だが、sourceStyleEditMethod が keep"], counts=(4, 0))
case("F11: Closeness が①指定、EditMethod が①指定の change は正しい",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("specified", "change"),
                      sourceStyleCloseness=style("specified", "near"))),
     lacks=["F11"], counts=F6_ONLY)
case("F11: Closeness が①指定、EditMethod が②お任せは矛盾としない（近さを指定したなら change と読める）",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("delegated"),
                      sourceStyleCloseness=style("specified", "far"))),
     lacks=["F11"], counts=F6_ONLY)
case("F11: EditMethod が②お任せで value（keep）が残っていても、Closeness が①指定は矛盾としない（警告だけ）",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("delegated", "keep"),
                      sourceStyleCloseness=style("specified", "far"))),
     has=["F11 ②お任せなのに値が残っている"], lacks=["F11 sourceStyleCloseness が①指定だが"], counts=(3, 1))
case("F11: Closeness が①指定、EditMethod が省略は矛盾としない（省略時の初期状態は未確定。song-file.md §3-2）",
     df_song(internal(sourceStyleText=TXT, sourceStyleCloseness=style("specified", "far"))),
     lacks=["F11"], counts=F6_ONLY)
case("F11: EditMethod が keep でも、Closeness が②お任せなら矛盾としない（無効になるだけ）",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("specified", "keep"),
                      sourceStyleCloseness=style("delegated"))),
     lacks=["F11"], counts=F6_ONLY)
case("F11: sourceStyleText が null のとき、①指定の EditMethod は無効（警告）",
     df_song(internal(sourceStyleText=None, sourceStyleEditMethod=style("specified", "change"))),
     has=["F11 sourceStyleText が空のため、derivedFrom.sourceStyleEditMethod は無効"], counts=(3, 1))
case("F11: sourceStyleText が空白だけのとき、①指定の Closeness は無効（警告）",
     df_song(internal(sourceStyleText="  \n ", sourceStyleCloseness=style("specified", "near"))),
     has=["F11 sourceStyleText が空のため、derivedFrom.sourceStyleCloseness は無効"], counts=(3, 1))
case("F11: sourceStyleText がキーごとない（省略）とき、①指定の2項目は、それぞれ無効の警告",
     df_song(internal(sourceStyleEditMethod=style("specified", "change"), sourceStyleCloseness=style("specified", "far"))),
     has=["derivedFrom.sourceStyleEditMethod は無効", "derivedFrom.sourceStyleCloseness は無効"], counts=(3, 2))
case("F11: sourceStyleText が空でも、②お任せの2項目は警告にならない",
     df_song(internal(sourceStyleText="", sourceStyleEditMethod=style("delegated"), sourceStyleCloseness=style("delegated"))),
     lacks=["F11"], counts=F6_ONLY)
case("F11: 型が違う項目（文字列）は、チェッカー側では無視して落ちない（F1 が指摘する）",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod="keep", sourceStyleCloseness=5)),
     lacks=["F11", "F0 構造が不正"])
case("F11: --strict では、無効の警告もエラーになる",
     df_song(internal(sourceStyleText=None, sourceStyleEditMethod=style("specified", "change"))),
     strict=True, has=["F11 sourceStyleText が空のため"], counts=(3, 1))

# --- F1 スキーマ（derivedFrom の構造。jsonschema 4.18 以降が必要）------------------------
case("F1: 正例（全キー）は F1 に触れない",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("specified", "change"), sourceStyleCloseness=style("specified", "near"),
                      originalLength=240)), schema=True, lacks=["F1"], counts=F6_ONLY)
case("F1: source がない（旧形式の derivedFrom）", df_song({"requestId": "r1", "operation": None}),
     schema=True, has=["F1 スキーマ違反", "'source' is a required property"])
case("F1: source が未知の値", df_song(internal(source="other")), schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/source"])
case("F1: operation がない", df_song({"source": "internal", "requestId": "r1"}), schema=True,
     has=["'operation' is a required property"])
case("F1: derivedFrom に未知のキー（styleOnEnter は依頼文の対象外。判断ポイント25）", df_song(internal(styleOnEnter="keep-current")),
     schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom"])
case("F1: requestId が大文字", df_song(internal(requestId="R1")), schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/requestId"])
case("F1: sourceStyleText が数値", df_song(internal(sourceStyleText=7)), schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/sourceStyleText"])
case("F1: EditMethod の value が語彙にない（PartChange は採らなかった。判断ポイント26）",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("specified", "partial"))),
     schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/sourceStyleEditMethod/value"])
case("F1: EditMethod に、Closeness の値（near）を入れた",
     df_song(internal(sourceStyleText=TXT, sourceStyleEditMethod=style("specified", "near"))),
     schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/sourceStyleEditMethod/value"])
case("F1: Closeness に、EditMethod の値（keep）を入れた",
     df_song(internal(sourceStyleText=TXT, sourceStyleCloseness=style("specified", "keep"))),
     schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/sourceStyleCloseness/value"])
case("F1: EditMethod の状態が③（defaulted）。①②だけを取る", df_song(internal(sourceStyleEditMethod=style("defaulted"))),
     schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/sourceStyleEditMethod/state"])
case("F1: EditMethod に state がない", df_song(internal(sourceStyleEditMethod={"value": "keep"})),
     schema=True, has=["'state' is a required property"])
case("F1: EditMethod に未知のキー（choices）", df_song(internal(sourceStyleEditMethod={"state": "specified", "value": "keep", "choices": {}})),
     schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/sourceStyleEditMethod"])
case("F1: originalLength が 0", df_song(internal(originalLength=0)), schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/originalLength"])
case("F1: originalLength が小数", df_song(internal(originalLength=180.5)), schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/originalLength"])
case("F1: originalLength が文字列", df_song(internal(originalLength="180")), schema=True, has=["F1 スキーマ違反: requests/1/derivedFrom/originalLength"])
case("F1: originalLength が真偽値（整数として扱わない）", df_song(internal(originalLength=True)), schema=True,
     has=["F1 スキーマ違反: requests/1/derivedFrom/originalLength"])
case("F1: originalLength が null は通る", df_song(internal(originalLength=None)), schema=True, lacks=["F1"], counts=F6_ONLY)
case("F1: external でも、derivedFrom の構造はスキーマで検証される（未知のキー）", df_song(external(foo=1)), schema=True,
     has=["F1 スキーマ違反: requests/1/derivedFrom"])
case("F1: プロファイルの data の中の derivedFrom の違反は1回だけ報告する（外側のスキーマと二重に数えない）",
     in_export(lambda d: second_request(d, generationType="derived", derivedFrom=internal(originalLength=0))),
     schema=True, once=("F1 スキーマ違反", 1))


# ---------------------------------------------------------------------------
# 仕様書のデータに違反を仕込む（--spec）。写しの JSON を読み、変更して書き戻す
# ---------------------------------------------------------------------------
def _edit_json(rel, f):
    def m(spec):
        p = spec / rel
        d = json.loads(p.read_text(encoding="utf-8"))
        f(d)
        p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    return m


def edit_profile(f):
    return _edit_json("tool-profiles/suno.json", f)


def edit_fields(f):
    return _edit_json("fields.json", f)


def ops_of(p):
    return p["modes"][1]["operations"]


def op_of(p, oid):
    return next(o for o in ops_of(p) if o["id"] == oid)


def param_of(p, pid):
    return next(x for x in p["params"] if x["id"] == pid)


def out_of(d, oid):
    return next(o for o in d["output"] if o["id"] == oid)


def fld_of(d, fid):
    return next(f for f in d["fields"] if f["id"] == fid)


def pcase(name, kind="profile", **kw):
    """変更を加えた仕様書の写しを検証するケース。kind: profile（suno.json）、fields（fields.json）、raw（写しのディレクトリを直接受け取る）。"""
    def deco(f):
        mut = {"profile": edit_profile, "fields": edit_fields, "raw": lambda g: g}[kind](f)
        case(name, mutate=mut, **kw)
        return f
    return deco


# --- 正例: 変更なし・妥当な変更 ----------------------------------------------
case("正例: 変更のない写しは、エラー 0・警告 0 で通る", mutate=lambda spec: None, rc=0, counts=(0, 0), has=["ツールプロファイル 1。"])
case("P11: recommendParams の項目は、プロファイルの recommend のパラメータ（情報として出す）", mutate=lambda spec: None, rc=0,
     has=["P11 出力項目 recommendParams の項目: max-mode, weirdness, style-influence, audio-influence"])


# --- toolVersion の比較先・値の範囲・選択肢は、プロファイルが決める -------------------
def with_length(v):
    return song(lambda x: req(x)["axes"].update(length={"state": "specified", "value": v}))


def narrow_length(p):
    param_of(p, "length")["range"].update(min=30, max=240)


case("S4: 長さの下限（10）は通る", with_length(10), rc=0, counts=(0, 0))
case("S4: 長さの上限（360）は通る", with_length(360), rc=0, counts=(0, 0))
case("S4: 長さが上限を超える（361）", with_length(361), has=["S4 長さは10〜360の整数（秒）: length"])
case("S4: 長さが下限を下回る（9）", with_length(9), has=["S4 長さは10〜360の整数（秒）: length"])
case("S4: 長さが整数でない（180.5）", with_length(180.5), has=["S4 長さは10〜360の整数（秒）: length"])
case("S4: 長さが真偽値（整数として扱わない）", with_length(True), has=["S4 長さは10〜360の整数（秒）: length"])
case("S4: 長さの範囲はプロファイルが決める（30〜240 にすると、300 は範囲外）", with_length(300),
     mutate=edit_profile(narrow_length), has=["S4 長さは30〜240の整数（秒）: length"])
case("S4: 長さの範囲はプロファイルが決める（30〜240 にすると、200 は範囲内）", with_length(200),
     mutate=edit_profile(narrow_length), rc=0, counts=(0, 0))
case("O2: variation の値が、プロファイルの選択肢にない", song(lambda x: req(x)["output"].update(variation="extreme")),
     has=["O2 選択肢にない値: output.variation = 'extreme'"])
case("O2: variation の値が、プロファイルの選択肢にある（off）", song(lambda x: req(x)["output"].update(variation="off")),
     rc=0, counts=(0, 0))
case("O2: variation の選択肢はプロファイルが決める（off を消すと、off は不可）",
     song(lambda x: req(x)["output"].update(variation="off")),
     mutate=edit_profile(lambda p: param_of(p, "variation")["values"].pop(0)),
     has=["O2 選択肢にない値: output.variation = 'off'"])
case("F7: toolVersion の比較先は、プロファイルの version.id（v7 にすると、ファイルの v6 は警告）", song(),
     mutate=edit_profile(lambda p: (p["version"].update(id="v7"), p["meta"].update(targetVersion="v7"))),
     rc=0, counts=(0, 1), has=["F7 toolVersion が対象ツールの版と違う: ファイル 'v6'、対象 'v7'"])


# --- P0 ファイルと構造 --------------------------------------------------------
case("P0: プロファイルが JSON として読めない", mutate=lambda spec: (spec / "tool-profiles" / "suno.json").write_text("{ broken", encoding="utf-8"),
     has=["P0 [suno.json] JSON として読めない", "P0 ツールプロファイルが1つもない"])
case("P0: tool-profiles ディレクトリがない", mutate=lambda spec: shutil.rmtree(spec / "tool-profiles"), has=["P0 tool-profiles ディレクトリがない"])
case("P0: プロファイルが1つもない", mutate=lambda spec: (spec / "tool-profiles" / "suno.json").unlink(), has=["P0 ツールプロファイルが1つもない"])
case("P0: 最上位がオブジェクトでない", mutate=lambda spec: (spec / "tool-profiles" / "suno.json").write_text("[]", encoding="utf-8"),
     has=["P0 最上位がオブジェクトでない"])
case("P0: song を読む前に、プロファイルがなければ、依頼の toolId は未知になる", song(),
     mutate=lambda spec: shutil.rmtree(spec / "tool-profiles"), has=["F7 未知の toolId: 'suno'（既知: なし）"])


@pcase("P0: 必須キーがない（models）。スキーマ違反に加え、意味の検証は例外で落ちず、指摘して続ける", schema=True,
       has=["P0 スキーマ違反", "P0 構造が不正で、意味の検証を続けられない: KeyError"])
def _(p): del p["models"]


@pcase("P0: 未知のキー", schema=True, has=["P0 スキーマ違反"])
def _(p): p["foo"] = 1


@pcase("P0: scope と textInstruction の不整合（trim が yes）", schema=True, has=["P0 スキーマ違反: modes/1/operations/5"])
def _(p): op_of(p, "trim")["textInstruction"] = "yes"


@pcase("P0: scope と textInstruction の不整合（mashup が yes のまま pending）", schema=True, has=["P0 スキーマ違反: modes/1/operations/1"])
def _(p): op_of(p, "mashup")["textInstruction"] = "yes"


@pcase("P0: derived のモードに operations がない", schema=True, has=["P0 スキーマ違反: modes/1"])
def _(p): del p["modes"][1]["operations"]


@pcase("P0: 対象外の画面に reason がない", schema=True, has=["P0 スキーマ違反: screens/0"])
def _(p): del p["screens"][0]["reason"]


@pcase("P0: plan が「—」（none／pro／premier／null のいずれかでなければならない）", schema=True, has=["P0 スキーマ違反: modes/1/operations/0/plan"])
def _(p): op_of(p, "cover")["plan"] = "—"


@pcase("P0: 対応先が null なのに status がない", schema=True, has=["P0 スキーマ違反: bindings/3"])
def _(p): del p["bindings"][3]["status"]


@pcase("P0: 上限が confirmed なのに value がない", schema=True, has=["P0 スキーマ違反: fields/0/limit"])
def _(p): del p["fields"][0]["limit"]["value"]


@pcase("P0: select のパラメータに values がない", schema=True, has=["P0 スキーマ違反: params/6"])
def _(p): del param_of(p, "variation")["values"]


@pcase("P0: duration のパラメータに hasAuto がない", schema=True, has=["P0 スキーマ違反: params/1"])
def _(p): del param_of(p, "length")["hasAuto"]


@pcase("P0: 日付の形式が違う", schema=True, has=["P0 スキーマ違反: meta/confirmedAt"])
def _(p): p["meta"]["confirmedAt"] = "2026/09/12"


@pcase("P0: 項目の meta が空（上書きするキーが1つもない）", schema=True, has=["P0 スキーマ違反: fields/0/meta"])
def _(p): p["fields"][0]["meta"] = {}


# --- P1〜P10 意味の検証 -------------------------------------------------------
@pcase("P1: パラメータの id が重複", has=["P1 パラメータ の id が重複: vocal-gender"])
def _(p): p["params"].append(copy.deepcopy(p["params"][0]))


@pcase("P1: 操作の id が重複（モードをまたぐ場合も含む）", has=["P1 操作 の id が重複: cover"])
def _(p): ops_of(p).append(copy.deepcopy(op_of(p, "cover")))


@pcase("P1: values の id が重複", has=["P1 パラメータ variation の values の id が重複: off"])
def _(p): param_of(p, "variation")["values"].append({"id": "off", "label": "オフ2"})


@pcase("P2: モードの画面が supported でない", has=["P2 モード standard の画面 simple は supported ではない"])
def _(p): p["modes"][0]["screen"] = "simple"


@pcase("P2: モードの画面がない", has=["P2 モード standard の画面がない: nowhere"])
def _(p): p["modes"][0]["screen"] = "nowhere"


@pcase("P3: derived のモードがない（new が2つ）", has=["P3 generationType が derived のモードは1つだけ（0 個ある）"])
def _(p): p["modes"][1]["generationType"] = "new"


@pcase("P4: 欄のモードがない", has=["P4 欄 lyrics のモードがない: nomode"])
def _(p): p["fields"][0]["modes"] = ["nomode"]


@pcase("P4: パラメータのモードがない", has=["P4 パラメータ audio-influence のモードがない: nomode"])
def _(p): param_of(p, "audio-influence")["modes"] = ["nomode"]


@pcase("P5: select の既定値が values にない", has=["P5 パラメータ variation の既定値が values にない: 'extreme'"])
def _(p): param_of(p, "variation")["default"] = "extreme"


@pcase("P5: slider の既定値が range の外", has=["P5 パラメータ weirdness の既定値が range の外: 101"])
def _(p): param_of(p, "weirdness")["default"] = 101


@pcase("P5: toggle の既定値が真偽値でない", has=["P5 パラメータ max-mode の既定値が真偽値でない: 'off'"])
def _(p): param_of(p, "max-mode")["default"] = "off"


@pcase("P5: slider の range が min > max", has=["P5 パラメータ weirdness の range が min > max"])
def _(p): param_of(p, "weirdness")["range"].update(min=100, max=0)


@pcase("P5: duration の既定値が auto なのに hasAuto が偽", has=["P5 パラメータ length の既定値が auto だが、hasAuto が偽"])
def _(p): param_of(p, "length")["hasAuto"] = False


@pcase("P5: duration の既定値が range の外の整数", has=["P5 パラメータ length の既定値が auto でも range 内の整数でもない: 5"])
def _(p): param_of(p, "length")["default"] = 5


@pcase("P6: defaultDescriptionField が欄にない", has=["P6 defaultDescriptionField が欄にない: nofield"])
def _(p): p["defaultDescriptionField"] = "nofield"


@pcase("P6: 機能の field が欄にない", has=["P6 機能 exclusion-field の field が欄にない: nofield"])
def _(p): p["features"]["exclusion-field"]["field"] = "nofield"


@pcase("P7: bindings の対応先がない", has=["P7 bindings の対応先がない: axis:length → param:no-param"])
def _(p): p["bindings"][0]["target"]["id"] = "no-param"


@pcase("P7: bindings の item が fields.json の項目にない", has=["P7 bindings の item が fields.json の項目にない: axis:noSuchAxis"])
def _(p): p["bindings"].append({"item": {"kind": "axis", "id": "noSuchAxis"}, "target": {"kind": "field", "id": "style"}, "route": "text"})


@pcase("P7: bindings の item が fields.json の出力項目にない", has=["P7 bindings の item が fields.json の出力項目にない: output:noSuchOutput"])
def _(p): p["bindings"].append({"item": {"kind": "output", "id": "noSuchOutput"}, "target": {"kind": "field", "id": "style"}, "route": "text"})


@pcase("P7: bindings の item が重複", has=["P7 bindings の item が重複: axis:length"])
def _(p): p["bindings"].append(copy.deepcopy(p["bindings"][0]))


@pcase("P7: パラメータへの対応の route が text", has=["P7 パラメータへの対応の route は uiSetting または both: axis:length"])
def _(p): p["bindings"][0]["route"] = "text"


@pcase("P7: 欄への対応の route が uiSetting", has=["P7 欄への対応の route は text または both: output:titleSuggestions"])
def _(p): p["bindings"][2]["route"] = "uiSetting"


@pcase("P7: fields.json の具体化が uiSetting の項目（length）の route が both", has=["P7 fields.json の具体化が uiSetting の項目の route は uiSetting: axis:length（route both）"])
def _(p): p["bindings"][0]["route"] = "both"


@pcase("P8: scope が first の操作が2つ", has=["P8 scope が first の操作は高々1つ: cover, edit-vocals"])
def _(p): op_of(p, "cover")["scope"] = "first"


@pcase("P9: version.id と meta.targetVersion が違う", has=["P9 version.id（'v7'）と meta.targetVersion（'v6'）が違う"])
def _(p): p["version"]["id"] = "v7"


@pcase("P9: updatedAt が confirmedAt より前", has=["P9 updatedAt（2026-09-01）が meta.confirmedAt（2026-09-12）より前"])
def _(p): p["updatedAt"] = "2026-09-01"


case("P10: ファイル名と toolId が違う", mutate=lambda spec: (spec / "tool-profiles" / "suno.json").rename(spec / "tool-profiles" / "sun.json"),
     has=["P10 ファイル名（拡張子を除く）と toolId が違う: sun.json（toolId 'suno'）"])
case("P10: toolId が重複（別のファイルに同じ toolId）", mutate=lambda spec: shutil.copy(spec / "tool-profiles" / "suno.json", spec / "tool-profiles" / "suno2.json"),
     has=["P10 toolId が重複: 'suno'（suno.json と suno2.json）"])


# --- P11 fields.json との整合（参照先）・D1 スキーマ ------------------------------
@pcase("P11: variation の参照先のパラメータがない", kind="fields", has=["P11 出力項目 variation の参照先のパラメータがない: no-such"])
def _(d): out_of(d, "variation")["optionsFrom"] = {"param": "no-such"}


@pcase("P11: variation の参照先が select でない", kind="fields", has=["P11 出力項目 variation の参照先 length が select でない"])
def _(d): out_of(d, "variation")["optionsFrom"] = {"param": "length"}


@pcase("P11: variation の既定値が、参照先の選択肢にない", kind="fields", has=["P11 出力項目 variation の既定値が、参照先 variation の選択肢にない: ['extreme']"])
def _(d): out_of(d, "variation")["default"] = "extreme"


@pcase("P11: length の参照先のパラメータがない", kind="fields", has=["P11 項目 length の参照先のパラメータがない: no-such"])
def _(d): fld_of(d, "length")["rangeFrom"] = {"param": "no-such"}


@pcase("P11: length の参照先が duration でない", kind="fields", has=["P11 項目 length の参照先 variation が duration でない"])
def _(d): fld_of(d, "length")["rangeFrom"] = {"param": "variation"}


@pcase("P11: recommendParams の itemsFrom に該当するパラメータがない", kind="fields",
       has=["P11 出力項目 recommendParams の itemsFrom（requestRole none）に該当するパラメータがない"])
def _(d): out_of(d, "recommendParams")["itemsFrom"] = {"requestRole": "none"}


@pcase("P11: bindings の対応先が optionsFrom と違う", has=["P11 出力項目 variation の bindings の対応先が、optionsFrom（variation）と違う"])
def _(p): p["bindings"][1]["target"]["id"] = "length"


@pcase("P11: bindings の対応先が rangeFrom と違う", has=["P11 項目 length の bindings の対応先が、rangeFrom（length）と違う"])
def _(p): p["bindings"][0]["target"]["id"] = "variation"


@pcase("D1: variation が options と optionsFrom の両方を持つ", kind="fields", schema=True, has=["D1 スキーマ違反: output/3"])
def _(d): out_of(d, "variation")["options"] = [{"id": "off", "label": "オフ"}]


@pcase("D1: length が rangeFrom を持たない", kind="fields", schema=True, has=["D1 スキーマ違反: fields/16"])
def _(d): del fld_of(d, "length")["rangeFrom"]


@pcase("D1: recommendParams が itemsFrom を持たない", kind="fields", schema=True, has=["D1 スキーマ違反: output/8"])
def _(d): del out_of(d, "recommendParams")["itemsFrom"]


# --- leaveValues（「足させない」値。input-items.md 判断ポイント19）---
case("D12: 「足させない」値を持つ3項目（情報として出す）", mutate=lambda spec: None, rc=0, counts=(0, 0),
     has=["D12 「足させない」値: voiceTreatment → no-voice", "D12 「足させない」値: era → no-era",
          "D12 「足させない」値: listeningEnvironment → no-playback"])


@pcase("D12: 「足させない」値が語彙にない", kind="fields", has=["D12 「足させない」値が語彙にない: voiceTreatment → voice-treatment/no-such"])
def _(d): fld_of(d, "voiceTreatment")["leaveValues"] = ["no-such"]


@pcase("D12: 語彙の別の語なら通る（複数の値）", kind="fields", rc=0, counts=(0, 0),
       has=["D12 「足させない」値: voiceTreatment → no-voice, humming"])
def _(d): fld_of(d, "voiceTreatment")["leaveValues"] = ["no-voice", "humming"]


@pcase("D12: 3値の項目が leaveValues を持つ", kind="fields",
       has=["D12 「足させない」値（leaveValues）は単一選択の項目だけが持つ: leadInstruments"])
def _(d): fld_of(d, "leadInstruments")["leaveValues"] = ["piano"]


@pcase("D12: 語彙のない項目が leaveValues を持つ（語彙がないので、値も見つからない）", kind="fields",
       has=["D12 「足させない」値が語彙にない"])
def _(d): fld_of(d, "purposeDetail")["leaveValues"] = ["x"]


@pcase("D1: leaveValues が空の配列", kind="fields", schema=True, has=["D1 スキーマ違反: fields/14"])
def _(d): fld_of(d, "voiceTreatment")["leaveValues"] = []


# --- 出力項目の選択肢の description・targetGroups（UI 判断ポイント63）---
def diff_opt(d, oid):
    return next(x for x in out_of(d, "diffAxis")["options"] if x["id"] == oid)


@pcase("D13: 選択肢の対象のグループが未定義", kind="fields",
       has=["D13 選択肢の対象のグループが未定義: diffAxis/mood → no-such"])
def _(d): diff_opt(d, "mood")["targetGroups"] = ["mood-tone", "no-such"]


@pcase("D13: 定義済みの別のグループ（複数）なら通る", kind="fields", rc=0, counts=(0, 0))
def _(d): diff_opt(d, "interpretation")["targetGroups"] = ["time", "lyrics"]


@pcase("D13: 対象のグループの検査は、ほかの出力項目の選択肢にも効く", kind="fields",
       has=["D13 選択肢の対象のグループが未定義: outputLanguage/mixed → no-such"])
def _(d): next(x for x in out_of(d, "outputLanguage")["options"] if x["id"] == "mixed")["targetGroups"] = ["no-such"]


@pcase("D1: targetGroups が空の配列", kind="fields", schema=True, counts=(1, 0), has=["D1 スキーマ違反: output/1/options: "])
def _(d): diff_opt(d, "mood")["targetGroups"] = []


@pcase("D1: targetGroups が文字列", kind="fields", schema=True, counts=(1, 0), has=["D1 スキーマ違反: output/1/options: "])
def _(d): diff_opt(d, "mood")["targetGroups"] = "mood-tone"


@pcase("D1: 選択肢の description が空", kind="fields", schema=True, counts=(1, 0), has=["D1 スキーマ違反: output/1/options: "])
def _(d): diff_opt(d, "auto")["description"] = ""


@pcase("D1: leaveValues に重複がある", kind="fields", schema=True, has=["D1 スキーマ違反: fields/14"])
def _(d): fld_of(d, "voiceTreatment")["leaveValues"] = ["no-voice", "no-voice"]


@pcase("D1: select の項目（length 以外）が rangeFrom を持つ", kind="fields", schema=True, has=["D1 スキーマ違反: fields/0"])
def _(d): d["fields"][0]["rangeFrom"] = {"param": "length"}


# ---------------------------------------------------------------------------
# 移行の結果そのもの（--song の出力には現れないため、関数を直接呼ぶ）
# ---------------------------------------------------------------------------
def direct_migration():
    """版1 → 2 の移行の結果（song-file.md §4-2）。問題のリストを返す（空なら期待どおり）。"""
    sys.path.insert(0, str(HERE))
    import check_fields as cf
    n = iter(range(1, 100))
    src = v1(store([prof("a", "曲1"), prof("b", "曲2")], []))
    before = copy.deepcopy(src)
    out = cf.migrate_container(src, new_id=lambda: "n%d" % next(n))
    problems = []
    if out.get("schemaVersion") != 2 or out.get("folders") != []:
        problems.append("版2・folders が空になっていない: %r" % ({k: out.get(k) for k in ("schemaVersion", "folders")},))
    got = [(p.get("id"), p.get("folderId"), p.get("name")) for p in out.get("profiles", [])]
    if got != [("n1", None, "曲1"), ("n2", None, "曲2")]:
        problems.append("プロファイルの id・folderId が違う: %r" % (got,))
    if src != before:
        problems.append("引数を書き換えた")
    return problems


DIRECT = [("移行: 版1 → 2 の結果（版2、folders は空、各プロファイルに新しい id と folderId = null）", direct_migration)]


def main():
    failed, skipped = [], 0
    for name, f in DIRECT:
        problems = f()
        print("  %s  %s" % ("○" if not problems else "✗", name))
        if problems:
            failed.append((name, problems, ""))
    for c in CASES:
        if c["schema"] and not HAS_SCHEMA:
            skipped += 1
            print("  －  スキップ（jsonschema 4.18 以降が必要）: %s" % c["name"])
            continue
        rc, err, counts = run(c["obj"], raw=c["raw"], strict=c["strict"], mutate=c["mutate"])
        problems = []
        if rc != c["rc"]:
            problems.append("終了コードが %s（期待 %s）" % (rc, c["rc"]))
        for s in c["has"]:
            if s not in err:
                problems.append("出力にない: %r" % s)
        for s in c["lacks"]:
            if s in err:
                problems.append("出力にある（あってはならない）: %r" % s)
        if "Traceback" in err:
            problems.append("例外で落ちた")
        if c["counts"] is not None and counts != c["counts"]:
            problems.append("エラー・警告の件数が %s（期待 %s）" % (counts, c["counts"]))
        if c["once"] is not None and err.count(c["once"][0]) != c["once"][1]:
            problems.append("%r の出現が %d 回（期待 %d 回）" % (c["once"][0], err.count(c["once"][0]), c["once"][1]))
        print("  %s  %s" % ("○" if not problems else "✗", c["name"]))
        if problems:
            failed.append((c["name"], problems, err))
    for name, problems, err in failed:
        print("\n失敗: %s" % name)
        for p in problems:
            print("  - %s" % p)
        print("  --- 出力 ---")
        for line in err.rstrip().splitlines():
            print("  | " + line)
    total = len(CASES) + len(DIRECT)
    ran = total - skipped
    print("\n%d ケース中 %d 件を実行、%d 件が期待どおり、%d 件が失敗、%d 件をスキップ" % (
        total, ran, ran - len(failed), len(failed), skipped))
    return 1 if failed else 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
