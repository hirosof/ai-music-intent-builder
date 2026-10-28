# -*- coding: utf-8 -*-
"""プリセット（語彙）の統合と検証。

docs/decisions/vocabulary/**/*.md の ```json ブロックを正として読み、
docs/specifications/presets/ に、語彙ごと（1語彙1ファイル）の JSON と index.json を生成する
（判断ポイント203〜210）。

使い方（リポジトリのどこからでも実行できる）:
    python tools/build-presets/build_presets.py           # 検証して生成（生成先の古い JSON は削除する）
    python tools/build-presets/build_presets.py --check   # 生成せず、生成先が最新か確認（最新でなければ終了コード2）

標準ライブラリだけで動く。jsonschema がインストールされていれば、
presets.schema.json（語彙ファイル）と presets-index.schema.json（index.json）による検証も行う
（なくても他の検証は実行される）。

仕様: docs/specifications/presets.md
"""
import argparse
import collections
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
VOCAB_DIR = REPO / "docs" / "decisions" / "vocabulary"
OUT_DIR = REPO / "docs" / "specifications" / "presets"
INDEX_FILE = OUT_DIR / "index.json"
SCHEMA_FILE = REPO / "docs" / "specifications" / "presets.schema.json"              # 語彙ファイル
INDEX_SCHEMA_FILE = REPO / "docs" / "specifications" / "presets-index.schema.json"  # index.json

SCHEMA_VERSION = 1

# ---------------------------------------------------------------------------
# マニフェスト（判断ポイント203〜206）
# ---------------------------------------------------------------------------
GENRE_FILES = ["pop", "rock", "metal", "electronic", "hiphop", "rnb-soul", "jazz", "blues",
               "country-folk", "reggae-caribbean", "latin", "east-asian", "world",
               "classical", "cinematic", "ambient"]
INSTRUMENT_FILES = ["string-bowed", "guitar-bass", "harp-zither", "world-lute", "woodwind",
                    "brass", "percussion-pitched", "percussion-kit", "percussion-world",
                    "keyboard", "electric", "synth"]

# (語彙 id, 軸, ラベル, 構造, ファイル, フラット語彙の判別用の疑似カテゴリ)
# 語彙ラベルは仮（判断ポイント203の補完）。
VOCABULARIES = [
    ("usage", "A", "用途", "flat", ["usage.md"], "usage"),
    ("listening-environment", "A", "想定する聴取環境", "flat", ["small-choices.md"], "listening-environment"),
    ("genre", "B", "ジャンル", "categorized", ["genres/%s.md" % g for g in GENRE_FILES], None),
    ("region-style", "B", "地域・文化の様式", "flat", ["region-style.md"], "region-style"),
    ("style-lean", "B", "様式の寄せ方", "flat", ["small-choices.md"], "style-lean"),
    ("era", "B", "年代・時代感", "flat", ["small-choices.md"], "era"),
    ("emotion", "C", "基調となる情緒", "flat", ["emotion.md"], "emotion"),
    ("intensity", "C", "強度", "flat", ["small-choices.md"], "intensity"),
    ("brightness", "C", "明暗", "flat", ["small-choices.md"], "brightness"),
    ("instrument", "D", "楽器", "categorized", ["instruments/%s.md" % f for f in INSTRUMENT_FILES], None),
    ("voice-treatment", "D", "声の扱い", "flat", ["small-choices.md"], "voice-treatment"),
    ("ensemble-size", "D", "編成の規模", "flat", ["small-choices.md"], "ensemble-size"),
    ("tempo-feel", "E", "テンポ感", "flat", ["temporal-structure.md"], "tempo-feel"),
    ("development-shape", "E", "展開の形", "flat", ["temporal-structure.md"], "development-shape"),
    ("section", "E", "構成のセクション", "flat", ["temporal-structure.md"], "section"),
    ("section-vocal", "G", "歌詞の構成セクション", "flat", ["lyrics.md"], "section-vocal"),
    ("spatial-texture", "F", "空間の質感", "flat", ["production-quality.md"], "spatial-texture"),
    ("recording-texture", "F", "音質・録音の質感", "flat", ["production-quality.md"], "recording-texture"),
    ("mix-direction", "F", "ミックスの方向性", "flat", ["production-quality.md"], "mix-direction"),
]

