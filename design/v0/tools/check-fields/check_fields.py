# -*- coding: utf-8 -*-
"""入力項目の定義（fields.json）と、語彙（presets/）・ツールプロファイル（tool-profiles/）との整合を確認する。楽曲データ（axes）の検証もできる。

使い方（リポジトリのどこからでも実行できる）:
    python tools/check-fields/check_fields.py                     # 項目定義を検証する
    python tools/check-fields/check_fields.py --song FILE.json    # 加えて、保存データ（楽曲データ／エクスポートファイル／プロファイルのストア。形は自動判別）を検証する
    python tools/check-fields/check_fields.py --markdown          # 項目一覧の Markdown の表を出力する（仕様書用）
    python tools/check-fields/check_fields.py --spec DIR          # docs/specifications の代わりに DIR を使う（負例のテスト用）

終了コード: 0 = エラーなし（警告はあってよい）、1 = エラーあり。--strict で警告もエラーにする。
標準ライブラリだけで動く。jsonschema があれば fields.schema.json による検証も行う（保存データのスキーマ検証 F1 は、jsonschema 4.18 以降が必要）。

仕様: docs/specifications/input-items.md（項目）、docs/specifications/song-file.md（保存データ）、docs/specifications/tool-profile.md（ツールプロファイル）
"""
import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SPEC = REPO / "docs" / "specifications"
FIELDS_FILE = SPEC / "fields.json"
SCHEMA_FILE = SPEC / "fields.schema.json"
PRESETS_DIR = SPEC / "presets"
TOOL_PROFILES_DIR = SPEC / "tool-profiles"
TOOL_PROFILE_SCHEMA_FILE = SPEC / "tool-profile.schema.json"

SPECIFICITY_LABEL = {"expand": "拡張可", "adapt": "翻案可", "keep": "保持", "uiSetting": "UI設定"}
STATE_NUMBER = {"specified": "①", "delegated": "②", "defaulted": "③", "toolManaged": "④"}

# vocalMode によって有効・無効が切り替わる項目（L-01。宿題38）。fields.json の note に記述されている内容をここで埋め込む
# vocalMode = instrumental のときのみ有効（歌ありでは無効）
INSTRUMENTAL_ONLY_FIELDS = {"structure"}
# vocalMode = vocal のときのみ有効（インストでは無効）
VOCAL_ONLY_FIELDS = {"lyricsTheme", "lyricsLanguage", "lyricsStructure"}
# vocalMode = vocal のとき取れる lyricsAuthor の値（L-01a。input-items.md 判断ポイント20）
VOCAL_LYRICS_AUTHORS = ("chat-ai", "chat-ai-instruction")
# output.requestScope のうち、vocalMode = vocal のときだけ取れる値（候補7。input-items.md 判断ポイント28）
VOCAL_ONLY_REQUEST_SCOPES = ("style", "lyrics")


class Report:
    def __init__(self):
        self.errors, self.warnings, self.notes = [], [], []
        self.scope = ""  # 保存データの検証で、どのプロファイル・依頼の指摘かを示す接頭辞

    def error(self, m):
        self.errors.append(self.scope + m)

    def warn(self, m):
        self.warnings.append(self.scope + m)

    def note(self, m):
        self.notes.append(self.scope + m)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_vocabularies(report):
    idx = load_json(PRESETS_DIR / "index.json")
    vocabs = {}
    for e in idx["vocabularies"]:
        v = load_json(PRESETS_DIR / e["file"])
        vocabs[v["id"]] = {"axis": v["axis"], "structure": v["structure"], "items": {i["id"] for i in v["items"]}}
    return vocabs


def field_items(f, vocabs):
    """項目が取れる値の集合。語彙（presets/）を持つ項目は語彙から、専用の語彙ファイルを持たず固定列挙を inline の options で持つ項目（例: lyricsLanguage）は options から。"""
    opts = f.get("options")
    if opts is not None:
        return {o["id"] for o in opts}
    return vocabs.get(f.get("vocabulary"), {}).get("items", set())


