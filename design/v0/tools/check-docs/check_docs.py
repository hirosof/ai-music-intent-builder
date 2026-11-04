# -*- coding: utf-8 -*-
"""設計書（design/v0/docs/）の機械検査。読むだけで、ファイルは書き換えない。

使い方（リポジトリのどこからでも実行できる）:
    python tools/check-docs/check_docs.py            # 検査する
    python tools/check-docs/check_docs.py --next     # 判断ポイントの次の番号を表示して終わる

検査（詳しくは README.md）:
    A1 判断ポイントの表（5系統）: 番号の重複・欠番・並び順の乱れ
    A2 song-file.md §10 の番号が ui-and-nonfunctional.md §7 に実在するか
    A3 相対リンク切れ
    A4 文字の破損（U+FFFD、\\uXXXX のまま残った日本語、全角数字、CR）
    A5 「次の番号」の記載（警告）
    A6 チェックシートのひな形（docs/checklists/）のチェック済みの印
    A7 チェックシートのひな形の全項目の形（番号・欄の並び・チェック結果）
    A8 UI 判断ポイントの 81 以降が、チェックシートの項目の「関係」に出るか

意図した例・過去からある欠番は、allowlist.json に理由つきで入れる。
標準ライブラリだけで動く。ネットワークは使わない。
終了コード: 0 = エラーなし（警告はあってよい）、1 = エラーあり、2 = 使い方の誤り・設定の誤り
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_ROOT = HERE.parents[3]  # check-docs の親から順に tools → v0 → design → リポジトリ
DEFAULT_ALLOWLIST = HERE / "allowlist.json"

DOCS = "design/v0/docs"
TOOLS = "design/v0/tools"

# 判断ポイントの5系統（implementation-guide.md §8）と、依頼文の補完・仮定。
# parts: (ファイル, 節の見出しの正規表現)。節は、見出しから次の「## 」の見出しまで
SYSTEMS = [
    {
        "id": "vocab",
        "label": "語彙",
        "parts": [
            (DOCS + "/decisions/presets.md", r"^## 6\. 判断ポイント"),
            (DOCS + "/decisions/vocabulary/README.md", r"^## 5\. 判断ポイント"),
        ],
    },
    {"id": "input", "label": "入力項目", "parts": [(DOCS + "/decisions/input-items.md", r"^## 4\. 判断ポイント")]},
    {
        "id": "ui",
        "label": "UI・非機能・保存",
        "parts": [(DOCS + "/decisions/ui-and-nonfunctional.md", r"^## 7\. 判断ポイント")],
    },
    {
        "id": "tool",
        "label": "ツールプロファイル",
        "parts": [(DOCS + "/specifications/tool-profile.md", r"^## 11\. 判断ポイント")],
    },
    {"id": "text", "label": "依頼文の文面", "parts": [(DOCS + "/decisions/request-text.md", r"^## 5\. 判断ポイント")]},
    {
        "id": "text-aux",
        "label": "依頼文の補完・仮定",
        "parts": [(DOCS + "/decisions/request-text.md", r"^## 6\. 補完・仮定")],
    },
]

SONG_FILE = DOCS + "/specifications/song-file.md"
SONG_FILE_SECTION = r"^## 10\. 判断ポイント"

# A5 で、どの系統の番号かを決める手がかり（記載の直前にある語）
SYSTEM_KEYWORDS = [
    ("vocab", ["presets.md", "vocabulary/README.md", "語彙"]),
    ("input", ["input-items.md", "入力項目"]),
    ("ui", ["ui-and-nonfunctional.md", "UI・非機能・保存"]),
    ("tool", ["tool-profile.md", "ツールプロファイル"]),
    ("text", ["request-text.md", "依頼文の文面"]),
    ("text-aux", ["補完・仮定"]),
]

# A5 で数えない履歴: 引き継ぎ書の追記の行と、§8（前回までの引き継ぎ）以降
HISTORY_LINE = re.compile(r"^- 20\d\d-\d\d-\d\d (追記|注)")
HISTORY_FROM = {DOCS + "/handoff-next-thread.md": r"^## 8\. "}
# A5 で見ない（議論ログ・検証例は時系列の記録）
A5_SKIP_DIRS = (DOCS + "/discussions/", DOCS + "/examples/")
# A6・A7 の対象（ひな形。確かめるときは temp/ に写すので、ここにチェックは付かない）
CHECKLISTS = DOCS + "/checklists"
# A7 で項目を見る節（「## A. …」の形）と、項目の形
ITEM_SECTION = re.compile(r"^## ([A-Z])\. ")
ITEM_HEAD = re.compile(r"^- \*\*([A-Z])-(\d{2})\*\* \S")
ITEM_HEAD_CHECKBOX = re.compile(r"^(?:[-*+]|\d+[.)])\s+\[.\]")
ITEM_LIST = re.compile(r"^(?:[-*+]|\d+[.)])\s")
ITEM_FIELD = re.compile(r"^  - (端末|手順|期待|関係|注意): (\S.*)$")
ITEM_RESULT = "  - チェック結果"
ITEM_RESULT_MARK = re.compile(r"^    - \[[ xX]\] (OK|NG)$")  # 印そのものは A6 が見る
ITEM_FIELDS = ["端末", "手順", "期待", "関係", "チェック結果", "OK", "NG"]
ITEM_FIELDS_NOTE = ["端末", "手順", "期待", "関係", "注意", "チェック結果", "OK", "NG"]
ITEM_DEVICE = ("PC", "スマホ", "両方")
ITEM_NOTE = "仮のデータで確かめる"
ITEM_RELATED = re.compile(r"^(?:UI|語彙|入力項目|文面|ツール) \d+(?:・(?:UI|語彙|入力項目|文面|ツール) \d+)*$")

# A8 の対象の始まり（80 以前は、チェックシートを作った時点で洗い出したので見ない）
A8_FROM = 81
RELATED_UI = re.compile(r"^UI (\d+)$")

ROW = re.compile(r"^\|\s*(?:~~)?\**(\d+)\**(?:~~)?\s*\|")
MD_LINK = re.compile(r"\]\(([^)\s]+)\)")
BT_PATH = re.compile(r"`(\.\.?/[^`\s]+?)`")
UESC = re.compile(r"\\u(30[0-9a-fA-F]{2}|[4-9][0-9a-fA-F]{3}|[fF][fF][0-9a-fA-F]{2})")
FW_DIGIT = re.compile(r"[０-９]")
CHECKED_ITEM = re.compile(r"^[\s>]*(?:[-*+]|\d+[.)])\s+\[[xX]\]")
FFFD = chr(0xFFFD)  # 置換文字（ソースに文字そのものを書かない）
NEXT_PATTERNS = [
    re.compile(r"次は\s*\*\*(\d+)\*\*"),
    re.compile(r"次は\s*(\d+)"),
    re.compile(r"次の番号は\s*\*{0,2}(\d+)"),
    re.compile(r"次の番号は[^。\n|]{0,80}?で\s*\*{0,2}(\d+)"),
]


class Finding:
    def __init__(self, check, level, file, line, message, kind="", number=None, system=None, text=""):
        self.check = check  # A1〜A7
        self.level = level  # error / warning / note
        self.file = file
        self.line = line
        self.message = message
        self.kind = kind
        self.number = number
        self.system = system
        self.text = text  # 行の内容（許可リストの照合に使う）

    def where(self):
        return "%s:%s" % (self.file, self.line) if self.line else self.file


def read_text(root, rel):
    p = Path(root) / rel
    if not p.is_file():
        return None
    return p.read_bytes().decode("utf-8", errors="replace")


def section_lines(text, heading):
    """見出しから次の「## 」までの (行番号, 行) を返す。見出しがなければ None"""
    lines = text.split("\n")
    start = None
    for i, l in enumerate(lines):
        if re.match(heading, l):
            start = i
            break
    if start is None:
        return None
    out = []
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("## "):
            break
        out.append((i + 1, lines[i]))
    return out