# カテゴリ id → そのカテゴリを定義したファイル（自カテゴリのファイル）
def _own_file(vocab_id, category_id):
    if vocab_id == "genre" and category_id.endswith("-family"):
        stem = category_id[: -len("-family")]
        return "genres/%s.md" % stem if stem in GENRE_FILES else None
    if vocab_id == "instrument" and category_id.endswith("-instrument-family"):
        stem = category_id[: -len("-instrument-family")]
        return "instruments/%s.md" % stem if stem in INSTRUMENT_FILES else None
    return None

# 語彙をまたぐ同一 id を許す例外（判断ポイント205）。値は「ジャンル側が other-axis である語彙」。
ALLOWED_CROSS_VOCAB = {"celtic": "region-style", "game-music": "usage"}

# 同じ構成の概念を、インスト用と歌あり用の別の語彙として持つ組（判断ポイント213）。
# 両方の語彙にある id は、term.en が一致するときだけ許す。
ALLOWED_SHARED_VOCABS = [("section", "section-vocal")]

# 表示順の上書き（判断ポイント208）。ソースに順序の記録がある場合のみ。
ORDER_OVERRIDES = {
    "east-asian-family": ["gagaku", "noh-music", "minyo", "ondo",
                          "kayokyoku", "city-pop", "shibuya-kei", "anime-song"],
}

ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
EXCLUSION_KINDS = ["substitutable", "not-instrumental", "vocal", "contained", "count", "other-axis", "hold"]
KINDS_NOTE_OPTIONAL = {"substitutable", "contained", "count"}
KINDS_SUBSTITUTE_REQUIRED = {"substitutable", "contained"}
WARNING_BASES = {"W-a", "W-b"}
PAIRS_VOCABULARY = "genre"  # warning-pairs.md はジャンルのみ（初版）。ペアは語彙のファイルに入れる


class Report:
    def __init__(self):
        self.errors = []
        self.notes = []

    def error(self, msg):
        self.errors.append(msg)

    def note(self, msg):
        self.notes.append(msg)


# ---------------------------------------------------------------------------
# 読み込み
# ---------------------------------------------------------------------------
def read_md(rel):
    return (VOCAB_DIR / rel).read_text(encoding="utf-8").replace("\r\n", "\n")


def json_blocks(rel, report):
    text = read_md(rel)
    out = []
    for i, raw in enumerate(re.findall(r"```json\n(.*?)```", text, re.S)):
        try:
            out.append(json.loads(raw))
        except json.JSONDecodeError as e:
            report.error("S1 JSON パース失敗: %s のブロック%d: %s" % (rel, i, e))
    return out


def parse_genre_categories(report):
    """README §3-3 の表（order / id / label）＋別名の表＋各ファイルの単独ブロック。"""
    text = read_md("README.md")
    cats = {}
    for m in re.finditer(r"^\| (\d+) \| `([a-z\-]+-family)` \| ([^|]+?) \|", text, re.M):
        cats[m.group(2)] = {"id": m.group(2), "label": m.group(3).strip(), "order": int(m.group(1))}
    for m in re.finditer(r"^\| `([a-z\-]+-family)` \| ([^|]+?) \|", text, re.M):
        if m.group(1) in cats:
            names = re.sub(r"（.*?）", "", m.group(2)).strip()
            cats[m.group(1)]["aliases"] = [a.strip() for a in names.split("、") if a.strip()]
    for g in GENRE_FILES:
        for b in json_blocks("genres/%s.md" % g, report):
            if isinstance(b, dict) and "order" in b and "items" not in b:
                if b["id"] not in cats:
                    report.error("S5 単独ブロックのカテゴリが README の表にない: %s" % b["id"])
                    continue
                cats[b["id"]].update({k: b[k] for k in ("label", "order", "aliases") if k in b})
    if len(cats) != len(GENRE_FILES):
        report.error("S5 ジャンルのカテゴリ数が想定と違う: %d（想定 %d）" % (len(cats), len(GENRE_FILES)))
    return cats


