# -*- coding: utf-8 -*-
"""check_chart.py の負例テスト。使い方（design/v0/ で実行）: python tools/check-chart/test_check_chart.py"""
import io
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_chart as cc  # noqa: E402

GOOD = """quadrantChart
    title 案の比較
    x-axis "暗い" --> "明るい"
    y-axis "弱い" --> "強い"
    quadrant-1 明るく強い
    "案1 華やか・王道": [0.8, 0.7]
    "案2 しっとり": [0.2, 0.3]
    "案3 力強い: 夜": [0.375, 1]"""


PY = sys.executable.replace("\\", "/")


def errs(block, n=3, axis="mood"):
    return cc.check_chart(block, n, axis)[0]


def answer(block, lang="mermaid"):
    return "## 図\n\n```%s\n%s\n```\n\n- 案1: 理由\n" % (lang, block)


class TestEmit(unittest.TestCase):
    def test_mood_3(self):
        t = cc.emit("mood", 3)
        self.assertTrue(t.startswith("上の回答の各案（案1〜案3）を比べる図を、Mermaid の quadrantChart で出力してください。\n"))
        self.assertIn('- 横軸は明暗（"暗い" --> "明るい"）、縦軸は強度（"弱い" --> "強い"）にしてください。\n', t)
        self.assertIn("3案すべてを入れてください", t)
        self.assertNotIn("{{", t)
        self.assertNotIn("```", t)
        self.assertTrue(t.endswith("名前の中には二重引用符を使わない。\n"))

    def test_all_axes_and_counts(self):
        _, axes = cc.fc_spec()
        self.assertEqual(sorted(axes), ["arrangement", "auto", "interpretation", "mood", "texture"])
        self.assertEqual(axes["auto"], axes["interpretation"])
        self.assertIn("（案1〜案5）", cc.emit("texture", 5))

    def test_rejects(self):
        with self.assertRaises(ValueError):
            cc.emit("genre", 3)
        with self.assertRaises(ValueError):
            cc.emit("mood", 1)


class TestBlocks(unittest.TestCase):
    def test_only_mermaid(self):
        text = answer(GOOD) + "\n```\nquadrantChart\n```\n" + "\n~~~mermaid\nquadrantChart\n~~~\n"
        self.assertEqual(len(cc.mermaid_blocks(text)), 2)
        self.assertEqual(cc.mermaid_blocks(text)[0], GOOD)

    def test_case_of_lang(self):
        self.assertEqual(len(cc.mermaid_blocks(answer(GOOD, "Mermaid"))), 1)


