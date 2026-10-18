# -*- coding: utf-8 -*-
"""6モデルの検証ログ（チャットAIの回答）を機械測定する（教訓4-40）。

使い方（design/v0/ で実行）:
    python tools/measure-logs/measure_logs.py LOG_DIR [--exclude-term WORD ...] [--target 900]

LOG_DIR の *.md（1ファイル＝1モデルの回答）について、「基本プロンプト」「詳細プロンプト」「スタイルを除外」の
見出し（## / ### / **…**）の直後のコードブロックを欄として取り出し、次を測る。案の番号は、基本プロンプトの出現順。
  1. スタイル欄（基本・詳細）と除外欄に含まれる日本語（ひらがな・カタカナ・漢字）。ヒットは文脈つきで出す
  2. 詳細プロンプト・除外欄の文字数（前後の空白を除いた文字数と、改行を除いた文字数）。--target を超えたものに印
  3. スタイル欄（基本・詳細）の否定の形（no・without・rather than〔語境界つき〕、-free・non-）。wordless は対象外
  4. 「自由記述」という語の出現位置（どの欄のコードブロックか、コードブロックの外か）
  5. 除外欄に --exclude-term の各語が含まれるか（大文字小文字を区別しない。部分一致）
標準ライブラリだけで動く。結果は Markdown で標準出力に書く。
"""
import argparse
import re
import sys
from pathlib import Path

LABELS = {"基本プロンプト": "basic", "詳細プロンプト": "detailed", "スタイルを除外": "exclude"}
LABEL_RE = re.compile(r"^(?:#{1,6}\s*|\*\*)\s*(基本プロンプト|詳細プロンプト|スタイルを除外)\s*(?:\*\*)?\s*[:：]?\s*$")
JA_RE = re.compile(r"[぀-ゟ゠-ヿ一-鿿々ｦ-ﾟ]")
NEG_RES = [
    ("no", re.compile(r"\bno\b", re.I)),
    ("without", re.compile(r"\bwithout\b", re.I)),
    ("rather than", re.compile(r"\brather\s+than\b", re.I)),
    ("-free", re.compile(r"\w-free\b", re.I)),
    ("non-", re.compile(r"\bnon-\w", re.I)),
]


def parse(text):
    """[(案, 欄, 開始行, 中身)] と、コードブロックの範囲 [(開始行, 終了行, 欄 or None)] を返す。"""
    lines = text.splitlines()
    blocks, ranges = [], []
    pending, case, i = None, 0, 0
    while i < len(lines):
        m = LABEL_RE.match(lines[i].strip())
        if m:
            pending = LABELS[m.group(1)]
            if pending == "basic":
                case += 1
        if lines[i].strip().startswith("```"):
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith("```"):
                j += 1
            body = "\n".join(lines[i + 1:j])
            ranges.append((i + 1, j + 1, pending))
            if pending:
                blocks.append((case, pending, i + 1, body))
            pending = None
            i = j + 1
            continue
        i += 1
    return blocks, ranges


CASE_RE = re.compile(r"^(?:#{1,6}\s*)?(?:\*\*)?案\s*(\d+)\s*/\s*\d+")


def parse_positional(text):
    """欄の見出しがない回答（古い Namazu の形）: 「案 N / M」の行の後のコードブロックを、順に 基本・詳細・除外 とみなす。"""
    lines = text.splitlines()
    blocks, ranges = [], []
    case, k, i = 0, 0, 0
    order = ["basic", "detailed", "exclude"]
    while i < len(lines):
        m = CASE_RE.match(lines[i].strip())
        if m:
            case, k = int(m.group(1)), 0
        if lines[i].strip().startswith("```"):
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith("```"):
                j += 1
            kind = order[k] if case and k < len(order) else None
            ranges.append((i + 1, j + 1, kind))
            if kind:
                blocks.append((case, kind, i + 1, "\n".join(lines[i + 1:j])))
            k += 1
            i = j + 1
            continue
        i += 1
    return blocks, ranges


def parse_any(text):
    """見出しで取り出す。見出しが1つも取れないときだけ、並び順で取り出す。戻り値の3つめは方法（label / position / ambiguous）。
    並び順は、どの案もコードブロックがちょうど3つ（基本・詳細・除外）のときだけ使う。2つの案（除外がない、
    または基本をインラインで書いた）は、どれが詳細か決められないため、取り出さない（ambiguous）。"""
    blocks, ranges = parse(text)
    if blocks:
        return blocks, ranges, "label"
    blocks, ranges = parse_positional(text)
    counts = {}
    for b in blocks:
        counts[b[0]] = counts.get(b[0], 0) + 1
    if not counts or any(n != 3 for n in counts.values()):
        return [], ranges, "ambiguous"
    return blocks, ranges, "position"