# ---------------------------------------------------------------------------
# 項目定義の検証
# ---------------------------------------------------------------------------
def check_definitions(fields, vocabs, report):
    if SCHEMA_FILE.exists():
        try:
            import jsonschema
        except ImportError:
            report.note("D1 jsonschema が未インストールのため、fields.schema.json による検証を省略")
        else:
            validator = jsonschema.Draft202012Validator(load_json(SCHEMA_FILE))
            for err in validator.iter_errors(fields):
                report.error("D1 スキーマ違反: %s: %s" % ("/".join(str(x) for x in err.absolute_path), err.message))
    else:
        report.note("D1 fields.schema.json がないため、スキーマ検証を省略")

    groups = {g["id"]: g for g in fields["groups"]}
    if len(groups) != len(fields["groups"]):
        report.error("D2 グループ id が重複している")
    by_id = {}
    for f in fields["fields"]:
        if f["id"] in by_id:
            report.error("D2 項目 id が重複: %s" % f["id"])
        by_id[f["id"]] = f
    out_ids = [o["id"] for o in fields["output"]]
    if len(set(out_ids)) != len(out_ids):
        report.error("D2 出力項目 id が重複している")
    if set(out_ids) & set(by_id):
        report.error("D2 出力項目 id が楽曲の項目 id と重複: %s" % sorted(set(out_ids) & set(by_id)))

    bound = {}
    for f in fields["fields"]:
        fid = f["id"]
        g = groups.get(f["group"])
        if not g:
            report.error("D2 未定義のグループ: %s → %s" % (fid, f["group"]))
        v = f.get("vocabulary")
        if v is not None:
            if v not in vocabs:
                report.error("D3 語彙がない: %s → %s" % (fid, v))
            else:
                bound.setdefault(v, []).append(fid)
                if g and vocabs[v]["axis"] != g["axis"]:
                    report.error("D4 グループの軸と語彙の軸が違う: %s（グループ %s、語彙 %s は軸%s）"
                                 % (fid, g["axis"], v, vocabs[v]["axis"]))
        st = f["states"]
        if f["initialState"] not in st:
            report.error("D5 初期状態が、取れる状態にない: %s → %s" % (fid, f["initialState"]))
        if f["specificity"] == "uiSetting" and f["kind"] != "length":
            report.error("D5 具体化『UI設定』は長さだけ: %s" % fid)
        if "defaulted" in st:
            if f["kind"] != "select":
                report.error("D6 既定値（③）は単一選択の項目だけが持つ: %s" % fid)
            elif st["defaulted"]["value"] not in field_items(f, vocabs):
                report.error("D6 既定値が語彙にない: %s → %s/%s" % (fid, v, st["defaulted"]["value"]))
        if "toolManaged" in st and f["kind"] != "length":
            report.error("D6 ツール任せ（④）は長さだけ: %s" % fid)
        d = st.get("delegated")
        if d and d["rule"] == "derive":
            for c in d["cues"]:
                if c != "*" and c not in {x["id"] for x in fields["fields"]}:
                    report.error("D7 手がかりが項目にない: %s → %s" % (fid, c))
                if c == fid:
                    report.error("D7 手がかりに自分自身を挙げている: %s" % fid)
            fb = d["fallback"]
            if fb["type"] == "value":
                if f["kind"] != "select":
                    report.error("D7 フォールバックの値は単一選択の項目だけ: %s" % fid)
                elif fb["value"] not in field_items(f, vocabs):
                    report.error("D7 フォールバックの値が語彙にない: %s → %s/%s" % (fid, v, fb["value"]))
        if f["kind"] in ("triSelect", "sectionList") and "defaulted" in st:
            report.error("D6 %s は既定値（③）を持てない: %s" % (f["kind"], fid))
        lv = f.get("leaveValues")
        if lv is not None:
            if f["kind"] != "select":
                report.error("D12 「足させない」値（leaveValues）は単一選択の項目だけが持つ: %s" % fid)
            for x in lv:
                if x not in field_items(f, vocabs):
                    report.error("D12 「足させない」値が語彙にない: %s → %s/%s" % (fid, v, x))
            report.note("D12 「足させない」値: %s → %s" % (fid, ", ".join(lv)))

    # 手がかりの循環は、手がかりは「値が決まっている項目だけ」を使う規則（input-items.md §2-3）により問題にならない。情報として出す
    graph = {f["id"]: [c for c in f["states"].get("delegated", {}).get("cues", []) if c != "*"] for f in fields["fields"]}
    for a, bs in graph.items():
        for b in bs:
            if a in graph.get(b, []) and a < b:
                report.note("D7 手がかりが相互に参照: %s ⇄ %s（値が決まっている項目だけを手がかりにする規則で解決）" % (a, b))

    # 交差項目の規則
    fk = {f["id"]: f for f in fields["fields"]}
    covered = set()
    for r in fields["crossFieldRules"]:
        t = r["type"]
        refs = [r.get("field"), r.get("source"), r.get("against"), (r.get("when") or {}).get("field")] + list(r.get("fields", []))
        for x in refs:
            if x and x not in fk:
                report.error("D8 規則が存在しない項目を参照: %s → %s" % (r["id"], x))
        if t == "linked-exclusion":
            fs = r["fields"]
            if any(fk[x]["kind"] != "triSelect" for x in fs if x in fk):
                report.error("D8 linked-exclusion は3値の項目だけ: %s" % r["id"])
            if len({fk[x].get("vocabulary") for x in fs if x in fk}) != 1:
                report.error("D8 linked-exclusion の項目は同じ語彙を共有する: %s" % r["id"])
            covered |= {frozenset((a, b)) for a in fs for b in fs if a != b}
        elif t == "single-not-excluded":
            a, b = fk.get(r["field"]), fk.get(r["against"])
            if a and a["kind"] != "select":
                report.error("D8 single-not-excluded の field は単一選択: %s" % r["id"])
            if b and b["kind"] != "triSelect":
                report.error("D8 single-not-excluded の against は3値: %s" % r["id"])
            if a and b and a.get("vocabulary") != b.get("vocabulary"):
                report.error("D8 single-not-excluded は同じ語彙の項目どうし: %s" % r["id"])
            covered.add(frozenset((r["field"], r["against"])))
        elif t == "active-when":
            if fk.get(r["when"]["field"], {}).get("kind") != "triSelect":
                report.error("D8 active-when の条件は3値の項目: %s" % r["id"])

    # 語彙を共有する項目間の矛盾に、規則があるか（3値の趣旨: 矛盾を入力できない構造にする）
    for v, fs in bound.items():
        if len(fs) < 2:
            continue
        for i, a in enumerate(fs):
            for b in fs[i + 1:]:
                can_exclude = [x for x in (a, b) if fk[x]["kind"] == "triSelect"]
                if can_exclude and frozenset((a, b)) not in covered:
                    report.error("D9 語彙 %s を共有する %s と %s の矛盾を扱う規則がない" % (v, a, b))
        report.note("D9 語彙を共有: %s ← %s" % (v, ", ".join(fs)))
    for v in vocabs:
        if v not in bound:
            report.warn("D10 どの項目にも結び付いていない語彙: %s" % v)

    # 出力項目
    for o in fields["output"]:
        k, dflt, opts = o["kind"], o["default"], o.get("options")
        ids = {x["id"] for x in opts} if opts else set()
        if k == "select" and dflt is not None and dflt not in ids and "optionsFrom" not in o:
            report.error("D11 出力項目の既定値が選択肢にない: %s" % o["id"])
        if k == "multiSelect" and not (isinstance(dflt, list) and set(dflt) <= ids) and "optionsFrom" not in o:
            report.error("D11 出力項目の既定値が選択肢にない: %s" % o["id"])
        if k in ("boolean", "perItemBoolean") and not isinstance(dflt, bool):
            report.error("D11 出力項目の既定値は真偽値: %s" % o["id"])
        if k == "number" and not isinstance(dflt, (int, float)):
            report.error("D11 出力項目の既定値は数値: %s" % o["id"])
        for x in opts or []:
            tg = x.get("targetGroups")
            for g in tg if isinstance(tg, list) else []:  # 配列でないものは D1（スキーマ）が報告する
                if g not in groups:
                    report.error("D13 選択肢の対象のグループが未定義: %s/%s → %s" % (o["id"], x["id"], g))
    return fk


# ---------------------------------------------------------------------------
# ツールプロファイルの検証（P0〜P11）
# 仕様: docs/specifications/tool-profile.md §10-2
# ---------------------------------------------------------------------------
def load_tool_profiles(report):
    """tool-profiles/*.json を読む。戻り値: [(ファイル名, 内容)]。読めないファイルは指摘して除く。"""
    entries = []
    if not TOOL_PROFILES_DIR.is_dir():
        report.error("P0 tool-profiles ディレクトリがない: %s" % TOOL_PROFILES_DIR)
        return entries
    for path in sorted(TOOL_PROFILES_DIR.glob("*.json")):
        try:
            entries.append((path.name, load_json(path)))
        except (OSError, ValueError) as e:
            report.error("P0 [%s] JSON として読めない: %s" % (path.name, e))
    if not entries:
        report.error("P0 ツールプロファイルが1つもない（%s）" % TOOL_PROFILES_DIR)
    return entries


