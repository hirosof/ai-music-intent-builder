# -*- coding: utf-8 -*-
"""検証ログの、スタイル欄の詳細プロンプトの文字数を、例をまたいで集計する（宿題50）。

使い方（design/v0/ で実行）:
    python tools/measure-logs/length_summary.py EXAMPLE_DIR ... [--target 900] [--limit 1000]

EXAMPLE_DIR は validations/prompt-test/results/ の下の例のフォルダ。各フォルダの *.md（下の階層を含む）を、
1ファイル＝1つの回答として、measure_logs.py と同じ規則で詳細プロンプトのコードブロックを取り出す。
モデル名は、例のフォルダの直下がファイルならその名前、フォルダならそのフォルダ名（rendered-06 の形）。
original_chat_result.md（分割した回答と同じ内容のチャット全文）と、*_attachment_* は数えない。
文字数は、コードブロックの中身の前後の空白を除いた文字数（measure_logs.py の「文字数」と同じ）。
"""
import argparse
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import measure_logs  # noqa: E402

SKIP_NAMES = {"original_chat_result.md"}


def family(model):
    """モデル名を系統にまとめる（版の違いを畳む）。"""
    for key in ("chatgpt", "gemini", "opus", "sonnet", "haiku", "namazu"):
        if key in model:
            return key
    return model


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dirs", nargs="+")
    ap.add_argument("--target", type=int, default=900)
    ap.add_argument("--limit", type=int, default=1000)
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    rows = []  # (例, モデル, ファイル, 案, 文字数)
    missing = []  # (例, ファイル, 理由)
    positional = []  # 欄の見出しがなく、並び順で取り出したもの (例, ファイル)
    for d in map(Path, args.dirs):
        for f in sorted(d.rglob("*.md")):
            rel = f.relative_to(d)
            if f.name in SKIP_NAMES or "_attachment_" in f.name or "prompt_for_chat_ai" in rel.parts:
                continue
            model = rel.parts[1] if rel.parts[0] == "results" and len(rel.parts) > 2 else f.stem
            blocks, _, method = measure_logs.parse_any(f.read_text(encoding="utf-8"))
            if method == "position" and blocks:
                positional.append((d.name, str(rel)))
            detailed = [b for b in blocks if b[1] == "detailed"]
            if method == "ambiguous":
                missing.append((d.name, str(rel), "欄の見出しがなく、案ごとのコードブロックが3つでないため、どれが詳細か決められない"))
            elif not detailed:
                missing.append((d.name, str(rel), "詳細プロンプトのコードブロックを取り出せない（%d 欄を取り出した）" % len(blocks)))
            for case, _, _, body in detailed:
                rows.append((d.name, model, str(rel), case, len(body.strip())))

    out = []
    p = out.append

    def table(title, key):
        agg = defaultdict(list)
        for r in rows:
            agg[key(r)].append(r[4])
        p("\n## %s\n\n| %s | 案の数 | 目標（%d）超過 | 率 | 上限（%d）超過 | 率 | 最大 | 上限を超えた分の最大 |\n|---|---|---|---|---|---|---|---|"
          % (title, "モデル", args.target, args.limit))
        for k in sorted(agg):
            v = agg[k]
            over_t = sum(1 for x in v if x > args.target)
            over_l = sum(1 for x in v if x > args.limit)
            p("| %s | %d | %d | %.1f%% | %d | %.1f%% | %d | %s |" % (
                k, len(v), over_t, 100 * over_t / len(v), over_l, 100 * over_l / len(v), max(v),
                ("+%d" % (max(v) - args.limit)) if over_l else "—"))
        v = [r[4] for r in rows]
        if v:
            over_t = sum(1 for x in v if x > args.target)
            over_l = sum(1 for x in v if x > args.limit)
            p("| **計** | %d | %d | %.1f%% | %d | %.1f%% | %d | %s |" % (
                len(v), over_t, 100 * over_t / len(v), over_l, 100 * over_l / len(v), max(v),
                ("+%d" % (max(v) - args.limit)) if over_l else "—"))

    p("# 詳細プロンプトの文字数（%d 例・%d 案）" % (len(args.dirs), len(rows)))
    table("モデルの系統ごと", lambda r: family(r[1]))
    table("モデル（版）ごと", lambda r: r[1])

    p("\n## 目標（%d）を超えた案\n\n| 例 | モデル | ファイル | 案 | 文字数 |\n|---|---|---|---|---|" % args.target)
    for r in sorted((r for r in rows if r[4] > args.target), key=lambda r: -r[4]):
        p("| %s | %s | %s | %d | %d%s |" % (r[0], r[1], r[2], r[3], r[4], " ★上限超過" if r[4] > args.limit else ""))

    p("\n## 例ごとの案の数\n\n| 例 | 案の数 | ファイル数 |\n|---|---|---|")
    for d in args.dirs:
        name = Path(d).name
        p("| %s | %d | %d |" % (name, sum(1 for r in rows if r[0] == name), len({r[2] for r in rows if r[0] == name})))

    p("\n## 並び順で取り出したもの（欄の見出しがない回答。「案 N / M」の後のコードブロックを、基本・詳細・除外の順とみなした）\n\n| 例 | ファイル |\n|---|---|")
    for x in positional:
        p("| %s | %s |" % x)
    if not positional:
        p("| （なし） | |")

    p("\n## 取り出せなかったもの\n\n| 例 | ファイル | 理由 |\n|---|---|---|")
    for m in missing:
        p("| %s | %s | %s |" % m)
    if not missing:
        p("| （なし） | | |")
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