def parse_instrument_categories(report):
    """instruments/README.md §2 の表。語を持たない行（親・未作成）は後で除かれる。"""
    text = read_md("instruments/README.md")
    cats = {}
    for m in re.finditer(r"^\| (\d+) \| `([a-z\-]+-instrument-family)` \| ([^|]+?) \|", text, re.M):
        label = re.sub(r"（.*$", "", m.group(3).strip()).strip()
        cats[m.group(2)] = {"id": m.group(2), "label": label, "order": int(m.group(1))}
    return cats


# ---------------------------------------------------------------------------
# 統合
# ---------------------------------------------------------------------------
def collect_items(vocab_id, files, discriminator, report):
    """語彙の語を統合する。返り値: (語の OrderedDict, id→定義ファイル, ファイル→列挙順の id 一覧, グループの定義または None)

    グループ（groups。判断ポイント214）は、語と同じ json ブロックに書く。その語彙の語を含むブロックの groups を取り込む。
    """
    items = collections.OrderedDict()
    origin = {}
    listing = collections.OrderedDict()  # ファイル → その語彙の語を列挙した順の id
    groups = None
    for rel in files:
        listing[rel] = []
        for b in json_blocks(rel, report):
            if not (isinstance(b, dict) and "items" in b):
                continue
            mine = [src for src in b["items"]
                    if not discriminator or src.get("categories", [None])[0] == discriminator]
            if mine and "groups" in b:
                if groups is not None:
                    report.error("S14 groups が複数のブロックにある: %s（%s）" % (vocab_id, rel))
                else:
                    groups = json.loads(json.dumps(b["groups"], ensure_ascii=False))  # deep copy
            for src in mine:
                it = json.loads(json.dumps(src, ensure_ascii=False))  # deep copy
                listing[rel].append(it["id"])
                if it["id"] in items:
                    if items[it["id"]] == it:
                        report.note("案3 二重定義を統合: %s/%s（%s と %s。内容一致）"
                                    % (vocab_id, it["id"], origin[it["id"]], rel))
                    else:
                        report.error("案3 二重定義の内容が不一致: %s/%s（%s と %s）"
                                     % (vocab_id, it["id"], origin[it["id"]], rel))
                    continue
                items[it["id"]] = it
                origin[it["id"]] = rel
    return items, origin, listing, groups


def derive_item_order(vocab_id, cid, items, files, listing, report):
    """判断ポイント208 の規則。①代表 ②自ファイルの並び ③他ファイル定義（マニフェスト順）④非表示"""
    members = [it for it in items.values() if cid in it["categories"]]
    member_ids = {it["id"] for it in members}
    own = _own_file(vocab_id, cid)
    own_ids = [i for i in listing.get(own, []) if i in member_ids] if own else []
    seen = set()
    own_ids = [i for i in own_ids if not (i in seen or seen.add(i))]
    cross_ids = []
    for rel in files:                       # マニフェスト順 → ファイル内の並び
        for i in listing[rel]:
            if i in member_ids and i not in own_ids and i not in cross_ids:
                cross_ids.append(i)

    def vis(i):
        return items[i].get("defaultVisible", True)

    rep_ids = [i for i in own_ids + cross_ids if items[i].get("represents") == cid and vis(i)]
    visible = rep_ids + [i for i in own_ids if vis(i) and i not in rep_ids] \
        + [i for i in cross_ids if vis(i) and i not in rep_ids]
    hidden = [i for i in own_ids if not vis(i)] + [i for i in cross_ids if not vis(i)]

    if cid in ORDER_OVERRIDES:
        ov = ORDER_OVERRIDES[cid]
        bad = [i for i in ov if i not in visible]
        if bad:
            report.error("案6 表示順の上書きに、表示語ではない id がある: %s/%s" % (cid, bad))
        else:
            visible = ov + [i for i in visible if i not in ov]
    order = visible + hidden
    if sorted(order) != sorted(member_ids):
        report.error("S10 itemOrder がカテゴリの語と一致しない: %s" % cid)
    return order