def index_profiles(entries):
    """{toolId: プロファイル}。toolId がない・重複するものは含めない（指摘は check_tool_profiles が行う）。"""
    idx, dup = {}, set()
    for _, p in entries:
        tid = p.get("toolId") if isinstance(p, dict) else None
        if isinstance(tid, str):
            if tid in idx:
                dup.add(tid)
            idx[tid] = p
    for tid in dup:
        idx.pop(tid, None)
    return idx


def profile_param(profile, param_id):
    """プロファイルのパラメータ（なければ None）。"""
    if not isinstance(profile, dict):
        return None
    return next((x for x in profile.get("params", []) if isinstance(x, dict) and x.get("id") == param_id), None)


def _dups(ids):
    return sorted({i for i in ids if ids.count(i) > 1})


def check_tool_profiles(entries, fields, fk, report):
    base = report.scope
    validator = None
    if TOOL_PROFILE_SCHEMA_FILE.exists():
        try:
            import jsonschema
        except ImportError:
            report.note("P0 jsonschema が未インストールのため、tool-profile.schema.json による検証を省略")
        else:
            validator = jsonschema.Draft202012Validator(load_json(TOOL_PROFILE_SCHEMA_FILE))
    else:
        report.note("P0 tool-profile.schema.json がないため、スキーマ検証を省略")
    seen = {}
    try:
        for fn, p in entries:
            report.scope = base + "[ツールプロファイル %s] " % fn
            if not isinstance(p, dict):
                report.error("P0 最上位がオブジェクトでない")
                continue
            if validator is not None:
                for err in validator.iter_errors(p):
                    report.error("P0 スキーマ違反: %s: %s" % ("/".join(str(x) for x in err.absolute_path), err.message[:200]))
            tid = p.get("toolId")
            if isinstance(tid, str):
                if Path(fn).stem != tid:
                    report.error("P10 ファイル名（拡張子を除く）と toolId が違う: %s（toolId %r）" % (fn, tid))
                if tid in seen:
                    report.error("P10 toolId が重複: %r（%s と %s）" % (tid, seen[tid], fn))
                seen[tid] = fn
            try:
                check_one_profile(p, fields, fk, report)
            except (AttributeError, TypeError, KeyError) as e:
                report.error("P0 構造が不正で、意味の検証を続けられない: %s: %s" % (type(e).__name__, e))
    finally:
        report.scope = base


def check_one_profile(p, fields, fk, report):
    screens, modes, pfields, params = p["screens"], p["modes"], p["fields"], p["params"]
    ops = [o for m in modes for o in m.get("operations", [])]
    # P1 id の一意性
    for name, items in (("画面", screens), ("モード", modes), ("欄", pfields), ("パラメータ", params), ("操作", ops),
                        ("アカウント要素", p["accountFeatures"]), ("モデル", p["models"])):
        d = _dups([x["id"] for x in items])
        if d:
            report.error("P1 %s の id が重複: %s" % (name, ", ".join(d)))
    for prm in params:
        d = _dups([v["id"] for v in prm.get("values", [])])
        if d:
            report.error("P1 パラメータ %s の values の id が重複: %s" % (prm["id"], ", ".join(d)))
    # P2 モードの画面
    screen_by = {s["id"]: s for s in screens}
    for m in modes:
        s = screen_by.get(m["screen"])
        if s is None:
            report.error("P2 モード %s の画面がない: %s" % (m["id"], m["screen"]))
        elif not s["supported"]:
            report.error("P2 モード %s の画面 %s は supported ではない" % (m["id"], m["screen"]))
    # P3 generationType
    types = [m["generationType"] for m in modes]
    for t in ("new", "derived"):
        if types.count(t) != 1:
            report.error("P3 generationType が %s のモードは1つだけ（%d 個ある）" % (t, types.count(t)))
    # P4 欄・パラメータのモード
    mode_ids = {m["id"] for m in modes}
    for kind, items in (("欄", pfields), ("パラメータ", params)):
        for x in items:
            for md in x["modes"]:
                if md not in mode_ids:
                    report.error("P4 %s %s のモードがない: %s" % (kind, x["id"], md))
    # P5 パラメータの既定値
    for prm in params:
        k, d, rng = prm["kind"], prm["default"], prm.get("range")
        if rng is not None and rng["min"] > rng["max"]:
            report.error("P5 パラメータ %s の range が min > max" % prm["id"])
        if k == "select" and d not in [v["id"] for v in prm["values"]]:
            report.error("P5 パラメータ %s の既定値が values にない: %r" % (prm["id"], d))
        elif k == "slider" and not (is_num(d) and rng["min"] <= d <= rng["max"]):
            report.error("P5 パラメータ %s の既定値が range の外: %r" % (prm["id"], d))
        elif k == "toggle" and not isinstance(d, bool):
            report.error("P5 パラメータ %s の既定値が真偽値でない: %r" % (prm["id"], d))
        elif k == "duration":
            if d == "auto":
                if not prm["hasAuto"]:
                    report.error("P5 パラメータ %s の既定値が auto だが、hasAuto が偽" % prm["id"])
            elif not (isinstance(d, int) and not isinstance(d, bool) and rng["min"] <= d <= rng["max"]):
                report.error("P5 パラメータ %s の既定値が auto でも range 内の整数でもない: %r" % (prm["id"], d))
    # P6 欄の参照
    field_ids = {f["id"] for f in pfields}
    if p["defaultDescriptionField"] not in field_ids:
        report.error("P6 defaultDescriptionField が欄にない: %s" % p["defaultDescriptionField"])
    for fid, ft in p["features"].items():
        if "field" in ft and ft["field"] not in field_ids:
            report.error("P6 機能 %s の field が欄にない: %s" % (fid, ft["field"]))
    # P7 bindings
    param_ids = {x["id"] for x in params}
    out_by = {o["id"]: o for o in fields["output"]}
    seen = set()
    for b in p["bindings"]:
        it, tg, rt = b["item"], b["target"], b["route"]
        label = "%s:%s" % (it["kind"], it["id"])
        if (it["kind"], it["id"]) in seen:
            report.error("P7 bindings の item が重複: %s" % label)
        seen.add((it["kind"], it["id"]))
        if it["kind"] == "axis" and it["id"] not in fk:
            report.error("P7 bindings の item が fields.json の項目にない: %s" % label)
        if it["kind"] == "output" and it["id"] not in out_by:
            report.error("P7 bindings の item が fields.json の出力項目にない: %s" % label)
        if tg is not None:
            if tg["id"] not in (field_ids if tg["kind"] == "field" else param_ids):
                report.error("P7 bindings の対応先がない: %s → %s:%s" % (label, tg["kind"], tg["id"]))
            if tg["kind"] == "param" and rt == "text":
                report.error("P7 パラメータへの対応の route は uiSetting または both: %s" % label)
            if tg["kind"] == "field" and rt == "uiSetting":
                report.error("P7 欄への対応の route は text または both: %s" % label)
        if it["kind"] == "axis" and it["id"] in fk and fk[it["id"]]["specificity"] == "uiSetting" and rt != "uiSetting":
            report.error("P7 fields.json の具体化が uiSetting の項目の route は uiSetting: %s（route %s）" % (label, rt))
    # P8 派生生成の第一候補
    firsts = [o["id"] for o in ops if o["scope"] == "first"]
    if len(firsts) > 1:
        report.error("P8 scope が first の操作は高々1つ: %s" % ", ".join(firsts))
    # P9 版と日付
    if p["version"]["id"] != p["meta"]["targetVersion"]:
        report.error("P9 version.id（%r）と meta.targetVersion（%r）が違う" % (p["version"]["id"], p["meta"]["targetVersion"]))
    if p["updatedAt"] < p["meta"]["confirmedAt"]:
        report.error("P9 updatedAt（%s）が meta.confirmedAt（%s）より前" % (p["updatedAt"], p["meta"]["confirmedAt"]))
    # P11 fields.json との整合
    pk = {x["id"]: x for x in params}
    for o in fields["output"]:
        ref = o.get("optionsFrom")
        if ref:
            prm = pk.get(ref["param"])
            if prm is None:
                report.error("P11 出力項目 %s の参照先のパラメータがない: %s" % (o["id"], ref["param"]))
            elif prm["kind"] != "select":
                report.error("P11 出力項目 %s の参照先 %s が select でない" % (o["id"], ref["param"]))
            else:
                ids = [v["id"] for v in prm["values"]]
                dflt = o.get("default")
                bad = [dflt] if (o["kind"] == "select" and dflt is not None and dflt not in ids) else \
                      ([x for x in dflt if x not in ids] if o["kind"] == "multiSelect" and isinstance(dflt, list) else [])
                if bad:
                    report.error("P11 出力項目 %s の既定値が、参照先 %s の選択肢にない: %s" % (o["id"], ref["param"], bad))
            bd = next((b for b in p["bindings"] if b["item"] == {"kind": "output", "id": o["id"]}), None)
            if bd is not None and bd["target"] != {"kind": "param", "id": ref["param"]}:
                report.error("P11 出力項目 %s の bindings の対応先が、optionsFrom（%s）と違う" % (o["id"], ref["param"]))
        ir = o.get("itemsFrom")
        if ir:
            items = [x["id"] for x in params if x["requestRole"] == ir["requestRole"]]
            if not items:
                report.error("P11 出力項目 %s の itemsFrom（requestRole %s）に該当するパラメータがない" % (o["id"], ir["requestRole"]))
            else:
                report.note("P11 出力項目 %s の項目: %s" % (o["id"], ", ".join(items)))
    for f in fields["fields"]:
        rf = f.get("rangeFrom")
        if rf:
            prm = pk.get(rf["param"])
            if prm is None:
                report.error("P11 項目 %s の参照先のパラメータがない: %s" % (f["id"], rf["param"]))
            elif prm["kind"] != "duration":
                report.error("P11 項目 %s の参照先 %s が duration でない" % (f["id"], rf["param"]))
            bd = next((b for b in p["bindings"] if b["item"] == {"kind": "axis", "id": f["id"]}), None)
            if bd is not None and bd["target"] != {"kind": "param", "id": rf["param"]}:
                report.error("P11 項目 %s の bindings の対応先が、rangeFrom（%s）と違う" % (f["id"], rf["param"]))


