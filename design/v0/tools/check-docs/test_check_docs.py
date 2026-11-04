# -*- coding: utf-8 -*-
"""check_docs.py の負例テスト。

使い方（リポジトリのどこからでも実行できる）:
    python tools/check-docs/test_check_docs.py

一時フォルダに、検査に要る最小の文書の木を作り、違反を1つずつ仕込んで、期待した検出が出ることを確かめる。
リポジトリの文書は読まない・変えない。標準ライブラリだけで動く。
終了コード: 0 = すべて期待どおり、1 = 期待と違うケースがある。
"""

import contextlib
import io
import json
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_docs  # noqa: E402

D = "design/v0/docs/"

BASE = {
    D + "decisions/presets.md": (
        "# p\n\n## 6. 判断ポイント\n\n| # | 論点 | 決定 |\n|---|---|---|\n"
        "| 1 | a | b |\n| 2 | （語彙の判断） | → `vocabulary/README.md` |\n\n## 7. 次\n"
    ),
    D + "decisions/vocabulary/README.md": (
        "# v\n\n## 5. 判断ポイント\n\n| # | 論点 | 決定 |\n|---|---|---|\n| 2 | c | d |\n| 3 | e | f |\n\n## 6. 次\n"
    ),
    D + "decisions/input-items.md": "# i\n\n## 4. 判断ポイント\n\n| 1 | a | b |\n\n## 5. 次\n",
    D + "decisions/ui-and-nonfunctional.md": (
        "# u\n\n## 7. 判断ポイント\n\n| # | 判断 | 既定値 | 根拠 |\n|---|---|---|---|\n"
        "| 1 | a | b | c |\n| 2 | d | e | f |\n\n## 8. 次\n"
    ),
    D + "specifications/tool-profile.md": "# t\n\n## 11. 判断ポイント\n\n| 1 | a | b |\n\n## 12. 次\n",
    D + "decisions/request-text.md": (
        "# r\n\n## 5. 対象ツール（例の中の見出し。節ではない）\n\n| 9 | x | y |\n\n"
        "## 5. 判断ポイント（既定値で進行中）\n\n| 1 | a | b |\n| 2 | c | d |\n\n"
        "## 6. 補完・仮定一覧\n\n| 1 | a | b |\n\n## 7. 次\n"
    ),
    D + "specifications/song-file.md": "# s\n\n## 10. 判断ポイント\n\n| 2 | d | e |\n\n## 11. 次\n",
    D + "specifications/fields.json": '{"a": "日本語"}\n',
    "CLAUDE.md": "# c\n\n本文。`design/v0/docs/` を読む。\n",
}


class Tree:
    def __init__(self, changes=None, allow=None):
        self.dir = Path(tempfile.mkdtemp(prefix="check_docs_test_"))
        files = dict(BASE)
        files.update(changes or {})
        for rel, content in files.items():
            if content is None:
                continue
            p = self.dir / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(content.encode("utf-8") if isinstance(content, str) else content)
        self.allow = self.dir / "allowlist.json"
        self.allow.write_text(json.dumps(allow or {}, ensure_ascii=False), encoding="utf-8")

    def run(self):
        return check_docs.run(str(self.dir), str(self.allow))

    def active(self, check=None, level=None):
        findings, _, _ = self.run()
        return [f for f in findings if not f.allowed and (check is None or f.check == check)
                and (level is None or f.level == level)]

    def close(self):
        shutil.rmtree(self.dir, ignore_errors=True)


@contextlib.contextmanager
def tree(changes=None, allow=None):
    t = Tree(changes, allow)
    try:
        yield t
    finally:
        t.close()


def kinds(findings):
    return sorted(f.kind for f in findings)


class TestClean(unittest.TestCase):
    def test_clean_tree_has_no_errors(self):
        with tree() as t:
            findings, nexts, unused = t.run()
            self.assertEqual([f.message for f in findings if not f.allowed], [])
            self.assertEqual(nexts, {"vocab": 4, "input": 2, "ui": 3, "tool": 2, "text": 3, "text-aux": 2})
            self.assertEqual(unused, [])

    def test_main_exit_code_and_next(self):
        with tree() as t:
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = check_docs.main(["--root", str(t.dir), "--allowlist", str(t.allow), "--next"])
            self.assertEqual(code, 0)
            self.assertIn("UI・非機能・保存: 3", out.getvalue())
            self.assertIn("依頼文の補完・仮定: 2", out.getvalue())