def build(report):
    genre_cats = parse_genre_categories(report)
    instr_cats = parse_instrument_categories(report)
    out = collections.OrderedDict([("schemaVersion", SCHEMA_VERSION), ("vocabularies", [])])
    per_vocab_ids = {}
    origins = {}

    for vocab_id, axis, label, structure, files, disc in VOCABULARIES:
        items, origin, listing, groups = collect_items(vocab_id, files, disc, report)
        origins[vocab_id] = origin
        vocab = collections.OrderedDict([("id", vocab_id), ("axis", axis), ("label", label), ("structure", structure)])
        if groups is not None:
            vocab["groups"] = groups  # flat 以外が持つと S14 のエラー
        if structure == "flat":
            for it in items.values():
                if it.get("categories") != [disc]:
                    report.error("案4 フラット語彙の疑似カテゴリが想定と違う: %s/%s %s" % (vocab_id, it["id"], it.get("categories")))
                it.pop("categories", None)
        else:
            defined = genre_cats if vocab_id == "genre" else instr_cats
            used = sorted({c for it in items.values() for c in it.get("categories", [])},
                          key=lambda c: defined[c]["order"] if c in defined else 10 ** 9)
            for it in items.values():
                if not it.get("categories"):
                    report.error("S4 categories が空: %s/%s" % (vocab_id, it["id"]))
                for c in it.get("categories", []):
                    if c not in defined:
                        report.error("S4 未定義のカテゴリ: %s/%s → %s" % (vocab_id, it["id"], c))
            dropped = [c for c in defined if c not in used]
            if dropped:
                report.note("案5 語を持たないカテゴリは出力しない: %s" % ", ".join(sorted(dropped)))
            cats = []
            for c in used:
                if c not in defined:
                    continue
                rec = collections.OrderedDict()
                rec["id"] = c
                rec["label"] = defined[c]["label"]
                rec["order"] = defined[c]["order"]
                if defined[c].get("aliases"):
                    rec["aliases"] = defined[c]["aliases"]
                rec["itemOrder"] = derive_item_order(vocab_id, c, items, files, listing, report)
                cats.append(rec)
            vocab["categories"] = cats
        vocab["items"] = list(items.values())
        per_vocab_ids[vocab_id] = items
        out["vocabularies"].append(vocab)

    target = next(v for v in out["vocabularies"] if v["id"] == PAIRS_VOCABULARY)
    for b in json_blocks("warning-pairs.md", report):
        for p in b.get("pairs", []):
            target.setdefault("warningPairs", []).append(collections.OrderedDict(p))
    return out, per_vocab_ids, origins


# ---------------------------------------------------------------------------
# 検証
# ---------------------------------------------------------------------------
def validate_groups(v, report):
    """S14 語彙のグループ（groups）と語の group（判断ポイント214。presets.md §5）"""
    vid = v["id"]
    groups = v.get("groups")
    gids = []
    if groups is not None:
        if v["structure"] != "flat":
            report.error("S14 groups は flat 語彙だけが持てる: %s" % vid)
        if not isinstance(groups, list) or not groups:
            report.error("S14 groups が空: %s" % vid)
            groups = []
        for g in groups:
            gid = g.get("id") if isinstance(g, dict) else None
            if not isinstance(gid, str) or not ID_RE.match(gid):
                report.error("S14 グループ id の形式違反（V-08）: %s/%r" % (vid, gid))
            elif gid in gids:
                report.error("S14 グループ id が重複: %s/%s" % (vid, gid))
            label = g.get("label") if isinstance(g, dict) else None
            if not isinstance(label, str) or not label.strip():
                report.error("S14 グループの label が空: %s/%r" % (vid, gid))
            gids.append(gid)
    seq = []  # 語の並びに沿った、所属グループ（グループなしは None）
    for it in v["items"]:
        g = it.get("group")
        if g is None:
            seq.append(None)
        elif v.get("groups") is None:
            report.error("S14 groups のない語彙の語は group を持てない: %s/%s" % (vid, it["id"]))
        elif g not in gids:
            report.error("S14 未定義のグループ: %s/%s → %s" % (vid, it["id"], g))
        else:
            seq.append(g)
    grouped_seen = False
    for g in seq:
        if g is not None:
            grouped_seen = True
        elif grouped_seen:
            report.error("S14 グループなしの語は、グループのある語より前に並べる: %s" % vid)
            break
    runs = [g for i, g in enumerate(seq) if g is not None and (i == 0 or seq[i - 1] != g)]
    for g in sorted({g for g in runs if runs.count(g) > 1}):
        report.error("S14 同じグループの語が連続していない: %s/%s" % (vid, g))
    firsts = [g for i, g in enumerate(runs) if g not in runs[:i]]
    if firsts != [g for g in gids if g in firsts]:
        report.error("S14 グループの並びが groups の順と違う: %s（%s）" % (vid, ", ".join(firsts)))
    for g in gids:
        if g not in seq:
            report.error("S14 語が1つもないグループ: %s/%s" % (vid, g))


