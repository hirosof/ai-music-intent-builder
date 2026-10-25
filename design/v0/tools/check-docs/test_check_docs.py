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