def table_cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def parse_system(root, system):
    """系統の行を読む。戻り値: (行の一覧 [(file, lineno, number, is_pointer)], 読めなかった部分の Finding)"""
    rows = []
    problems = []
    for rel, heading in system["parts"]:
        text = read_text(root, rel)
        if text is None:
            problems.append(Finding("A1", "error", rel, 0, "ファイルが見つからない", kind="missing-file", system=system["id"]))
            continue
        sec = section_lines(text, heading)
        if sec is None:
            problems.append(
                Finding("A1", "error", rel, 0, "節が見つからない（%s）" % heading, kind="missing-section", system=system["id"])
            )
            continue
        for no, line in sec:
            m = ROW.match(line)
            if not m:
                continue
            cells = table_cells(line)
            # 参照の行: 2つ目のセルが「（…）」、3つ目のセルが「→」で始まる（例: 語彙の系統で、もう一方のファイルを指す行）
            is_pointer = len(cells) >= 3 and cells[1].startswith("（") and cells[2].startswith("→")
            rows.append((rel, no, int(m.group(1)), is_pointer))
    return rows, problems


def next_number(rows):
    mains = [n for _, _, n, p in rows if not p]
    return (max(mains) + 1) if mains else 1


def check_a1(root):
    findings = []
    nexts = {}
    for system in SYSTEMS:
        rows, problems = parse_system(root, system)
        findings += problems
        sid = system["id"]
        # 並び順（ファイルごと）
        by_file = {}
        for rel, no, n, p in rows:
            by_file.setdefault(rel, []).append((no, n))
        for rel, items in by_file.items():
            for (no0, n0), (no1, n1) in zip(items, items[1:]):
                if n1 < n0:
                    findings.append(
                        Finding("A1", "error", rel, no1, "%s: %d が %d より後にある（並び順）" % (system["label"], n1, n0),
                                kind="order", number=n1, system=sid)
                    )
        # 重複（参照の行を除く）
        mains = {}
        for rel, no, n, p in rows:
            if not p:
                mains.setdefault(n, []).append((rel, no))
        for n, places in sorted(mains.items()):
            if len(places) > 1:
                rel, no = places[1]
                findings.append(
                    Finding("A1", "error", rel, no, "%s: %d が重複している（%s）" % (
                        system["label"], n, "、".join("%s:%d" % x for x in places)), kind="duplicate", number=n, system=sid)
                )
        # 参照の行が指す番号の本体があるか
        for rel, no, n, p in rows:
            if p and n not in mains:
                findings.append(
                    Finding("A1", "error", rel, no, "%s: 参照の行 %d の本体の行がない" % (system["label"], n),
                            kind="dangling-pointer", number=n, system=sid)
                )
        # 欠番
        if mains:
            for n in range(1, max(mains) + 1):
                if n not in mains:
                    rel = system["parts"][0][0]
                    findings.append(
                        Finding("A1", "error", rel, 0, "%s: %d がない（欠番）" % (system["label"], n),
                                kind="missing", number=n, system=sid)
                    )
        nexts[sid] = next_number(rows)
    return findings, nexts