UI = D + "decisions/ui-and-nonfunctional.md"
UI_HEAD = "# u\n\n## 7. 判断ポイント\n\n| # | 判断 | 既定値 | 根拠 |\n|---|---|---|---|\n"


class TestA1(unittest.TestCase):
    def test_duplicate(self):
        with tree({UI: UI_HEAD + "| 1 | a | b | c |\n| 2 | d | e | f |\n| 2 | g | h | i |\n\n## 8.\n"}) as t:
            self.assertEqual(kinds(t.active("A1")), ["duplicate"])

    def test_missing(self):
        with tree({UI: UI_HEAD + "| 1 | a | b | c |\n| 3 | d | e | f |\n\n## 8.\n"}) as t:
            fs = t.active("A1")
            self.assertEqual(kinds(fs), ["missing"])
            self.assertEqual(fs[0].number, 2)

    def test_order(self):
        with tree({UI: UI_HEAD + "| 2 | d | e | f |\n| 1 | a | b | c |\n\n## 8.\n"}) as t:
            self.assertEqual(kinds(t.active("A1")), ["order"])

    def test_struck_row_counts(self):
        with tree({UI: UI_HEAD + "| ~~1~~ | a | b | c |\n| 2 | d | e | f |\n\n## 8.\n"}) as t:
            self.assertEqual(t.active("A1"), [])

    def test_vocab_duplicate_across_files(self):
        changes = {D + "decisions/presets.md": "## 6. 判断ポイント\n\n| 1 | a | b |\n| 2 | 本体 | c |\n\n## 7.\n"}
        with tree(changes) as t:
            self.assertEqual(kinds(t.active("A1")), ["duplicate"])

    def test_dangling_pointer(self):
        changes = {D + "decisions/presets.md": (
            "## 6. 判断ポイント\n\n| 1 | a | b |\n| 2 | （x） | → `vocabulary/README.md` |\n"
            "| 5 | （y） | → `vocabulary/README.md` |\n\n## 7.\n")}
        with tree(changes) as t:
            self.assertEqual(kinds(t.active("A1")), ["dangling-pointer"])

    def test_missing_section(self):
        with tree({D + "specifications/tool-profile.md": "# t\n\n## 11. 別の節\n"}) as t:
            self.assertEqual(kinds(t.active("A1")), ["missing-section"])

    def test_allowlist(self):
        allow = {"a1": [{"system": "ui", "kind": "missing", "number": 2, "reason": "テスト"}]}
        with tree({UI: UI_HEAD + "| 1 | a | b | c |\n| 3 | d | e | f |\n\n## 8.\n"}, allow) as t:
            self.assertEqual(t.active("A1"), [])


class TestA2(unittest.TestCase):
    def test_number_not_in_ui(self):
        with tree({D + "specifications/song-file.md": "## 10. 判断ポイント\n\n| 2 | a | b |\n| 9 | c | d |\n\n## 11.\n"}) as t:
            fs = t.active("A2")
            self.assertEqual(kinds(fs), ["not-in-ui"])
            self.assertEqual(fs[0].number, 9)