def validate(out, per_vocab_ids, report):
    ids_by_vocab = {v["id"]: {it["id"] for it in v["items"]} for v in out["vocabularies"]}

    # S2 id 形式・語彙内の一意
    for v in out["vocabularies"]:
        seen = set()
        for it in v["items"]:
            if not ID_RE.match(it["id"]):
                report.error("S2 id の形式違反（V-08）: %s/%s" % (v["id"], it["id"]))
            if it["id"] in seen:
                report.error("S2 語彙内で id が重複: %s/%s" % (v["id"], it["id"]))
            seen.add(it["id"])

    # S3 語彙をまたぐ同一 id は例外リストのみ
    owners = collections.defaultdict(list)
    for v in out["vocabularies"]:
        for it in v["items"]:
            owners[it["id"]].append((v["id"], it))
    for i, lst in owners.items():
        if len(lst) < 2:
            continue
        vocabs = sorted(x[0] for x in lst)
        if tuple(vocabs) in [tuple(sorted(p)) for p in ALLOWED_SHARED_VOCABS]:
            terms = {json.dumps(it.get("term", {}).get("en")) for _, it in lst}
            if len(terms) > 1:
                report.error("案3 共有を許す語彙の組で term.en が一致しない: %s（%s）" % (i, ", ".join(vocabs)))
            else:
                report.note("案3 語彙間で同一 id（共有を許す組）: %s（%s）" % (i, ", ".join(vocabs)))
            continue
        if i not in ALLOWED_CROSS_VOCAB:
            report.error("案3 例外リストにない語彙間の id 重複: %s（%s）" % (i, ", ".join(vocabs)))
            continue
        for vid, it in lst:
            if vid == "genre" and it.get("exclusion", {}).get("kind") != "other-axis":
                report.error("案3 語彙間の重複はジャンル側が other-axis の場合のみ許す: %s" % i)
        if ALLOWED_CROSS_VOCAB[i] not in vocabs:
            report.error("案3 重複の相手の語彙が想定と違う: %s（%s）" % (i, ", ".join(vocabs)))
        report.note("案3 語彙間で同一 id（許容）: %s（%s）" % (i, ", ".join(vocabs)))

    for v in out["vocabularies"]:
        # S5 ラベル・別名の衝突（同一語彙内、大文字小文字を区別しない）
        labels = collections.defaultdict(set)
        for it in v["items"]:
            for s in [it["label"]] + it.get("aliases", []):
                labels[s.lower()].add(it["id"])
        for s, owners_ in labels.items():
            if len(owners_) > 1:
                report.error("S5 ラベル・別名の衝突: %s/%s → %s" % (v["id"], s, sorted(owners_)))
        # S6 defaultVisible と exclusion
        for it in v["items"]:
            hidden = it.get("defaultVisible", True) is False
            if it.get("defaultVisible") is True:
                report.error("S6 defaultVisible: true は明示しない（省略が既定）: %s/%s" % (v["id"], it["id"]))
            if hidden != ("exclusion" in it):
                report.error("S6 defaultVisible: false と exclusion は対で持つ: %s/%s" % (v["id"], it["id"]))
            e = it.get("exclusion")
            if e:
                k = e.get("kind")
                if k not in EXCLUSION_KINDS:
                    report.error("S7 未知の exclusion.kind: %s/%s %s" % (v["id"], it["id"], k))
                if k not in KINDS_NOTE_OPTIONAL and not e.get("note"):
                    report.error("S7 note が必須: %s/%s（%s）" % (v["id"], it["id"], k))
                if k in KINDS_SUBSTITUTE_REQUIRED and not e.get("substitute"):
                    report.error("S7 substitute が必須: %s/%s（%s）" % (v["id"], it["id"], k))
                if (k == "other-axis") != ("targetAxis" in e):
                    report.error("S7 targetAxis は other-axis のときだけ持つ: %s/%s" % (v["id"], it["id"]))
            for lang in it.get("term", {}):
                if lang != "en":
                    report.error("S13 term の言語キーは en のみ（v1）: %s/%s %s" % (v["id"], it["id"], lang))
            if "jpNative" in it and it["jpNative"] is not True:
                report.error("S13 jpNative は true のときだけ書く: %s/%s" % (v["id"], it["id"]))
        # S8 represents
        if v["structure"] == "categorized":
            cat_ids = {c["id"] for c in v["categories"]}
            reps = collections.defaultdict(list)
            for it in v["items"]:
                if "represents" in it:
                    if it["represents"] not in cat_ids or it["represents"] not in it["categories"]:
                        report.error("S8 represents が不正: %s/%s" % (v["id"], it["id"]))
                    reps[it["represents"]].append(it["id"])
            for c, lst in reps.items():
                if len(lst) > 1:
                    report.error("S8 1カテゴリに代表項目が複数: %s → %s" % (c, lst))
        else:
            if any("represents" in it for it in v["items"]):
                report.error("S8 フラット語彙に represents は置けない: %s" % v["id"])

    # S14 グループ
    for v in out["vocabularies"]:
        validate_groups(v, report)

    # S9 警告ペア（語彙のファイルの中で完結する）
    for v in out["vocabularies"]:
        for p in v.get("warningPairs", []):
            a, b = p["ids"]
            if a == b:
                report.error("S9 ペアの2語が同じ: %s/%s" % (v["id"], a))
            for i in (a, b):
                if i not in ids_by_vocab[v["id"]]:
                    report.error("S9 ペアの語が語彙にない: %s/%s" % (v["id"], i))
            if p.get("basis") not in WARNING_BASES:
                report.error("S9 basis が不正: %s" % p.get("basis"))

    # S12 JSON Schema（jsonschema があれば）
    try:
        import jsonschema
    except ImportError:
        report.note("S12 jsonschema が未インストールのため、スキーマによる検証を省略")
        return
    for schema_file, targets in ((SCHEMA_FILE, [(n, o) for n, o in to_files(out).items() if n != "index.json"]),
                                 (INDEX_SCHEMA_FILE, [("index.json", to_files(out)["index.json"])])):
        if not schema_file.exists():
            report.note("S12 %s がないため、スキーマ検証を省略" % schema_file.name)
            continue
        validator = jsonschema.Draft202012Validator(json.loads(schema_file.read_text(encoding="utf-8")))
        for name, obj in targets:
            for err in validator.iter_errors(obj):
                path = "/".join(str(x) for x in err.absolute_path)
                report.error("S12 スキーマ違反: %s: %s: %s" % (name, path, err.message))