def check_a2(root):
    findings = []
    text = read_text(root, SONG_FILE)
    if text is None:
        return [Finding("A2", "error", SONG_FILE, 0, "ファイルが見つからない", kind="missing-file")]
    sec = section_lines(text, SONG_FILE_SECTION)
    if sec is None:
        return [Finding("A2", "error", SONG_FILE, 0, "節が見つからない（%s）" % SONG_FILE_SECTION, kind="missing-section")]
    ui = next(s for s in SYSTEMS if s["id"] == "ui")
    ui_rows, _ = parse_system(root, ui)
    ui_numbers = {n for _, _, n, p in ui_rows if not p}
    for no, line in sec:
        m = ROW.match(line)
        if m and int(m.group(1)) not in ui_numbers:
            n = int(m.group(1))
            findings.append(
                Finding("A2", "error", SONG_FILE, no, "§10 の %d が ui-and-nonfunctional.md §7 にない" % n,
                        kind="not-in-ui", number=n, text=line)
            )
    return findings


def md_targets(root):
    """A3〜A5 の対象の md: docs 配下、リポジトリ直下の CLAUDE.md、tools/*/README.md"""
    root = Path(root)
    out = []
    docs = root / DOCS
    if docs.is_dir():
        for dp, dn, fn in os.walk(docs):
            for f in sorted(fn):
                if f.endswith(".md"):
                    out.append((Path(dp) / f).relative_to(root).as_posix())
    if (root / "CLAUDE.md").is_file():
        out.append("CLAUDE.md")
    tools = root / TOOLS
    if tools.is_dir():
        for d in sorted(tools.iterdir()):
            if (d / "README.md").is_file():
                out.append((d / "README.md").relative_to(root).as_posix())
    return sorted(out)


def json_targets(root):
    root = Path(root)
    spec = root / DOCS / "specifications"
    out = []
    if spec.is_dir():
        for dp, dn, fn in os.walk(spec):
            for f in sorted(fn):
                if f.endswith(".json"):
                    out.append((Path(dp) / f).relative_to(root).as_posix())
    return sorted(out)