class TestA3(unittest.TestCase):
    def test_broken_md_link(self):
        with tree({D + "a.md": "[x](./nothing.md) と [y](https://example.com/) と [z](#anchor)\n"}) as t:
            self.assertEqual(kinds(t.active("A3")), ["link"])

    def test_broken_backtick_path(self):
        with tree({D + "decisions/b.md": "`../input-items.md` は無い。`./request-text.md` はある\n"}) as t:
            fs = t.active("A3")
            self.assertEqual(kinds(fs), ["path"])
            self.assertEqual(fs[0].text, "../input-items.md")

    def test_code_block_and_placeholder_ignored(self):
        with tree({D + "c.md": "```\n[x](./nothing.md)\n```\n`./rendered-*.md` と `../{name}/`\n"}) as t:
            self.assertEqual(t.active("A3"), [])

    def test_tools_readme_is_checked(self):
        with tree({"design/v0/tools/x/README.md": "`../nothing/`\n"}) as t:
            self.assertEqual(kinds(t.active("A3")), ["path"])

    def test_allowlist(self):
        allow = {"a3": [{"file": D + "a.md", "path": "./nothing.md", "reason": "例"}]}
        with tree({D + "a.md": "[x](./nothing.md)\n"}, allow) as t:
            self.assertEqual(t.active("A3"), [])


class TestA4(unittest.TestCase):
    def test_fffd(self):
        with tree({D + "a.md": "壊れた\ufffd文字\n"}) as t:
            self.assertEqual(kinds(t.active("A4")), ["fffd"])

    def test_uesc(self):
        with tree({D + "a.md": "\\u65e5\\u672c と \\uXXXX（説明の文字は対象外）\n"}) as t:
            self.assertEqual(kinds(t.active("A4")), ["uesc", "uesc"])

    def test_fullwidth_digit(self):
        with tree({D + "a.md": "教訓４-２２\n"}) as t:
            self.assertEqual(kinds(t.active("A4")), ["fwdigit"])

    def test_cr(self):
        with tree({D + "a.md": "行1\r\n行2\r\n".encode("utf-8")}) as t:
            self.assertEqual(kinds(t.active("A4")), ["cr"])

    def test_json_in_specifications(self):
        with tree({D + "specifications/presets/x.json": '{"label": "３拍子"}\n'}) as t:
            fs = t.active("A4")
            self.assertEqual(kinds(fs), ["fwdigit"])
            self.assertTrue(fs[0].file.endswith("presets/x.json"))

    def test_allowlist_by_line_content(self):
        allow = {"a4": [{"file": D + "a.md", "kind": "fwdigit", "contains": "全角「２３」", "reason": "例"}]}
        with tree({D + "a.md": "例: 全角「２３」になる\nほかの行の「４」\n"}, allow) as t:
            fs = t.active("A4")
            self.assertEqual(len(fs), 1)
            self.assertIn("４", fs[0].text)


class TestA5(unittest.TestCase):
    def test_stale(self):
        with tree({D + "n.md": "- `decisions/ui-and-nonfunctional.md` §7 の独立した番号。次は **42**\n"}) as t:
            fs = t.active("A5", "warning")
            self.assertEqual(kinds(fs), ["stale"])
            self.assertEqual(fs[0].system, "ui")

    def test_current_is_note(self):
        with tree({D + "n.md": "`request-text.md` §5 の次の番号は 3\n"}) as t:
            self.assertEqual(t.active("A5", "warning"), [])
            self.assertEqual(kinds(t.active("A5", "note")), ["current"])

    def test_table_row(self):
        with tree({D + "n.md": "| 系統 | 場所 | 次の番号 |\n|---|---|---|\n| 入力項目 | `input-items.md` §4 | 7 |\n"}) as t:
            fs = t.active("A5", "warning")
            self.assertEqual(kinds(fs), ["stale"])
            self.assertEqual(fs[0].system, "input")

    def test_aux(self):
        with tree({D + "n.md": "`request-text.md` §5 の次は 3、§6 の補完・仮定の次は 9\n"}) as t:
            fs = t.active("A5", "warning")
            self.assertEqual([(f.system, f.number) for f in fs], [("text-aux", 9)])

    def test_unknown_system(self):
        with tree({D + "n.md": "番号の次は **54** と書いた\n"}) as t:
            self.assertEqual(kinds(t.active("A5", "warning")), ["unknown"])

    def test_history_is_skipped(self):
        handoff = (
            "- 2026-10-19 追記1: `ui-and-nonfunctional.md` §7 で次は **43**\n"
            "## 8. 前回までの引き継ぎ\n`ui-and-nonfunctional.md` §7 で次は **10**\n"
        )
        with tree({D + "handoff-next-thread.md": handoff, D + "discussions/x.md": "`input-items.md` の次は **1**\n"}) as t:
            self.assertEqual(t.active("A5"), [])


