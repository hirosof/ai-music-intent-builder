# -*- coding: utf-8 -*-
"""build_presets.py の負例テスト（2026-10-28 時点では S14 グループ。判断ポイント214）。

使い方（リポジトリのどこからでも実行できる）:
    python tools/build-presets/test_build_presets.py

語彙を模した辞書（または一時フォルダの語彙の md）に違反を1つずつ仕込み、期待した検証エラーが出ることを確かめる。
リポジトリの語彙は読むだけで、変えない。標準ライブラリだけで動く（スキーマのケースは jsonschema がなければスキップ）。
終了コード: 0 = すべて期待どおり、1 = 期待と違うケースがある。
"""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_presets as bp  # noqa: E402

G = [{"id": "gregorian", "label": "西暦"}, {"id": "japanese-era", "label": "和暦"}]


def vocab(items, groups=G, structure="flat"):
    v = {"id": "era", "axis": "B", "label": "年代・時代感", "structure": structure, "items": items}
    if groups is not None:
        v["groups"] = groups
    return v


def item(i, group=None):
    it = {"id": i, "label": i}
    if group:
        it["group"] = group
    return it


OK_ITEMS = [item("no-era"), item("1980s", "gregorian"), item("1990s", "gregorian"), item("showa", "japanese-era")]


def s14(v):
    r = bp.Report()
    bp.validate_groups(v, r)
    return [e for e in r.errors if e.startswith("S14")]