def _j(x):
    return json.dumps(x, ensure_ascii=False, separators=(", ", ": "))


def to_files(out):
    """生成するファイル（名前 → オブジェクト）。index.json と、語彙ごとの <語彙 id>.json（判断ポイント204）。"""
    files = collections.OrderedDict()
    files["index.json"] = collections.OrderedDict([
        ("schemaVersion", out["schemaVersion"]),
        ("vocabularies", [collections.OrderedDict([("id", v["id"]), ("file", v["id"] + ".json")])
                          for v in out["vocabularies"]]),
    ])
    for v in out["vocabularies"]:
        obj = collections.OrderedDict([("schemaVersion", out["schemaVersion"])])
        obj.update(v)
        files[v["id"] + ".json"] = obj
    return files


def render(name, obj):
    """1語（カテゴリ・警告ペア・index の行）1行の整形。差分とレビューを読みやすくするため（判断ポイント204）。"""
    if name == "index.json":
        rows = ",\n".join(_j(v) for v in obj["vocabularies"])
        return '{\n"schemaVersion": %s,\n"vocabularies": [\n%s\n]\n}\n' % (_j(obj["schemaVersion"]), rows)
    head = ", ".join("%s: %s" % (_j(k), _j(x)) for k, x in obj.items()
                     if k not in ("schemaVersion", "groups", "categories", "items", "warningPairs"))
    parts = ['"schemaVersion": %s,' % _j(obj["schemaVersion"]), head + ","]
    if "groups" in obj:
        parts.append('"groups": [\n' + ",\n".join(_j(g) for g in obj["groups"]) + "\n],")
    if "categories" in obj:
        parts.append('"categories": [\n' + ",\n".join(_j(c) for c in obj["categories"]) + "\n],")
    tail = '"items": [\n' + ",\n".join(_j(i) for i in obj["items"]) + "\n]"
    if "warningPairs" in obj:
        tail += ',\n"warningPairs": [\n' + ",\n".join(_j(p) for p in obj["warningPairs"]) + "\n]"
    parts.append(tail)
    return "{\n" + "\n".join(parts) + "\n}\n"