CHECKLIST = D + "checklists/user-check.md"


class TestChecklistSamples(unittest.TestCase):
    """checklists/samples/ は見本ファイルの置き場所で、チェックシートとして見ない"""
    README = D + "checklists/samples/README.md"

    def test_not_a_sheet(self):
        with tree({CHECKLIST: "# c\n", self.README: "# 見本\n\n- [x] 印\n"}) as t:
            self.assertEqual(t.active("A6"), [])
            self.assertEqual([f.file for f in t.active("A7")], [CHECKLIST])

    def test_does_not_clear_a8(self):
        files = {UI_FILE: ui_rows(81), CHECKLIST: sheet(related_item("UI 1")),
                 D + "checklists/samples/s.md": sheet(related_item("UI 81"))}
        with tree(files) as t:
            self.assertEqual([f.number for f in t.active("A8")], [81])

    def test_only_that_name_is_skipped(self):
        with tree({CHECKLIST: "# c\n", D + "checklists/samples2/a.md": "- [x] 印\n"}) as t:
            self.assertEqual(len(t.active("A6")), 1)

    def test_still_link_checked(self):
        with tree({self.README: "[見本](missing.json)\n"}) as t:
            self.assertEqual(len(t.active("A3")), 1)


class TestA6(unittest.TestCase):
    def test_unchecked_is_clean(self):
        with tree({CHECKLIST: "# c\n\n- [ ] **A-01** 項目\n  - 期待: 出る\n"}) as t:
            self.assertEqual(t.active("A6"), [])

    def test_checked_lower(self):
        with tree({CHECKLIST: "- [ ] a\n- [x] b\n"}) as t:
            fs = t.active("A6")
            self.assertEqual(kinds(fs), ["checked"])
            self.assertEqual((fs[0].line, fs[0].level), (2, "error"))

    def test_checked_upper(self):
        with tree({CHECKLIST: "- [X] b\n"}) as t:
            self.assertEqual(kinds(t.active("A6")), ["checked"])

    def test_other_list_forms(self):
        text = "  - [x] 字下げ\n* [x] 星\n+ [x] 足す\n1. [x] 番号\n2) [X] 括弧\n> - [x] 引用\n"
        with tree({CHECKLIST: text}) as t:
            self.assertEqual(kinds(t.active("A6")), ["checked"] * 6)

    def test_result_children(self):
        text = "- **A-01** 項目\n  - チェック結果\n    - [ ] OK\n    - [x] NG：崩れる\n    - [X] OK\n"
        with tree({CHECKLIST: text}) as t:
            fs = t.active("A6")
            self.assertEqual(kinds(fs), ["checked", "checked"])
            self.assertEqual([f.line for f in fs], [4, 5])

    def test_mark_in_prose_is_not_checked(self):
        with tree({CHECKLIST: "チェック済みの印 `- [x]` は付けない。[x] と [X]\n- [ ] 配列 a[x] を見る\n"}) as t:
            self.assertEqual(t.active("A6"), [])

    def test_subfolder_is_checked(self):
        with tree({D + "checklists/sub/a.md": "- [x] b\n"}) as t:
            self.assertEqual(kinds(t.active("A6")), ["checked"])

    def test_outside_checklists_is_ignored(self):
        with tree({D + "a.md": "- [x] b\n", "temp/user-check.md": "- [x] b\n"}) as t:
            self.assertEqual(t.active("A6"), [])

    def test_non_markdown_is_ignored(self):
        with tree({D + "checklists/a.txt": "- [x] b\n"}) as t:
            self.assertEqual(t.active("A6"), [])

    def test_no_folder_is_clean(self):
        with tree() as t:
            self.assertEqual(t.active("A6"), [])

    def test_gives_exit_1(self):
        with tree({CHECKLIST: "- [x] b\n"}) as t:
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = check_docs.main(["--root", str(t.dir), "--allowlist", str(t.allow)])
            self.assertEqual(code, 1)
            self.assertIn("A6: エラー 1 件", out.getvalue())