# ---------------------------------------------------------------------------
# 依頼（request）1件の検証（axes・output。S・R・O 系）
# ---------------------------------------------------------------------------
def is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def check_per_item_boolean(key, o, v, req, profile, report):
    """項目ごとの真偽（perItemBoolean。いまは recommendParams）を検証する。値の形は `{項目 id: 真偽}`（input-items.md 判断ポイント18）。
    項目 id は、ツールプロファイルの、itemsFrom の requestRole を持つパラメータの id。省略した項目はオフ（fields.json の default）。
    O2 形が違う／真偽値でない、O3 プロファイルにない項目（エラー）、O4 この依頼のモードにない項目（警告。無視される）。"""
    if not isinstance(v, dict):
        report.error("O2 項目ごとの真偽（{項目 id: 真偽}）でない: output.%s" % key)
        return
    for item, b in v.items():
        if not isinstance(b, bool):
            report.error("O2 真偽値でない: output.%s.%s" % (key, item))
    if not isinstance(profile, dict):
        return  # 未知の toolId は F7 が指摘する。項目の一覧を判定できない
    role = (o.get("itemsFrom") or {}).get("requestRole")
    params = {x["id"]: x for x in profile.get("params", []) if isinstance(x, dict) and x.get("requestRole") == role}
    mode = next((m["id"] for m in profile.get("modes", []) if isinstance(m, dict) and m.get("generationType") == req.get("generationType")), None)
    for item in v:
        prm = params.get(item)
        if prm is None:
            report.error("O3 プロファイルにない項目: output.%s.%s（取れる項目: %s）" % (key, item, ", ".join(params) or "なし"))
        elif mode is not None and mode not in prm.get("modes", []):
            report.warn("O4 output.%s.%s は、この依頼のモード（%s）にないため無視される" % (key, item, mode))