def summary(out):
    lines = []
    tv = th = 0
    for v in out["vocabularies"]:
        vis = sum(1 for i in v["items"] if i.get("defaultVisible", True))
        hid = len(v["items"]) - vis
        tv += vis
        th += hid
        extra = "  カテゴリ %d" % len(v["categories"]) if "categories" in v else ""
        lines.append("  %-18s 軸%s %-11s 表示 %3d / 非表示 %3d%s" % (v["id"], v["axis"], v["structure"], vis, hid, extra))
    lines.append("  %-18s %s 表示 %3d / 非表示 %3d（計 %d）" % ("合計", " " * 15, tv, th, tv + th))
    lines.append("  警告ペア %d 組" % sum(len(v.get("warningPairs", [])) for v in out["vocabularies"]))
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="生成せず、生成先が最新か確認する")
    args = ap.parse_args()

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")

    report = Report()
    out, per_vocab_ids, _ = build(report)
    validate(out, per_vocab_ids, report)

    files = collections.OrderedDict((n, render(n, o)) for n, o in to_files(out).items())
    print("語彙の内訳:", file=sys.stderr)
    print(summary(out), file=sys.stderr)
    for n in report.notes:
        print("  注: " + n, file=sys.stderr)
    if report.errors:
        print("\n検証エラー %d 件:" % len(report.errors), file=sys.stderr)
        for e in report.errors:
            print("  ✗ " + e, file=sys.stderr)
        return 1
    print("検証エラー: 0 件", file=sys.stderr)

    existing = sorted(p.name for p in OUT_DIR.glob("*.json")) if OUT_DIR.exists() else []
    stale = [n for n in existing if n not in files]
    if args.check:
        problems = []
        for name, text in files.items():
            path = OUT_DIR / name
            if not path.exists():
                problems.append("ありません: %s" % name)
            elif path.read_text(encoding="utf-8").replace("\r\n", "\n") != text:
                problems.append("最新ではありません: %s" % name)
        problems += ["不要なファイルがあります: %s" % n for n in stale]
        if problems:
            for pr in problems:
                print("  ✗ " + pr, file=sys.stderr)
            print("再生成してください（python tools/build-presets/build_presets.py）。", file=sys.stderr)
            return 2
        print("生成先は最新です（%d ファイル）。" % len(files), file=sys.stderr)
        return 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for n in stale:
        (OUT_DIR / n).unlink()
        print("削除: %s（生成対象でない古い JSON）" % (OUT_DIR / n).relative_to(REPO), file=sys.stderr)
    for name, text in files.items():
        with open(OUT_DIR / name, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
    sizes = ", ".join("%s %d行" % (n, t.count("\n")) for n, t in files.items() if n in ("index.json", "genre.json", "instrument.json"))
    print("生成: %s に %d ファイル（%s ほか）" % (OUT_DIR.relative_to(REPO), len(files), sizes), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