def item(no="A-01", fields=None, note=False, result=None):
    """A7 の正しい項目。fields・result で崩す"""
    lines = ["- **%s** 確かめること" % no]
    if fields is None:
        fields = ["  - 端末: PC", "  - 手順: 押す", "  - 期待: 出る", "  - 関係: UI 1・語彙 2・入力項目 3・文面 4・ツール 5"]
        if note:
            fields.append("  - 注意: 仮のデータで確かめる")
    if result is None:
        result = ["  - チェック結果", "    - [ ] OK", "    - [ ] NG"]
    return "\n".join(lines + fields + result) + "\n"


def sheet(body):
    return "# c\n\n## 使い方\n\n- 説明の箇条書き\n\n## A. 短い確認\n\n説明の文。\n\n" + body


FIELDS = ["  - 端末: PC", "  - 手順: 押す", "  - 期待: 出る", "  - 関係: UI 1"]


class TestA7(unittest.TestCase):
    def found(self, body):
        with tree({CHECKLIST: sheet(body)}) as t:
            return kinds(t.active("A7"))

    def test_good(self):
        body = item() + item("A-02", note=True) + "\n### A-1. 小節\n\n" + item("A-03") + "\n## B. 機能\n\n" + item("B-01")
        self.assertEqual(self.found(body), [])

    def test_lists_before_sections_are_ignored(self):
        with tree({CHECKLIST: "- [ ] 形の違う箇条書き\n\n## 使い方\n\n- 説明\n  - 字下げ\n\n## A. 節\n\n" + item()}) as t:
            self.assertEqual(t.active("A7"), [])

    def test_section_other_than_letter_ends_items(self):
        self.assertEqual(self.found(item() + "\n## 補足\n\n- 説明\n  - 字下げ\n"), [])

    def test_head_checkbox(self):
        self.assertEqual(self.found(item().replace("- **A-01**", "- [ ] **A-01**")), ["head-checkbox"])

    def test_head_checked_is_also_a6(self):
        with tree({CHECKLIST: sheet(item().replace("- **A-01**", "- [x] **A-01**"))}) as t:
            self.assertEqual(kinds(t.active("A7")), ["head-checkbox"])
            self.assertEqual(kinds(t.active("A6")), ["checked"])

    def test_head_forms(self):
        for bad in ("- A-01 確かめること", "- **A-1** 確かめること", "- **A-001** 確かめること", "- **A01** 確かめること",
                    "- **A-01**", "* **A-01** 確かめること", "1. **A-01** 確かめること"):
            with self.subTest(bad):
                self.assertEqual(self.found(item().replace("- **A-01** 確かめること", bad)), ["head"])

    def test_letter(self):
        self.assertEqual(self.found(item("B-01")), ["letter"])

    def test_letter_is_taken_from_the_nearest_section(self):
        self.assertEqual(self.found(item() + "\n## B. 機能\n\n" + item("A-02")), ["letter"])

    def test_duplicate(self):
        self.assertEqual(self.found(item() + item()), ["duplicate"])

    def test_duplicate_after_gap(self):
        self.assertEqual(self.found(item() + item("A-02") + item("A-01")), ["duplicate"])

    def test_sequence_gap(self):
        self.assertEqual(self.found(item() + item("A-03")), ["sequence"])

    def test_sequence_must_start_at_01(self):
        self.assertEqual(self.found(item("A-02")), ["sequence"])

    def test_sequence_is_per_letter(self):
        self.assertEqual(self.found(item() + item("A-02") + "\n## B. 機能\n\n" + item("B-01") + item("B-02")), [])

    def test_sequence_continues_over_subsections(self):
        self.assertEqual(self.found(item() + "\n### A-1. 小節\n\n" + item("A-03")), ["sequence"])

    def test_missing_each_field(self):
        for i in range(4):
            with self.subTest(FIELDS[i]):
                self.assertEqual(self.found(item(fields=FIELDS[:i] + FIELDS[i + 1:])), ["fields"])

    def test_field_order(self):
        self.assertEqual(self.found(item(fields=[FIELDS[1], FIELDS[0]] + FIELDS[2:])), ["fields"])

    def test_note_after_result_is_wrong(self):
        body = item(result=["  - チェック結果", "    - [ ] OK", "    - [ ] NG", "  - 注意: 仮のデータで確かめる"])
        self.assertEqual(self.found(body), ["fields"])

    def test_note_before_related_is_wrong(self):
        body = item(fields=FIELDS[:3] + ["  - 注意: 仮のデータで確かめる", FIELDS[3]])
        self.assertEqual(self.found(body), ["fields"])

    def test_unknown_field(self):
        self.assertEqual(self.found(item(fields=FIELDS + ["  - 補足: 何か"])), ["fields"])

    def test_empty_value(self):
        for bad in ("  - 手順:", "  - 手順: "):
            with self.subTest(bad):
                self.assertEqual(self.found(item(fields=FIELDS[:1] + [bad] + FIELDS[2:])), ["fields"])

    def test_missing_result(self):
        self.assertEqual(self.found(item(result=[])), ["fields"])

    def test_result_forms(self):
        for bad in (["  - チェック結果", "    - [ ] OK"],
                    ["  - チェック結果", "    - [ ] NG"],
                    ["  - チェック結果", "    - [ ] NG", "    - [ ] OK"],
                    ["    - [ ] OK", "    - [ ] NG"],
                    ["    - チェック結果", "    - [ ] OK", "    - [ ] NG"],
                    ["  - チェック結果", "    - OK", "    - NG"],
                    ["  - チェック結果", "  - [ ] OK", "  - [ ] NG"],
                    ["  - チェック結果", "    - [ ] OK：よい", "    - [ ] NG"],
                    ["  - チェック結果", "    - [ ] OK", "    - [ ] NG", "    - [ ] 保留"]):
            with self.subTest(bad):
                self.assertEqual(self.found(item(result=bad)), ["fields"])

    def test_checked_result_is_left_to_a6(self):
        with tree({CHECKLIST: sheet(item(result=["  - チェック結果", "    - [x] OK", "    - [X] NG"]))}) as t:
            self.assertEqual(t.active("A7"), [])
            self.assertEqual(kinds(t.active("A6")), ["checked", "checked"])

    def test_device_value(self):
        self.assertEqual(self.found(item(fields=["  - 端末: タブレット"] + FIELDS[1:])), ["device"])

    def test_device_values_allowed(self):
        for v in ("PC", "スマホ", "両方"):
            with self.subTest(v):
                self.assertEqual(self.found(item(fields=["  - 端末: " + v] + FIELDS[1:])), [])

    def test_note_text(self):
        self.assertEqual(self.found(item(fields=FIELDS + ["  - 注意: データが消える"])), ["note"])

    def test_related_form(self):
        for bad in ("UI1", "判断ポイント38", "UI 1、UI 2", "UI 1・", "なし"):
            with self.subTest(bad):
                self.assertEqual(self.found(item(fields=FIELDS[:3] + ["  - 関係: " + bad])), ["related"])

    def test_blank_line_inside_item(self):
        lines = item().split("\n")
        body = "\n".join(lines[:3] + [""] + lines[3:])
        self.assertEqual(self.found(body), ["fields", "orphan", "orphan", "orphan", "orphan", "orphan"])

    def test_orphan_indented_line(self):
        self.assertEqual(self.found(item() + "\n  - 端末: PC\n"), ["orphan"])

    def test_last_item_is_checked(self):
        self.assertEqual(self.found(item() + "- **A-02** 確かめること\n"), ["fields"])

    def test_last_item_without_newline_is_checked(self):
        self.assertEqual(self.found(item() + "- **A-02** 確かめること"), ["fields"])

    def test_any_section_letter(self):
        self.assertEqual(self.found(item() + "\n## Z. 節\n\n" + item("Z-02")), ["sequence"])

    def test_item_before_heading_is_checked(self):
        self.assertEqual(self.found("- **A-01** 確かめること\n### 小節\n" + item("A-02")), ["fields"])

    def test_line_numbers(self):
        with tree({CHECKLIST: sheet(item() + item("A-03"))}) as t:
            fs = t.active("A7")
            text = sheet(item() + item("A-03")).split("\n")
            self.assertEqual(fs[0].line, text.index("- **A-03** 確かめること") + 1)

    def test_no_item_section(self):
        with tree({CHECKLIST: "# c\n\n## 使い方\n\n- 説明\n"}) as t:
            self.assertEqual(kinds(t.active("A7")), ["no-items"])

    def test_section_without_items(self):
        self.assertEqual(self.found("説明だけ。\n"), ["no-items"])

    def test_every_file_is_checked(self):
        for bad in (CHECKLIST, D + "checklists/sub/b.md"):
            good = CHECKLIST if bad != CHECKLIST else D + "checklists/sub/b.md"
            with self.subTest(bad), tree({good: sheet(item()), bad: sheet(item("A-02"))}) as t:
                fs = t.active("A7")
                self.assertEqual(kinds(fs), ["sequence"])
                self.assertEqual(fs[0].file, bad)

    def test_numbering_is_per_file(self):
        with tree({CHECKLIST: sheet(item()), D + "checklists/b.md": sheet(item())}) as t:
            self.assertEqual(t.active("A7"), [])

    def test_outside_checklists_is_ignored(self):
        with tree({D + "a.md": sheet(item("A-09")), "temp/user-check.md": sheet(item("A-09"))}) as t:
            self.assertEqual(t.active("A7"), [])

    def test_non_markdown_is_ignored(self):
        with tree({D + "checklists/a.txt": "- 形の違うもの\n"}) as t:
            self.assertEqual(t.active("A7"), [])

    def test_no_folder_is_clean(self):
        with tree() as t:
            self.assertEqual(t.active("A7"), [])

    def test_gives_exit_1(self):
        with tree({CHECKLIST: sheet(item("A-02"))}) as t:
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = check_docs.main(["--root", str(t.dir), "--allowlist", str(t.allow)])
            self.assertEqual(code, 1)
            self.assertIn("A7: エラー 1 件", out.getvalue())