def check_request(req, fields, fk, vocabs, report, profile=None):
    """依頼1件の axes・output を検証する。profile は、その依頼の toolId のツールプロファイル（未知の toolId なら None。F7 が指摘する）。"""
    axes = req.get("axes")
    if not isinstance(axes, dict):
        report.error("S0 axes がない")
        return
    for fid in axes:
        if fid not in fk:
            report.error("S1 未知の項目: %s" % fid)

    # S6 vocalMode で無効になる項目に（L-01。宿題38）①指定がある場合を検証する
    vocal_mode = req.get("vocalMode")
    disabled = INSTRUMENTAL_ONLY_FIELDS if vocal_mode == "vocal" else VOCAL_ONLY_FIELDS if vocal_mode == "instrumental" else set()
    for fid in sorted(disabled):
        a = axes.get(fid)
        if isinstance(a, dict) and a.get("state") == "specified":
            report.error("S6 vocalMode %s では無効な項目に①指定がある: %s" % (vocal_mode, fid))
    state_of = {}
    for fid, f in fk.items():
        a = axes.get(fid)
        if a is None:
            state_of[fid] = f["initialState"]  # 省略時は初期状態
            continue
        allowed_keys = {"state", "value", "choices", "freeText"}
        for k in a:
            if k not in allowed_keys:
                report.error("S1 未知のキー: %s.%s" % (fid, k))
        st = a.get("state")
        if st not in f["states"]:
            report.error("S2 取れない状態: %s.state = %r（取れる状態: %s）" % (fid, st, ", ".join(f["states"])))
            continue
        state_of[fid] = st
        vocab_items = field_items(f, vocabs)
        if st != "specified":
            if any(k in a for k in ("value", "choices", "freeText")):
                report.warn("S3 ①指定でないのに値が残っている（無視される）: %s" % fid)
            continue
        kind, has_free = f["kind"], f["freeText"]
        free = a.get("freeText")
        if free is not None and (not isinstance(free, str) or not has_free):
            report.error("S4 freeText を持てない、または文字列でない: %s" % fid)
        free_ok = isinstance(free, str) and free.strip() != ""
        if kind == "select":
            v = a.get("value")
            if v is not None and v not in vocab_items:
                report.error("S4 語彙にない値: %s.value = %r" % (fid, v))
            if v is None and not free_ok:
                report.error("S5 ①指定なのに値が空: %s" % fid)
        elif kind == "triSelect":
            ch = a.get("choices", {})
            if not isinstance(ch, dict):
                report.error("S4 choices がオブジェクトでない: %s" % fid)
                ch = {}
            for k, val in ch.items():
                if k not in vocab_items:
                    report.error("S4 語彙にない選択肢: %s.choices.%s" % (fid, k))
                if val not in ("use", "exclude"):
                    report.error("S4 3値は use / exclude のいずれか（未指定はキーを持たない）: %s.choices.%s = %r" % (fid, k, val))
            if not ch and not free_ok:
                report.error("S5 ①指定なのに値が空: %s" % fid)
        elif kind == "text":
            v = a.get("value")
            if not (isinstance(v, str) and v.strip()):
                report.error("S5 ①指定なのに値が空: %s" % fid)
        elif kind == "bpm":
            v = a.get("value")
            ok = (is_num(v) and v > 0) or (isinstance(v, dict) and set(v) == {"min", "max"} and is_num(v["min"]) and is_num(v["max"]) and 0 < v["min"] <= v["max"])
            if not ok:
                report.error("S4 BPM は正の数、または {min, max}（min ≤ max）: %s" % fid)
        elif kind == "length":
            v = a.get("value")
            rf = f.get("rangeFrom")
            prm = profile_param(profile, rf["param"]) if rf else None
            rng = prm.get("range") if prm else None  # 範囲は、ツールプロファイルのパラメータが持つ（tool-profile.md §9）
            lo, hi = (rng["min"], rng["max"]) if rng else (1, None)
            if not (isinstance(v, int) and not isinstance(v, bool) and v >= lo and (hi is None or v <= hi)):
                report.error("S4 長さは%s（秒）: %s" % (("%d〜%dの整数" % (lo, hi)) if rng else "正の整数", fid))
        elif kind == "sectionList":
            v = a.get("value")
            if not (isinstance(v, list) and v and all(x in vocab_items for x in v)):
                report.error("S4 構成はセクション id の空でない並び: %s" % fid)

    # 交差項目の規則
    def choices(fid):
        a = axes.get(fid) or {}
        return a.get("choices", {}) if a.get("state") == "specified" and isinstance(a.get("choices"), dict) else {}

    for r in fields["crossFieldRules"]:
        emit = {"info": report.note, "warning": report.warn, "error": report.error}[r["severity"]]
        t = r["type"]
        if t == "follows-delegated":
            if state_of.get(r["field"]) == "specified" and state_of.get(r["source"]) == "delegated":
                emit("R %s: %s は①指定だが、%s が②お任せのため②として扱われる" % (r["id"], r["field"], r["source"]))
        elif t == "active-when":
            cond = r["when"]
            active = choices(cond["field"]) and any(v == cond["choice"] for v in choices(cond["field"]).values())
            if state_of.get(r["field"]) in ("specified",) and not active:
                emit("R %s: %s は指定されているが、条件（%s が「%s」を含む）を満たさないため依頼文に出ない" % (r["id"], r["field"], cond["field"], cond["choice"]))
        elif t == "linked-exclusion":
            excluded = {i for fid in r["fields"] for i, v in choices(fid).items() if v == "exclude"}
            for i in sorted(excluded):
                for fid in r["fields"]:
                    cur = choices(fid).get(i)
                    if cur == "use":
                        emit("R %s: %s が %s で「使用する」、他の項目で「使用しない」（除外を優先して解決する）" % (r["id"], i, fid))
                    elif cur is None and axes.get(fid) is not None and state_of.get(fid) == "specified":
                        emit("R %s: %s は他の項目で除外されているが、%s に反映されていない（連動で補う）" % (r["id"], i, fid))
        elif t == "single-not-excluded":
            main = (axes.get(r["field"]) or {})
            v = main.get("value") if main.get("state") == "specified" else None
            if v is not None and choices(r["against"]).get(v) == "exclude":
                emit("R %s: 主ジャンル %s が %s で「使用しない」になっている" % (r["id"], v, r["against"]))

    # 出力項目
    out = req.get("output")
    if isinstance(out, dict):
        oc = {o["id"]: o for o in fields["output"]}
        for k, v in out.items():
            o = oc.get(k)
            if not o:
                report.error("O1 未知の出力項目: %s" % k)
                continue
            ids = {x["id"] for x in (o.get("options") or [])}
            checkable = True
            if o.get("optionsFrom"):  # 選択肢は、ツールプロファイルのパラメータが持つ
                prm = profile_param(profile, o["optionsFrom"]["param"])
                ids = {x["id"] for x in prm.get("values", [])} if prm else set()
                checkable = prm is not None  # 未知の toolId は F7 が指摘する
            if checkable and o["kind"] == "select" and v is not None and v not in ids:
                report.error("O2 選択肢にない値: output.%s = %r" % (k, v))
            if checkable and o["kind"] == "multiSelect" and not (isinstance(v, list) and set(v) <= ids):
                report.error("O2 選択肢にない値: output.%s = %r" % (k, v))
            if o["kind"] == "boolean" and not isinstance(v, bool):
                report.error("O2 真偽値でない: output.%s" % k)
            if o["kind"] == "perItemBoolean":
                check_per_item_boolean(k, o, v, req, profile, report)
            if o["kind"] == "number" and not is_num(v):
                report.error("O2 数値でない: output.%s" % k)