class TestS14(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(s14(vocab(OK_ITEMS)), [])

    def test_no_groups_and_no_group_is_ok(self):
        self.assertEqual(s14(vocab([item("a"), item("b")], groups=None)), [])

    def test_categorized_cannot_have_groups(self):
        errs = s14(vocab(OK_ITEMS, structure="categorized"))
        self.assertTrue(any("flat 語彙だけ" in e for e in errs), errs)

    def test_group_id_format(self):
        errs = s14(vocab(OK_ITEMS, groups=[{"id": "Gregorian", "label": "西暦"}, G[1]]))
        self.assertTrue(any("形式違反" in e for e in errs), errs)

    def test_group_id_unique(self):
        errs = s14(vocab([item("a", "gregorian")], groups=[G[0], {"id": "gregorian", "label": "別"}]))
        self.assertTrue(any("重複" in e for e in errs), errs)

    def test_label_not_empty(self):
        errs = s14(vocab(OK_ITEMS, groups=[{"id": "gregorian", "label": " "}, G[1]]))
        self.assertTrue(any("label が空" in e for e in errs), errs)

    def test_empty_groups(self):
        errs = s14(vocab([item("a")], groups=[]))
        self.assertTrue(any("groups が空" in e for e in errs), errs)

    def test_undefined_group(self):
        errs = s14(vocab(OK_ITEMS + [item("x", "christian-era")]))
        self.assertTrue(any("未定義のグループ" in e for e in errs), errs)

    def test_group_without_groups(self):
        errs = s14(vocab([item("a"), item("b", "gregorian")], groups=None))
        self.assertTrue(any("groups のない語彙の語は group を持てない" in e for e in errs), errs)

    def test_ungrouped_first(self):
        items = [item("1980s", "gregorian"), item("no-era"), item("showa", "japanese-era")]
        errs = s14(vocab(items))
        self.assertTrue(any("グループなしの語は、グループのある語より前" in e for e in errs), errs)

    def test_contiguous(self):
        items = [item("1980s", "gregorian"), item("showa", "japanese-era"), item("1990s", "gregorian")]
        errs = s14(vocab(items))
        self.assertTrue(any("連続していない" in e for e in errs), errs)

    def test_order_follows_groups(self):
        items = [item("showa", "japanese-era"), item("1980s", "gregorian")]
        errs = s14(vocab(items))
        self.assertTrue(any("並びが groups の順と違う" in e for e in errs), errs)

    def test_empty_group(self):
        errs = s14(vocab([item("no-era"), item("1980s", "gregorian")]))
        self.assertTrue(any("語が1つもないグループ" in e for e in errs), errs)

    def test_validate_runs_s14(self):
        out = {"schemaVersion": 1, "vocabularies": [vocab([item("1980s", "gregorian"), item("no-era")], groups=G[:1])]}
        r = bp.Report()
        bp.validate(out, {}, r)
        self.assertTrue(any(e.startswith("S14 グループなしの語") for e in r.errors), r.errors)


class TestCollect(unittest.TestCase):
    """語彙の md の json ブロックから、groups を語彙ごとに取り込む"""

    def setUp(self):
        self.dir = Path(tempfile.mkdtemp(prefix="build_presets_test_"))
        self.saved = bp.VOCAB_DIR
        bp.VOCAB_DIR = self.dir

    def tearDown(self):
        bp.VOCAB_DIR = self.saved
        shutil.rmtree(self.dir, ignore_errors=True)

    def write(self, *blocks):
        body = "\n\n".join("```json\n%s\n```" % json.dumps(b, ensure_ascii=False) for b in blocks)
        (self.dir / "x.md").write_text(body, encoding="utf-8")

    def test_groups_go_to_the_vocab_of_the_block(self):
        self.write(
            {"items": [{"id": "low", "label": "低", "categories": ["intensity"]}]},
            {"groups": G, "items": [{"id": "1980s", "label": "1980年代", "categories": ["era"], "group": "gregorian"}]},
        )
        r = bp.Report()
        _, _, _, g_era = bp.collect_items("era", ["x.md"], "era", r)
        _, _, _, g_int = bp.collect_items("intensity", ["x.md"], "intensity", r)
        self.assertEqual(g_era, G)
        self.assertIsNone(g_int)
        self.assertEqual(r.errors, [])

    def test_groups_in_two_blocks(self):
        block = {"groups": G, "items": [{"id": "1980s", "label": "1980年代", "categories": ["era"], "group": "gregorian"}]}
        block2 = {"groups": G, "items": [{"id": "showa", "label": "昭和", "categories": ["era"], "group": "japanese-era"}]}
        self.write(block, block2)
        r = bp.Report()
        bp.collect_items("era", ["x.md"], "era", r)
        self.assertTrue(any("複数のブロック" in e for e in r.errors), r.errors)


class TestRepository(unittest.TestCase):
    """リポジトリの語彙（読むだけ）。era はグループを持ち、ほかの語彙は持たない"""

    def test_era_groups(self):
        r = bp.Report()
        out, ids, _ = bp.build(r)
        bp.validate(out, ids, r)
        self.assertEqual(r.errors, [])
        era = next(v for v in out["vocabularies"] if v["id"] == "era")
        self.assertEqual([g["label"] for g in era["groups"]], ["西暦", "和暦"])
        self.assertEqual([i.get("group") for i in era["items"]][:2], [None, "gregorian"])
        self.assertEqual([v["id"] for v in out["vocabularies"] if "groups" in v], ["era"])
        rendered = bp.render("era.json", bp.to_files(out)["era.json"])
        self.assertIn('"groups": [\n{"id": "gregorian", "label": "西暦"},\n', rendered)


class TestSchema(unittest.TestCase):
    def setUp(self):
        try:
            import jsonschema  # noqa: F401
        except ImportError:
            self.skipTest("jsonschema がない")
        import jsonschema
        self.validator = jsonschema.Draft202012Validator(json.loads(bp.SCHEMA_FILE.read_text(encoding="utf-8")))

    def errors(self, obj):
        return list(self.validator.iter_errors(obj))

    def base(self):
        return {"schemaVersion": 1, "id": "era", "axis": "B", "label": "年代", "structure": "flat",
                "groups": G, "items": [{"id": "1980s", "label": "1980年代", "group": "gregorian"}]}

    def test_flat_with_groups_ok(self):
        self.assertEqual(self.errors(self.base()), [])

    def test_categorized_with_groups_rejected(self):
        o = self.base()
        o.update({"structure": "categorized", "categories": [{"id": "c", "label": "c", "order": 1, "itemOrder": ["x"]}],
                  "items": [{"id": "x", "label": "x", "categories": ["c"]}]})
        self.assertNotEqual(self.errors(o), [])

    def test_group_label_required(self):
        o = self.base()
        o["groups"] = [{"id": "gregorian"}]
        self.assertNotEqual(self.errors(o), [])


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    result = unittest.main(exit=False, verbosity=1).result
    sys.exit(0 if result.wasSuccessful() else 1)