UI_FILE = D + "decisions/ui-and-nonfunctional.md"


def ui_rows(*numbers):
    rows = "".join("| %s | a | b | c |\n" % n for n in numbers)
    return "# u\n\n## 7. 判断ポイント\n\n| # | 判断 | 既定値 | 根拠 |\n|---|---|---|---|\n" + rows + "\n## 8. 次\n"


def related_item(related, no="A-01"):
    return item(no, fields=FIELDS[:3] + ["  - 関係: " + related])


class TestA8(unittest.TestCase):
    def missing(self, numbers, related=None, extra=None, allow=None):
        files = {UI_FILE: ui_rows(*numbers)}
        if related is not None:
            files[CHECKLIST] = sheet(related_item(related))
        files.update(extra or {})
        with tree(files, allow=allow) as t:
            return [f.number for f in t.active("A8")]

    def test_80_and_below_are_out_of_scope(self):
        self.assertEqual(self.missing([1, 79, 80]), [])

    def test_81_is_in_scope(self):
        self.assertEqual(self.missing([80, 81]), [81])

    def test_every_number_from_81(self):
        self.assertEqual(self.missing([81, 82, 83], "UI 82"), [81, 83])

    def test_related_clears(self):
        self.assertEqual(self.missing([81], "UI 81"), [])

    def test_several_in_one_field(self):
        self.assertEqual(self.missing([81, 82], "UI 1・UI 81・UI 82"), [])

    def test_struck_through_row_counts(self):
        self.assertEqual(self.missing(["~~81~~"]), [81])

    def test_other_systems_do_not_clear(self):
        for bad in ("語彙 81", "入力項目 81", "文面 81", "ツール 81"):
            with self.subTest(bad):
                self.assertEqual(self.missing([81], bad), [81])

    def test_other_numbers_do_not_clear(self):
        for bad in ("UI 8", "UI 811", "UI 810", "UI 81注"):
            with self.subTest(bad):
                self.assertEqual(self.missing([81], bad), [81])

    def test_other_fields_do_not_clear(self):
        body = re.sub(r"  - 手順: .*\n", "  - 手順: UI 81\n", item())
        self.assertIn("手順: UI 81\n", body)
        self.assertEqual(self.missing([81], extra={CHECKLIST: sheet(body)}), [81])

    def test_outside_item_sections_do_not_clear(self):
        sample = "# c\n\n## 項目の書式\n\n" + related_item("UI 81") + "\n## A. 節\n\n" + item()
        self.assertEqual(self.missing([81], extra={CHECKLIST: sample}), [81])

    def test_section_after_item_section_does_not_clear(self):
        sample = "# c\n\n## A. 節\n\n" + item() + "\n## 補足\n\n" + related_item("UI 81")
        self.assertEqual(self.missing([81], extra={CHECKLIST: sample}), [81])

    def test_item_section_after_other_section(self):
        sample = "# c\n\n## 使い方\n\n本文\n\n## A. 節\n\n" + related_item("UI 81")
        self.assertEqual(self.missing([81], extra={CHECKLIST: sample}), [])

    def test_any_checklist_file_clears(self):
        other = D + "checklists/sub/b.md"
        self.assertEqual(self.missing([81], "UI 1", {other: sheet(related_item("UI 81"))}), [])
        self.assertEqual(self.missing([81], "UI 81", {other: sheet(related_item("UI 1"))}), [])

    def test_non_checklist_file_does_not_clear(self):
        self.assertEqual(self.missing([81], "UI 1", {D + "a.md": sheet(related_item("UI 81"))}), [81])

    def test_allowlist_with_reason(self):
        allow = {"a8": [{"system": "ui", "number": 81, "reason": "画面に出ない"}]}
        self.assertEqual(self.missing([81, 82], allow=allow), [82])

    def test_allowlist_other_number_is_unused(self):
        allow = {"a8": [{"system": "ui", "number": 90, "reason": "古い"}]}
        with tree({UI_FILE: ui_rows(81)}, allow=allow) as t:
            findings, _, unused = t.run()
            self.assertEqual(len(unused), 1)
            self.assertEqual([f.number for f in findings if f.check == "A8" and not f.allowed], [81])

    def test_allowlist_without_reason_is_an_error(self):
        with tree({UI_FILE: ui_rows(81)}, allow={"a8": [{"system": "ui", "number": 81}]}) as t:
            with self.assertRaises(ValueError):
                t.run()

    def test_finding_points_at_the_row(self):
        with tree({UI_FILE: ui_rows(1, 81)}) as t:
            f = t.active("A8")[0]
            self.assertEqual((f.level, f.file, f.line), ("error", UI_FILE, 8))

    def test_exit_code_and_summary(self):
        with tree({UI_FILE: ui_rows(81)}) as t:
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = check_docs.main(["--root", str(t.dir), "--allowlist", str(t.allow)])
            self.assertEqual(code, 1)
            self.assertIn("A8: エラー 1 件", out.getvalue())


class TestAllowlistFile(unittest.TestCase):
    def test_reason_required(self):
        with tree(allow={"a3": [{"file": D + "a.md", "path": "./x.md"}]}) as t:
            with self.assertRaises(ValueError):
                t.run()
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = check_docs.main(["--root", str(t.dir), "--allowlist", str(t.allow)])
            self.assertEqual(code, 2)

    def test_unused_entry_reported(self):
        allow = {"a4": [{"file": D + "a.md", "kind": "fwdigit", "contains": "ない", "reason": "古い許可"}]}
        with tree(allow=allow) as t:
            _, _, unused = t.run()
            self.assertEqual(len(unused), 1)

    def test_error_gives_exit_1(self):
        with tree({D + "a.md": "\ufffd\n"}) as t:
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = check_docs.main(["--root", str(t.dir), "--allowlist", str(t.allow)])
            self.assertEqual(code, 1)
            self.assertIn("A4: エラー 1 件", out.getvalue())


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    result = unittest.main(exit=False, verbosity=1).result
    sys.exit(0 if result.wasSuccessful() else 1)