# ---------------------------------------------------------------------------
# 保存データ（楽曲データ・エクスポートファイル・プロファイルのストア）の検証
# 仕様: docs/specifications/song-file.md §6・§9
# ---------------------------------------------------------------------------
SUPPORTED_SCHEMA_VERSION = 1
SONG_SCHEMA_FILE = SPEC / "song.schema.json"
EXPORT_SCHEMA_FILE = SPEC / "song-export.schema.json"


def use_spec_dir(spec):
    """仕様書のディレクトリ（docs/specifications に相当）を差し替える。負例のテストが、変更を加えた写しを検証するために使う。"""
    global SPEC, FIELDS_FILE, SCHEMA_FILE, PRESETS_DIR, TOOL_PROFILES_DIR, TOOL_PROFILE_SCHEMA_FILE, SONG_SCHEMA_FILE, EXPORT_SCHEMA_FILE
    SPEC = Path(spec).resolve()
    FIELDS_FILE, SCHEMA_FILE, PRESETS_DIR = SPEC / "fields.json", SPEC / "fields.schema.json", SPEC / "presets"
    TOOL_PROFILES_DIR, TOOL_PROFILE_SCHEMA_FILE = SPEC / "tool-profiles", SPEC / "tool-profile.schema.json"
    SONG_SCHEMA_FILE, EXPORT_SCHEMA_FILE = SPEC / "song.schema.json", SPEC / "song-export.schema.json"


def load_schema_validators(report):
    """song.schema.json・song-export.schema.json の検証器を返す。使えなければ None（F1 を省略する）。
    相対の $ref（song.schema.json）の解決に、jsonschema 4.18 以降の referencing を使う。"""
    if not (SONG_SCHEMA_FILE.exists() and EXPORT_SCHEMA_FILE.exists()):
        report.note("F1 song.schema.json / song-export.schema.json がないため、スキーマ検証を省略")
        return None
    try:
        import jsonschema
        from referencing import Registry, Resource
    except ImportError:
        report.note("F1 jsonschema（4.18 以降）が未インストールのため、保存データのスキーマ検証を省略")
        return None
    song, export = load_json(SONG_SCHEMA_FILE), load_json(EXPORT_SCHEMA_FILE)
    registry = Registry()
    for s in (song, export):
        registry = registry.with_resource(s["$id"], Resource.from_contents(s))

    def make(schema):
        return jsonschema.Draft202012Validator(schema, registry=registry, format_checker=jsonschema.FormatChecker())

    return {
        "song": make(song),
        "file": make(export),
        "store": make({"$schema": export["$schema"], "$ref": export["$id"] + "#/$defs/profileStore"}),
    }


def check_by_schema(validator, obj, report, skip_data=False):
    """F1 スキーマ適合。skip_data=True のときは、プロファイルの data の中の違反を数えない（data ごとに別に検証するため）。"""
    if validator is None:
        return
    for err in validator.iter_errors(obj):
        path = list(err.absolute_path)
        if skip_data and len(path) >= 3 and path[0] == "profiles" and path[2] == "data":
            continue
        report.error("F1 スキーマ違反: %s: %s" % ("/".join(str(x) for x in path), err.message[:200]))


def check_version(obj, report):
    """F8 schemaVersion（song-file.md §6-2 の 1〜3）。読めない版なら False を返し、以降の検証を省く（部分的に読まない）。"""
    v = obj.get("schemaVersion")
    if isinstance(v, bool) or not isinstance(v, int):
        report.error("F8 schemaVersion がない、または整数でない: %r" % (v,))
        return False
    if v > SUPPORTED_SCHEMA_VERSION:
        report.error("F8 新しい版（%d。このツールが読めるのは %d まで）のため、拒否する" % (v, SUPPORTED_SCHEMA_VERSION))
        return False
    if v < SUPPORTED_SCHEMA_VERSION:
        report.error("F8 古い版（%d）で、移行が未定義のため、拒否する" % v)
        return False
    return True


def derived_ref(r):
    """依頼 r の derivedFrom が指す、同じ楽曲データ内の依頼 id。外部の曲（source = external）は、指す依頼を持たない（None）。"""
    df = r.get("derivedFrom") if isinstance(r, dict) else None
    if not isinstance(df, dict) or df.get("source") == "external":
        return None
    return df.get("requestId")


def follows_cycle(rid, by_id):
    seen, cur = {rid}, derived_ref(by_id.get(rid))
    while isinstance(cur, str) and cur in by_id:
        if cur in seen:
            return True
        seen.add(cur)
        cur = derived_ref(by_id[cur])
    return False


def check_operation(op, profile, report):
    """F9 derivedFrom.operation（song-file.md §3。値の一覧はツールプロファイル。tool-profile.md §4-3）。"""
    if op is None or not isinstance(op, str):  # null は許される。文字列でない値は F1（スキーマ）が指摘する
        return
    ops = {o["id"]: o for m in profile["modes"] for o in m.get("operations", [])}
    o = ops.get(op)
    if o is None:
        allowed = sorted(k for k, v in ops.items() if v["scope"] in ("candidate", "first"))
        report.error("F9 未知の操作種別: %r（ツールプロファイル %s の operations にない。取れる値: %s）" % (op, profile["toolId"], ", ".join(allowed)))
    elif o["scope"] not in ("candidate", "first"):
        report.error("F9 依頼文の対象外の操作: %r（scope: %s）" % (op, o["scope"]))


def check_derived_source(r, df, by_id, report):
    """F3 参照先の依頼（source が external 以外）、F10 source と requestId・externalSourceLabel の整合（song-file.md §3。判断ポイント23）。
    source がない・未知の値は F1（スキーマ）が指摘する。"""
    src, rid = df.get("source"), r.get("id")
    if src == "external":
        if "requestId" in df:
            report.error("F10 source が external なのに requestId がある（外部の曲は、同じ楽曲データ内の依頼を指さない）: %r" % (df["requestId"],))
        return
    if src == "internal" and "externalSourceLabel" in df:
        report.error("F10 source が internal なのに externalSourceLabel がある（元曲は requestId が指す依頼）")
    ref = derived_ref(r)
    if ref == rid:
        report.error("F3 derivedFrom が自分自身を指している: %r" % (ref,))
    elif not isinstance(ref, str) or ref not in by_id:
        report.error("F3 derivedFrom の参照先の依頼がない: %r" % (ref,))
    elif follows_cycle(rid, by_id):
        report.error("F3 derivedFrom を辿ると循環している（起点 %r）" % (rid,))