def check_a3(root):
    findings = []
    for rel in md_targets(root):
        text = read_text(root, rel)
        base = (Path(root) / rel).parent
        in_code = False
        for no, line in enumerate(text.split("\n"), 1):
            if line.lstrip().startswith("```"):
                in_code = not in_code
                continue
            if in_code:
                continue
            targets = [(m.group(1), "link") for m in MD_LINK.finditer(line)]
            targets += [(m.group(1), "path") for m in BT_PATH.finditer(line)]
            for target, kind in targets:
                t = target.split("#")[0].rstrip("/")
                if not t or re.match(r"^[a-z][a-z0-9+.-]*:", t):
                    continue
                if any(c in t for c in "*{}<>…"):
                    continue
                if not (base / t).exists():
                    findings.append(Finding("A3", "error", rel, no, "相対パスの先がない: %s" % target,
                                            kind=kind, text=target))
    return findings


def check_a4(root):
    findings = []
    for rel in md_targets(root) + json_targets(root):
        data = (Path(root) / rel).read_bytes()
        if b"\r" in data:
            findings.append(Finding("A4", "error", rel, 0, "CR がある（改行は LF）", kind="cr", text=""))
        text = data.decode("utf-8", errors="replace")
        for no, line in enumerate(text.split("\n"), 1):
            if FFFD in line:
                findings.append(Finding("A4", "error", rel, no, "U+FFFD（置換文字）がある", kind="fffd", text=line))
            for m in UESC.finditer(line):
                findings.append(Finding("A4", "error", rel, no, "\\uXXXX のまま残った文字: \\u%s" % m.group(1),
                                        kind="uesc", text=line))
            if FW_DIGIT.search(line):
                findings.append(Finding("A4", "error", rel, no, "全角数字がある: %s" % "".join(FW_DIGIT.findall(line)),
                                        kind="fwdigit", text=line))
    return findings


def resolve_system(before):
    best = None
    for sid, words in SYSTEM_KEYWORDS:
        for w in words:
            i = before.rfind(w)
            if i >= 0 and (best is None or i > best[0]):
                best = (i, sid)
    return best[1] if best else None


def check_a5(root, nexts):
    findings = []
    labels = {s["id"]: s["label"] for s in SYSTEMS}
    label_to_id = {s["label"]: s["id"] for s in SYSTEMS}
    for rel in md_targets(root):
        if rel.startswith(A5_SKIP_DIRS):
            continue
        text = read_text(root, rel)
        stop = HISTORY_FROM.get(rel)
        for no, line in enumerate(text.split("\n"), 1):
            if stop and re.match(stop, line):
                break
            if HISTORY_LINE.match(line):
                continue
            hits = []
            for rx in NEXT_PATTERNS:
                for m in rx.finditer(line):
                    if any(m.start(1) == h[0] for h in hits):
                        continue
                    sid = resolve_system(line[max(0, m.start() - 150):m.start() + 4])
                    hits.append((m.start(1), int(m.group(1)), sid))
            # 表の行: 1つ目のセルが系統の名前で、最後のセルが数（implementation-guide.md §8 の形）
            if line.startswith("|"):
                cells = table_cells(line)
                if len(cells) >= 2 and cells[0] in label_to_id and cells[-1].isdigit():
                    hits.append((-1, int(cells[-1]), label_to_id[cells[0]]))
            for _, n, sid in hits:
                if sid is None:
                    findings.append(Finding("A5", "warning", rel, no, "「次の番号」の記載 %d の系統を決められない" % n,
                                            kind="unknown", number=n, text=line))
                elif nexts.get(sid) != n:
                    findings.append(Finding("A5", "warning", rel, no, "「次の番号」の記載が古い: %s は %d と書かれているが、実際は %d" % (
                        labels[sid], n, nexts.get(sid)), kind="stale", number=n, system=sid, text=line))
                else:
                    findings.append(Finding("A5", "note", rel, no, "「次の番号」の記載がある（値は合っている: %s %d）。値は文書に書かない" % (
                        labels[sid], n), kind="current", number=n, system=sid, text=line))
    return findings


def checklist_files(root):
    out = []
    for dp, dn, fn in os.walk(Path(root) / CHECKLISTS):
        for f in fn:
            if f.endswith(".md"):
                out.append((Path(dp) / f).relative_to(root).as_posix())
    return sorted(out)


def check_a6(root):
    findings = []
    for rel in checklist_files(root):
        for no, line in enumerate(read_text(root, rel).split("\n"), 1):
            if CHECKED_ITEM.match(line):
                findings.append(Finding("A6", "error", rel, no, "ひな形にチェック済みの印がある（temp/ に写して使う）",
                                        kind="checked", text=line))
    return findings