def context(s, pos, width=12):
    return s[max(0, pos - width):pos + width + 1].replace("\n", " ")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("log_dir")
    ap.add_argument("--exclude-term", action="append", default=[])
    ap.add_argument("--target", type=int, default=900)
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    files = sorted(Path(args.log_dir).glob("*.md"))
    out = []
    p = out.append

    p("## 欄の取り出し\n\n| モデル | 案の数 | 基本 | 詳細 | 除外 |\n|---|---|---|---|---|")
    parsed = {}
    for f in files:
        text = f.read_text(encoding="utf-8")
        blocks, ranges, method = parse_any(text)
        parsed[f.stem] = (text, blocks, ranges)
        if method == "position":
            p("| %s（並び順で判定） | | | | |" % f.stem)
        n = lambda k: sum(1 for b in blocks if b[1] == k)
        p("| %s | %d | %d | %d | %d |" % (f.stem, max([b[0] for b in blocks] or [0]), n("basic"), n("detailed"), n("exclude")))

    p("\n## 1. 日本語の混入（スタイル欄・除外欄のコードブロック）\n\n| モデル | 案 | 欄 | 行 | 件数 | 文脈（最初の3件） |\n|---|---|---|---|---|---|")
    hits = 0
    for stem, (_, blocks, _) in parsed.items():
        for case, kind, line, body in blocks:
            ms = list(JA_RE.finditer(body))
            if ms:
                hits += 1
                p("| %s | %d | %s | %d | %d | %s |" % (stem, case, kind, line, len(ms), " / ".join("「%s」" % context(body, m.start()) for m in ms[:3])))
    if not hits:
        p("| （なし） | | | | | |")

    p("\n## 2. 文字数（詳細プロンプト・除外欄）\n\n前後の空白を除いた文字数（改行を含む）／改行を除いた文字数。★は %d を超えるもの。\n\n| モデル | 案 | 欄 | 行 | 文字数 | 改行を除く |\n|---|---|---|---|---|---|" % args.target)
    for stem, (_, blocks, _) in parsed.items():
        for case, kind, line, body in blocks:
            if kind == "basic":
                continue
            s = body.strip()
            n1, n2 = len(s), len(s.replace("\n", ""))
            p("| %s | %d | %s | %d | %d%s | %d |" % (stem, case, kind, line, n1, " ★" if n1 > args.target else "", n2))

    p("\n## 3. 否定の形（スタイル欄の基本・詳細）\n\n| モデル | 案 | 欄 | 形 | 文脈 |\n|---|---|---|---|---|")
    hits = 0
    for stem, (_, blocks, _) in parsed.items():
        for case, kind, line, body in blocks:
            if kind == "exclude":
                continue
            for name, rx in NEG_RES:
                for m in rx.finditer(body):
                    hits += 1
                    p("| %s | %d | %s | %s | 「%s」 |" % (stem, case, kind, name, context(body, m.start(), 20)))
    if not hits:
        p("| （なし） | | | | |")

    p("\n## 4. 「自由記述」の出現位置\n\n| モデル | 行 | 位置 | 行の内容（先頭80字） |\n|---|---|---|---|")
    hits = 0
    for stem, (text, _, ranges) in parsed.items():
        for no, ln in enumerate(text.splitlines(), 1):
            if "自由記述" in ln:
                hits += 1
                where = next(("コードブロック（%s）" % (k or "欄以外") for a, b, k in ranges if a < no < b), "コードブロックの外")
                p("| %s | %d | %s | %s |" % (stem, no, where, ln.strip()[:80].replace("|", "\\|")))
    if not hits:
        p("| （なし） | | | |")

    if args.exclude_term:
        p("\n## 5. 除外欄の語（大文字小文字を区別しない部分一致）\n\n| モデル | 案 | %s |\n|---|---|%s" % (" | ".join(args.exclude_term), "---|" * len(args.exclude_term)))
        for stem, (_, blocks, _) in parsed.items():
            for case, kind, line, body in blocks:
                if kind == "exclude":
                    p("| %s | %d | %s |" % (stem, case, " | ".join("○" if t.lower() in body.lower() else "**×**" for t in args.exclude_term)))
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