def _is_blank(x):
    return not (isinstance(x, str) and x.strip())


def check_source_style(df, report):
    """F11 元のスタイル（sourceStyleText・sourceStyleEditMethod・sourceStyleCloseness）の規則（song-file.md §3。判断ポイント24・26）。
    値の型・取れる値は F1（スキーマ）が指摘する。この関数は、スキーマで表せない、項目どうしの整合だけを見る。
    - ①指定なのに value がない（エラー）、②お任せなのに value が残っている（警告。無視される）
    - sourceStyleCloseness が①指定なのに、sourceStyleEditMethod が①指定の keep（エラー。近さは change のときだけ有効）。EditMethod が②お任せ・省略なら、矛盾とは言えない
    - sourceStyleText が空のとき、①指定の EditMethod・Closeness は無効（警告。依頼文に出ない）"""
    items = {}
    for key in ("sourceStyleEditMethod", "sourceStyleCloseness"):
        a = df.get(key)
        if not isinstance(a, dict):
            continue
        items[key] = a
        st = a.get("state")
        if st == "specified" and a.get("value") is None:
            report.error("F11 ①指定なのに値が空: derivedFrom.%s" % key)
        elif st == "delegated" and "value" in a:
            report.warn("F11 ②お任せなのに値が残っている（無視される）: derivedFrom.%s" % key)
    em, cl = items.get("sourceStyleEditMethod"), items.get("sourceStyleCloseness")
    if cl and cl.get("state") == "specified" and em and em.get("state") == "specified" and em.get("value") == "keep":
        report.error("F11 sourceStyleCloseness が①指定だが、sourceStyleEditMethod が keep（近さは change のときだけ有効）")
    if _is_blank(df.get("sourceStyleText")):
        for key, a in items.items():
            if a.get("state") == "specified":
                report.warn("F11 sourceStyleText が空のため、derivedFrom.%s は無効（依頼文に出ない）" % key)


def check_request_rules(r, by_id, profiles, report):
    """依頼1件の、要素をまたぐ規則と、ツールの規則（F3・F4・F6・F7・F9）。その依頼のツールプロファイル（なければ None）を返す。"""
    rid, gt, df = r.get("id"), r.get("generationType"), r.get("derivedFrom")
    if gt == "new" and df is not None:
        report.error("F4 generationType が new なのに、derivedFrom が null でない")
    if gt == "derived" and df is None:
        report.error("F4 generationType が derived なのに、derivedFrom が null")
    if isinstance(df, dict):
        check_derived_source(r, df, by_id, report)
        check_source_style(df, report)
    # F6 初版の制約（依頼の件数は check_song_data で確かめる）。vocalMode・lyricsAuthor の制約は、L-01（宿題38）で F6 から外し、F12 で正式に検証する
    if gt != "new":
        report.error("F6 初版が扱えるのは generationType = new のみ（初版の対象外: %r）" % (gt,))
    if df is not None:
        report.error("F6 初版では derivedFrom は null のみ（初版の対象外。歌あり対応後も、派生生成は引き続き対象外）")

    # F12 vocalMode と lyricsAuthor の整合（L-01a。input-items.md 判断ポイント20。宿題38で F6 を緩和し実装）
    vm, la = r.get("vocalMode"), r.get("lyricsAuthor")
    if vm == "vocal" and la not in VOCAL_LYRICS_AUTHORS:
        report.error("F12 vocalMode が vocal のとき、lyricsAuthor は %s のいずれかが必須: %r" % ("／".join(VOCAL_LYRICS_AUTHORS), la))
    if vm == "instrumental" and la is not None:
        report.error("F12 vocalMode が instrumental のとき、lyricsAuthor は null: %r" % (la,))

    # F13 output.requestScope と vocalMode の整合（候補7。input-items.md 判断ポイント28）。値そのものの正否は O2 が見る
    out = r.get("output")
    scope_value = out.get("requestScope") if isinstance(out, dict) else None
    if scope_value in VOCAL_ONLY_REQUEST_SCOPES and vm != "vocal":
        report.error("F13 output.requestScope が %s のとき、vocalMode は vocal が必須（インストは combined のみ）: vocalMode %r" % (scope_value, vm))
    tool = r.get("toolId")
    profile = profiles.get(tool) if isinstance(tool, str) else None  # 既知の toolId は、ツールプロファイルの集合（tool-profile.md §9）
    if profile is None:
        report.error("F7 未知の toolId: %r（既知: %s）" % (tool, ", ".join(sorted(profiles)) or "なし"))
        return None
    target = profile["version"]["id"]
    if r.get("toolVersion") != target:
        report.warn("F7 toolVersion が対象ツールの版と違う: ファイル %r、対象 %r（警告。読み込みは止めず、値は書き換えない）"
                    % (r.get("toolVersion"), target))
    if isinstance(df, dict):
        check_operation(df.get("operation"), profile, report)
    return profile


def check_song_data(song, fields, fk, vocabs, profiles, validators, report):
    """楽曲データ（{ schemaVersion, requests[] }）を検証する。report.scope は呼び出し側が設定する。"""
    base = report.scope
    try:
        if not isinstance(song, dict):
            report.error("F0 オブジェクトでない")
            return
        if "requests" not in song and "axes" in song:
            report.error("F0 旧形式（axes が最上位）。requests[] 形（song-file.md §2）に直す")
            return
        if not check_version(song, report):
            return
        check_by_schema(validators["song"] if validators else None, song, report)
        reqs = song.get("requests")
        if not isinstance(reqs, list):
            if not validators:
                report.error("F0 requests がない、または配列でない")
            return
        if len(reqs) != 1:
            report.error("F6 依頼はちょうど1件（初版の対象外: %d 件）" % len(reqs))
        ids = {}
        for i, r in enumerate(reqs):
            if isinstance(r, dict) and isinstance(r.get("id"), str):
                ids.setdefault(r["id"], []).append(i)
        for rid, idx in ids.items():
            if len(idx) > 1:
                report.error("F2 依頼の id が重複: %r（要素 %s）" % (rid, ", ".join("#%d" % i for i in idx)))
        by_id = {rid: reqs[idx[0]] for rid, idx in ids.items()}
        for i, r in enumerate(reqs):
            rid = r.get("id") if isinstance(r, dict) else None
            report.scope = base + "依頼 %s: " % (rid if isinstance(rid, str) else "#%d" % i)
            if not isinstance(r, dict):
                report.error("F0 依頼がオブジェクトでない")
                continue
            try:
                profile = check_request_rules(r, by_id, profiles, report)
                check_request(r, fields, fk, vocabs, report, profile)
            except (AttributeError, TypeError, KeyError) as e:
                report.error("F0 構造が不正で、検証を続けられない: %s: %s" % (type(e).__name__, e))
    finally:
        report.scope = base