def check_item_fields(rel, no, head, children):
    """項目の子の行（[(行番号, 行)]）の形を見る"""
    findings = []
    names = []
    for cno, line in children:
        field = ITEM_FIELD.match(line)
        mark = ITEM_RESULT_MARK.match(line)
        if field:
            names.append(field.group(1))
            value = field.group(2)
            if field.group(1) == "端末" and value not in ITEM_DEVICE:
                findings.append(Finding("A7", "error", rel, cno, "端末の値が違う: %s" % value, kind="device", text=line))
            if field.group(1) == "注意" and value != ITEM_NOTE:
                findings.append(Finding("A7", "error", rel, cno, "注意の文言が違う: %s" % value, kind="note", text=line))
            if field.group(1) == "関係" and not ITEM_RELATED.match(value):
                findings.append(Finding("A7", "error", rel, cno, "関係の形が違う: %s" % value, kind="related", text=line))
        elif mark:
            names.append(mark.group(1))
        elif line == ITEM_RESULT:
            names.append("チェック結果")
        else:
            names.append("?")
    if names != ITEM_FIELDS and names != ITEM_FIELDS_NOTE:
        findings.append(Finding("A7", "error", rel, no, "欄が違う（%s）: %s" % ("・".join(ITEM_FIELDS_NOTE), "・".join(names) or "なし"),
                                kind="fields", text=head))
    return findings


def check_checklist_form(rel, text):
    findings = []
    letter = None
    has_item = False
    last = {}
    seen = set()
    item = None  # (行番号, 先頭の行, 子の行)

    def finish():
        nonlocal item
        if item:
            findings.extend(check_item_fields(rel, item[0], item[1], item[2]))
        item = None

    for no, line in enumerate(text.split("\n"), 1):
        if item and line.startswith(" ") and line.strip():
            item[2].append((no, line))
            continue
        finish()
        if line.startswith("## "):
            m = ITEM_SECTION.match(line)
            letter = m.group(1) if m else None
        elif letter is None or not line.strip():
            continue
        elif line.startswith(" "):
            findings.append(Finding("A7", "error", rel, no, "項目に属さない字下げの行がある", kind="orphan", text=line))
        elif ITEM_LIST.match(line):
            m = ITEM_HEAD.match(line)
            item = (no, line, [])
            has_item = True
            if ITEM_HEAD_CHECKBOX.match(line):
                findings.append(Finding("A7", "error", rel, no, "項目の先頭にチェックボックスがある", kind="head-checkbox", text=line))
            elif not m:
                findings.append(Finding("A7", "error", rel, no, "項目の先頭の行の形が違う（- **A-01** …）", kind="head", text=line))
            elif m.group(1) != letter:
                findings.append(Finding("A7", "error", rel, no, "番号の記号が節（%s）と違う: %s-%s" % (letter, m.group(1), m.group(2)),
                                        kind="letter", text=line))
            else:
                n = int(m.group(2))
                if (letter, n) in seen:
                    findings.append(Finding("A7", "error", rel, no, "番号が重複している: %s-%02d" % (letter, n), kind="duplicate", text=line))
                elif n != last.get(letter, 0) + 1:
                    findings.append(Finding("A7", "error", rel, no, "番号が連番でない: %s-%02d の次が %s-%02d" % (
                        letter, last.get(letter, 0), letter, n), kind="sequence", text=line))
                seen.add((letter, n))
                last[letter] = n
    finish()
    if not has_item:
        findings.append(Finding("A7", "error", rel, 0, "項目の節（## A. …）または項目が見つからない", kind="no-items"))
    return findings


def check_a7(root):
    findings = []
    for rel in checklist_files(root):
        findings += check_checklist_form(rel, read_text(root, rel))
    return findings


def related_ui_numbers(text):
    """項目を見る節（A7 と同じ）の、「関係」の欄に出る UI の番号。"""
    numbers = set()
    in_items = False
    for line in text.split("\n"):
        if line.startswith("## "):
            in_items = bool(ITEM_SECTION.match(line))
        field = ITEM_FIELD.match(line)
        if in_items and field and field.group(1) == "関係":
            for token in field.group(2).split("・"):
                m = RELATED_UI.match(token)
                if m:
                    numbers.add(int(m.group(1)))
    return numbers