class TestChart(unittest.TestCase):
    def test_good(self):
        self.assertEqual(errs(GOOD), [])
        _, info = cc.check_chart(GOOD, 3, "mood")
        self.assertEqual(info["points"], ["案1 華やか・王道", "案2 しっとり", "案3 力強い: 夜"])
        self.assertEqual(info["axes"], {"x": ["暗い", "明るい"], "y": ["弱い", "強い"]})

    def has(self, block, word, **kw):
        found = errs(block, **kw)
        self.assertTrue(any(word in e for e in found), found)

    def test_not_quadrant(self):
        self.has(GOOD.replace("quadrantChart", "graph TD"), "quadrantChart")

    def test_count(self):
        self.has(GOOD, "点の数が 3（案の数は 4）", n=4)
        self.has(GOOD, "点のない案: 案4", n=4)
        self.has(GOOD.replace('"案3 力強い: 夜"', '"案2 力強い"'), "重複")
        self.has(GOOD.replace('"案3 力強い: 夜"', '"案5 力強い"'), "範囲外")
        self.has(GOOD.replace('"案3 力強い: 夜"', '"C 力強い"'), "「案N」で始まらない")
        self.has(GOOD.replace('"案3 力強い: 夜"', '"候補 案3"'), "「案N」で始まらない")
        self.has(GOOD.replace('"案3 力強い: 夜"', '"案3力強い"'), "「案N」で始まらない")
        self.has(GOOD.replace('"案3 力強い: 夜"', '"案30 力強い"'), "範囲外")

    def test_max_written_as_1_0(self):
        self.has(GOOD.replace("[0.375, 1]", "[0.375, 1.0]"), "「1.0」")
        self.has(GOOD.replace("[0.375, 1]", "[1.00, 0.5]"), "「1.00」")
        self.assertEqual(errs(GOOD.replace("[0.2, 0.3]", "[0.0, 0.3]")), [])

    def test_range_and_number(self):
        self.has(GOOD.replace("[0.2, 0.3]", "[1.2, 0.3]"), "0〜1の外")
        self.has(GOOD.replace("[0.2, 0.3]", "[-0.1, 0.3]"), "0〜1の外")
        self.has(GOOD.replace("[0.2, 0.3]", "[a, 0.3]"), "数値でない")

    def test_two_points_one_line(self):
        block = GOOD.replace('"案2 しっとり": [0.2, 0.3]\n    "案3 力強い: 夜": [0.375, 1]',
                             '"案2 しっとり": [0.2, 0.3] "案3 力強い": [0.375, 1]')
        self.has(block, "1行に2点以上")

    def test_quotes(self):
        self.has(GOOD.replace('"案2 しっとり"', "案2 しっとり"), "点の名前が二重引用符で囲まれていない")
        self.has(GOOD.replace('"案2 しっとり"', '"案2 "しっとり""'), "点の名前の中に二重引用符")
        self.has(GOOD.replace('x-axis "暗い" --> "明るい"', "x-axis 暗い --> 明るい"), "x-axis の名前が二重引用符")
        self.has(GOOD.replace('y-axis "弱い" --> "強い"', 'y-axis "弱い"'), "y-axis の両端の名前が2つでない")

    def test_mood_axes(self):
        self.has(GOOD.replace('"暗い" --> "明るい"', '"明るい" --> "暗い"'), "x-axis が指定と違う")
        self.has(GOOD.replace('"弱い" --> "強い"', '"静か" --> "激しい"'), "y-axis が指定と違う")
        self.has(GOOD.replace('    x-axis "暗い" --> "明るい"\n', ""), "x-axis がない")

    def test_other_axes_free(self):
        block = GOOD.replace('"暗い" --> "明るい"', '"少人数" --> "大編成"')
        self.assertEqual(errs(block, axis="arrangement"), [])
        self.assertEqual(errs(block, axis=None), [])

    def test_unreadable_line(self):
        self.has(GOOD + "\n    案4 だけ", "読めない行")


class TestCheck(unittest.TestCase):
    def run_check(self, files, **kw):
        with tempfile.TemporaryDirectory() as d:
            for name, text in files.items():
                (Path(d) / name).write_text(text, encoding="utf-8")
            out = io.StringIO()
            code = cc.check([d], kw.pop("n", 3), kw.pop("axis", "mood"), kw.pop("mmdc", "no-such-mmdc-xyz"), out)
            return code, out.getvalue()

    def test_ok_without_mmdc(self):
        code, report = self.run_check({"a.md": answer(GOOD)})
        self.assertEqual(code, 0)
        self.assertIn("未確認", report)
        self.assertIn("| a.md | 1 個 | 3 | x: 暗い --> 明るい／y: 弱い --> 強い | OK | 未確認 |", report)

    def test_fails(self):
        code, report = self.run_check({"a.md": answer(GOOD), "b.md": answer(GOOD.replace("[0.375, 1]", "[0.375, 1.0]"))})
        self.assertEqual(code, 1)
        self.assertIn("## b.md", report)
        self.assertNotIn("## a.md", report)

    def test_no_block_or_two(self):
        self.assertEqual(self.run_check({"a.md": "図なし"})[0], 1)
        self.assertEqual(self.run_check({"a.md": answer(GOOD) + answer(GOOD)})[0], 1)

    def test_render_failure_counts(self):
        # 必ず失敗する「mmdc」として python を使う（-i などを渡すと終了コードが0でない）
        code, report = self.run_check({"a.md": answer(GOOD)}, mmdc='"%s" -c "import sys; sys.exit(3)"' % PY)
        self.assertEqual(code, 1)
        self.assertIn("描けない", report)

    def test_render_success(self):
        # 出力ファイルを作って0で終わる「mmdc」
        fake = "import sys; a=sys.argv; open(a[a.index('-o')+1],'w').write('<svg/>')"
        code, report = self.run_check({"a.md": answer(GOOD)}, mmdc='"%s" -c "%s"' % (PY, fake))
        self.assertEqual(code, 0, report)
        self.assertIn("描けた", report)


if __name__ == "__main__":
    unittest.main()