def check_profiles_container(obj, kind, fields, fk, vocabs, tool_profiles, validators, report):
    """エクスポートファイル（kind = file）またはプロファイルのストア（kind = store）を検証する。"""
    label = "エクスポートファイル" if kind == "file" else "プロファイルのストア"
    report.scope = "[%s] " % label
    if not check_version(obj, report):
        return
    if kind == "file" and obj.get("exportType") != "profiles":
        report.error("F0 exportType は profiles のみ: %r" % (obj.get("exportType"),))
    check_by_schema(validators[kind] if validators else None, obj, report, skip_data=True)
    profiles = obj.get("profiles")
    if not isinstance(profiles, list):
        report.error("F0 profiles がない、または配列でない")
        return
    report.note("形: %s（プロファイル %d 件）" % (label, len(profiles)))
    names = {}
    for i, p in enumerate(profiles):
        if isinstance(p, dict) and isinstance(p.get("name"), str):
            names.setdefault(p["name"], []).append(i)
    for name, idx in names.items():
        if len(idx) > 1:
            report.error("F5 プロファイルの name が重複: %r（要素 %s）" % (name, ", ".join("#%d" % i for i in idx)))
    for i, p in enumerate(profiles):
        name = p.get("name") if isinstance(p, dict) else None
        report.scope = "[プロファイル「%s」] " % (name if isinstance(name, str) else "#%d" % i)
        if not isinstance(p, dict) or "data" not in p:
            report.error("F0 プロファイルがオブジェクトでない、または data がない")
            continue
        check_song_data(p["data"], fields, fk, vocabs, tool_profiles, validators, report)


def check_saved_file(path, fields, fk, vocabs, profiles, report):
    """--song で渡されたファイルの形（楽曲データ／エクスポートファイル／ストア）を自動判別して検証する。"""
    try:
        obj = load_json(Path(path))
    except (OSError, ValueError) as e:
        report.error("F0 JSON として読めない: %s" % e)
        return
    validators = load_schema_validators(report)
    if not isinstance(obj, dict):
        report.error("F0 最上位がオブジェクトでない")
        return
    if "exportType" in obj:
        kind = "file"
    elif "profiles" in obj:
        kind = "store"
    elif "requests" in obj or "axes" in obj:
        kind = "song"
    else:
        report.error("F0 形を判別できない（exportType・profiles・requests のいずれもない）")
        return
    try:
        if kind == "song":
            report.note("形: 楽曲データ")
            report.scope = "[楽曲データ] "
            check_song_data(obj, fields, fk, vocabs, profiles, validators, report)
        else:
            check_profiles_container(obj, kind, fields, fk, vocabs, profiles, validators, report)
    finally:
        report.scope = ""


# ---------------------------------------------------------------------------
# Markdown の表
# ---------------------------------------------------------------------------
def markdown(fields):
    labels = {f["id"]: f["label"] for f in fields["fields"]}
    kind_label = {"select": "単一選択", "triSelect": "3値選択", "text": "自由記述", "bpm": "BPM", "length": "長さ", "sectionList": "並びのリスト"}
    lines = []
    for g in sorted(fields["groups"], key=lambda x: x["order"]):
        fs = [f for f in fields["fields"] if f["group"] == g["id"]]
        if not fs:
            continue
        lines.append("**%s%s**\n" % (("軸%s: " % g["axis"]) if g["axis"] else "", g["label"]))
        lines.append("| id | 項目 | 種類 | 語彙 | 状態 | ②の扱い | ③の既定値 | 初期 | 具体化 | 自由記述 |")
        lines.append("|---|---|---|---|---|---|---|---|---|---|")
        for f in fs:
            st = f["states"]
            d = st.get("delegated")
            if not d:
                two = "—"
            elif d["rule"] == "leave":
                two = "足さない"
            else:
                cues = "＋".join("全項目" if c == "*" else labels[c] for c in d["cues"]) or "手がかりなし"
                fb = d["fallback"]
                fbt = {"omit": "指定しない", "choose": "必ず決める", "value": "「%s」" % fb.get("value", ""), "text": "「%s」" % fb.get("text", "")}[fb["type"]]
                two = "導く（%s。無ければ%s）" % (cues, fbt)
            three = ("`%s`" % st["defaulted"]["value"]) if "defaulted" in st else "—"
            states = "".join(STATE_NUMBER[s] for s in ("specified", "delegated", "defaulted", "toolManaged") if s in st)
            lines.append("| `%s` | %s | %s | %s | %s | %s | %s | %s | %s | %s |" % (
                f["id"], f["label"], kind_label[f["kind"]], ("`%s`" % f["vocabulary"]) if f.get("vocabulary") else "—",
                states, two, three, STATE_NUMBER[f["initialState"]],
                SPECIFICITY_LABEL[f["specificity"]], "○" if f["freeText"] else "—"))
        lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--song", metavar="FILE", help="保存データ（楽曲データ／エクスポートファイル／プロファイルのストア。形は自動判別）も検証する")
    ap.add_argument("--markdown", action="store_true", help="項目一覧の Markdown の表を出力して終了する")
    ap.add_argument("--strict", action="store_true", help="警告もエラーとして扱う")
    ap.add_argument("--spec", metavar="DIR", help="docs/specifications の代わりに使うディレクトリ（負例のテスト用）")
    args = ap.parse_args()
    if args.spec:
        use_spec_dir(args.spec)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")

    fields = load_json(FIELDS_FILE)
    if args.markdown:
        print(markdown(fields))
        return 0
    report = Report()
    vocabs = load_vocabularies(report)
    fk = check_definitions(fields, vocabs, report)
    entries = load_tool_profiles(report)
    check_tool_profiles(entries, fields, fk, report)
    if args.song:
        check_saved_file(args.song, fields, fk, vocabs, index_profiles(entries), report)

    for n in report.notes:
        print("  注: " + n, file=sys.stderr)
    for w in report.warnings:
        print("  ⚠ " + w, file=sys.stderr)
    for e in report.errors:
        print("  ✗ " + e, file=sys.stderr)
    bad = len(report.errors) + (len(report.warnings) if args.strict else 0)
    print("項目 %d（楽曲）＋ %d（出力）、語彙 %d、ツールプロファイル %d。エラー %d 件、警告 %d 件" % (
        len(fields["fields"]), len(fields["output"]), len(vocabs), len(entries), len(report.errors), len(report.warnings)), file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