def check_a8(root):
    system = next(s for s in SYSTEMS if s["id"] == "ui")
    rows, _ = parse_system(root, system)  # 読めないときは A1 が知らせる
    related = set()
    for rel in checklist_files(root):
        related |= related_ui_numbers(read_text(root, rel))
    findings = []
    for rel, no, number, _ in rows:
        if number >= A8_FROM and number not in related:
            findings.append(Finding("A8", "error", rel, no,
                                    "UI 判断ポイント %d が、チェックシートの項目の「関係」に出ない（項目を足すか、許可リストに理由つきで載せる）" % number,
                                    kind="unrelated", system="ui", number=number))
    return findings


def load_allowlist(path):
    if path is None or not Path(path).is_file():
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    for key, items in data.items():
        if key.startswith("_"):
            continue
        for item in items:
            if not item.get("reason"):
                raise ValueError("許可リストの %s に理由（reason）のない項目がある: %r" % (key, item))
    return data


def allowed(f, allow):
    for i, item in enumerate(allow.get(f.check.lower(), [])):
        if item.get("kind") and item["kind"] != f.kind:
            continue
        if f.check in ("A1", "A8"):
            if item.get("system") == f.system and item.get("number") == f.number:
                return (f.check.lower(), i)
            continue
        if item.get("file") != f.file:
            continue
        if f.check == "A3":
            if item.get("path") == f.text:
                return (f.check.lower(), i)
            continue
        if item.get("contains", "") in f.text or (f.kind == "cr" and "contains" not in item):
            return (f.check.lower(), i)
    return None


def run(root, allowlist_path):
    allow = load_allowlist(allowlist_path)
    a1, nexts = check_a1(root)
    findings = a1 + check_a2(root) + check_a3(root) + check_a4(root) + check_a5(root, nexts) + check_a6(root) + check_a7(root) + check_a8(root)
    used = set()
    result = []
    for f in findings:
        hit = allowed(f, allow)
        if hit:
            used.add(hit)
            f.allowed = True
        else:
            f.allowed = False
        result.append(f)
    unused = []
    for key, items in allow.items():
        if key.startswith("_"):
            continue
        for i, item in enumerate(items):
            if (key, i) not in used:
                unused.append((key, item))
    return result, nexts, unused


def print_next(nexts):
    for s in SYSTEMS:
        print("%s: %d" % (s["label"], nexts[s["id"]]))


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="設計書の機械検査（読むだけ）")
    ap.add_argument("--root", default=str(DEFAULT_ROOT), help="リポジトリのルート（テスト用）")
    ap.add_argument("--allowlist", default=str(DEFAULT_ALLOWLIST), help="許可リスト（JSON）")
    ap.add_argument("--next", action="store_true", help="判断ポイントの次の番号を表示して終わる")
    args = ap.parse_args(argv)

    if args.next:
        a1, nexts = check_a1(args.root)
        errors = [f for f in a1 if f.kind in ("missing-file", "missing-section")]
        for f in errors:
            print("エラー: %s %s" % (f.where(), f.message))
        print_next(nexts)
        return 1 if errors else 0

    try:
        findings, nexts, unused = run(args.root, args.allowlist)
    except ValueError as e:
        print("設定の誤り: %s" % e)
        return 2

    label = {"error": "エラー", "warning": "警告", "note": "注"}
    for f in findings:
        if not f.allowed:
            print("%s %s %s %s" % (f.check, label[f.level], f.where(), f.message))
    for key, item in unused:
        print("%s 警告 allowlist.json 使われていない許可: %s" % (key.upper(), json.dumps(item, ensure_ascii=False)))

    print()
    total_err = 0
    for c in ("A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"):
        fs = [f for f in findings if f.check == c]
        err = sum(1 for f in fs if f.level == "error" and not f.allowed)
        warn = sum(1 for f in fs if f.level == "warning" and not f.allowed)
        note = sum(1 for f in fs if f.level == "note" and not f.allowed)
        alw = sum(1 for f in fs if f.allowed)
        total_err += err
        print("%s: エラー %d 件、警告 %d 件、注 %d 件（許可リストで除いたもの %d 件）" % (c, err, warn, note, alw))
    if unused:
        print("使われていない許可: %d 件" % len(unused))
    print("次の番号: " + "、".join("%s %d" % (s["label"], nexts[s["id"]]) for s in SYSTEMS))
    return 1 if total_err else 0


if __name__ == "__main__":
    sys.exit(main())
