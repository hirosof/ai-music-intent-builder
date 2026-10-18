# -*- coding: utf-8 -*-
"""アプリ（TypeScript）の保存データの検証が、check_fields.py と同じ指摘を出すかを照合するための、正解データを書き出す。

使い方（design/v0/ で実行）:
    python tools/check-fields/export_parity_cases.py           # 書き出す
    python tools/check-fields/export_parity_cases.py --check   # 書き出さず、書き出し先が最新か確かめる（最新でなければ終了コード2）

test_check_fields.py の CASES のうち、保存データを入力とするケース（仕様のファイルに違反を仕込む mutate のケースを除く）について、
入力と、check_fields.py が実際に出した指摘（保存データの検証の分だけ。項目定義・ツールプロファイルの検証の注記は除く）を書き出す。
書き出し先: app/src/domain/__tests__/fixtures/check-fields-cases.json（生成物。手で編集しない）。
test_check_fields.py を変えたら、再実行して一緒にコミットする。

仕様: docs/specifications/song-file.md §9-2
"""
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import check_fields as cf  # noqa: E402
import test_check_fields as t  # noqa: E402

OUT = HERE.parents[3] / "app" / "src" / "domain" / "__tests__" / "fixtures" / "check-fields-cases.json"


def run_case(c, fields, fk, vocabs, profiles, tmp):
    path = Path(tmp) / "case.json"
    text = c["raw"] if c["raw"] is not None else json.dumps(c["obj"], ensure_ascii=False, indent=1)
    path.write_text(text, encoding="utf-8")
    report = cf.Report()
    cf.check_saved_file(str(path), fields, fk, vocabs, profiles, report)
    return text, report


def build():
    if not t.HAS_SCHEMA:
        sys.exit("jsonschema 4.18 以降が必要（F1 を含む正解データを作るため）")
    fields = cf.load_json(cf.FIELDS_FILE)
    defs = cf.Report()
    vocabs = cf.load_vocabularies(defs)
    fk = cf.check_definitions(fields, vocabs, defs)
    entries = cf.load_tool_profiles(defs)
    cf.check_tool_profiles(entries, fields, fk, defs)
    if defs.errors:
        sys.exit("項目定義・ツールプロファイルにエラーがある: %s" % defs.errors)
    profiles = cf.index_profiles(entries)
    cases = []
    with tempfile.TemporaryDirectory() as tmp:
        for c in t.CASES:
            if c["mutate"] is not None:
                continue
            text, r = run_case(c, fields, fk, vocabs, profiles, tmp)
            cases.append({
                "name": c["name"],
                "input": text,
                "errors": r.errors,
                "warnings": r.warnings,
                "notes": r.notes,
                "expect": {"has": c["has"], "lacks": c["lacks"], "counts": c["counts"], "once": c["once"]},
            })
    return {
        "note": "生成物（design/v0/tools/check-fields/export_parity_cases.py）。手で編集しない",
        "count": len(cases),
        "cases": cases,
    }


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    data = build()
    text = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else None
        if current != text:
            print("最新でない: %s（再実行して書き出す）" % OUT)
            return 2
        print("最新: %s（%d ケース）" % (OUT, data["count"]))
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print("書き出し: %s（%d ケース）" % (OUT, data["count"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
