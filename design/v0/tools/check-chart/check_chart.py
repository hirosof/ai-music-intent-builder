# -*- coding: utf-8 -*-
"""続けて頼む文「案の比較図」（B-FC。request-text.md §2、文面の判断ポイント51）の検証を助ける（宿題63）。

使い方（design/v0/ で実行）:
    python tools/check-chart/check_chart.py emit --axis mood --n 3
        B-FC の文を、request-text.md の節（コードブロックと {{fc.axes}} の表）から組み立てて標準出力に書く。
        --axis は diffAxis（auto・mood・arrangement・texture・interpretation）、--n は案の数（2以上）
    python tools/check-chart/check_chart.py check PATH ... --n 3 [--axis mood] [--mmdc CMD]
        チャットAI の回答（PATH はファイル、またはフォルダ〔中の *.md を1ファイル＝1モデルとして見る〕）から
        mermaid のコードブロックを取り出し、次を見る。結果は Markdown で標準出力に書く。
          1. mermaid のコードブロックがちょうど1つで、quadrantChart の図であること
          2. 点の数が --n と合い、点の名前が「案1」〜「案N」で始まり、各案がちょうど1回ずつ出ること
          3. B-FC の書き方の決まり: 座標が0以上1以下、最大値を「1.0」「1.00」と書かない、1行に1点、
             点の名前・軸の両端の名前が二重引用符で囲まれ、名前の中に二重引用符がないこと
          4. --axis mood のとき、軸が x-axis "暗い" --> "明るい"、y-axis "弱い" --> "強い" であること
             （ほかの差の付け方では、軸の両端の名前が2つずつ書かれていることだけを見る）
          5. mmdc で描けること（--mmdc で命令を渡す。省略時は PATH の mmdc。見つからなければ「未確認」）
        終了コード: 1〜4 か 5 に誤りがあれば 1、なければ 0（5 が未確認でも 0。報告に未確認と書く）
標準ライブラリだけで動く。mmdc（@mermaid-js/mermaid-cli）は別に用意する。決まりの根拠は Mermaid 11.16.0 での確認。
"""
import argparse
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REQUEST_TEXT = HERE.parent.parent / "docs" / "decisions" / "request-text.md"
SECTION = "\n### 続けて頼む文: 案の比較図"
MOOD_AXES = {"x": ("暗い", "明るい"), "y": ("弱い", "強い")}

FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})\s*([\w-]*)\s*$")
POINT_RE = re.compile(r"^(?P<name>.+?)\s*:\s*\[(?P<x>[^,\]]*),(?P<y>[^\]]*)\](?P<rest>.*)$")
AXIS_RE = re.compile(r"^(?P<axis>[xy])-axis\s+(?P<body>.*)$")
NUM_RE = re.compile(r"^-?\d+(?:\.\d+)?$")
KEYWORDS = ("title", "quadrant-1", "quadrant-2", "quadrant-3", "quadrant-4", "classDef", "%%")


# ---------------------------------------------------------------------------
# emit: B-FC の文
# ---------------------------------------------------------------------------
def fc_spec(path=REQUEST_TEXT):
    """request-text.md の B-FC の節から、(文のひな形, {diffAxis: {{fc.axes}}}) を返す。"""
    text = Path(path).read_text(encoding="utf-8").replace("\r\n", "\n")
    start = text.find(SECTION)
    if start < 0:
        raise ValueError("B-FC の節がない")
    end = text.find("\n---\n", start)
    section = text[start:end if end >= 0 else None]
    open_ = section.find("\n```\n")
    close = section.find("\n```\n", open_ + 5)
    if open_ < 0 or close < 0:
        raise ValueError("B-FC のコードブロックがない")
    axes = {}
    for line in section.split("\n"):
        m = re.match(r"^\| (`.+?) \| (.+) \|$", line)
        if m:
            for axis_id in re.findall(r"`([a-z]+)`", m.group(1)):
                axes[axis_id] = m.group(2)
    return section[open_ + 5:close] + "\n", axes


def emit(axis, n, path=REQUEST_TEXT):
    template, axes = fc_spec(path)
    if axis not in axes:
        raise ValueError("diffAxis が表にない: %s（%s）" % (axis, "・".join(sorted(axes))))
    if n < 2:
        raise ValueError("案の数は2以上（B-FC の出す条件）")
    return template.replace("{{fc.n}}", str(n)).replace("{{fc.axes}}", axes[axis])


# ---------------------------------------------------------------------------
# check: 回答の中の図
# ---------------------------------------------------------------------------
def mermaid_blocks(text):
    """mermaid のコードブロックの中身のリスト（言語名が mermaid のもの）。"""
    blocks, lines, i = [], text.splitlines(), 0
    while i < len(lines):
        m = FENCE_RE.match(lines[i])
        if not m:
            i += 1
            continue
        fence, lang = m.group(1), m.group(2).lower()
        j = i + 1
        while j < len(lines) and not lines[j].strip().startswith(fence[0] * len(fence)):
            j += 1
        if lang == "mermaid":
            blocks.append("\n".join(lines[i + 1:j]))
        i = j + 1
    return blocks


def unquote(name):
    """(引用符を外した名前, 全体が二重引用符で囲まれていたか)"""
    s = name.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1], True
    return s, False


def parse_axis(body):
    """'"暗い" --> "明るい"' から [(名前, 囲みあり)]（1つか2つ）"""
    return [unquote(part) for part in body.split("-->")]


def check_chart(block, n, axis=None):
    """1つの図の誤りのリストと、点・軸の情報を返す。"""
    errors = []
    lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
    if not lines or lines[0] != "quadrantChart":
        errors.append("1行目が quadrantChart でない: %r" % (lines[0] if lines else ""))
    points, axes = [], {}
    for ln in lines[1:]:
        am = AXIS_RE.match(ln)
        if am:
            axes[am.group("axis")] = parse_axis(am.group("body"))
            continue
        if ln.startswith(KEYWORDS):
            continue
        pm = POINT_RE.match(ln)
        if not pm:
            errors.append("読めない行: %s" % ln)
            continue
        if ":" in pm.group("rest") and "[" in pm.group("rest"):
            errors.append("1行に2点以上: %s" % ln)
        name, quoted = unquote(pm.group("name"))
        if not quoted:
            errors.append("点の名前が二重引用符で囲まれていない: %s" % ln)
        if '"' in name:
            errors.append("点の名前の中に二重引用符: %s" % ln)
        for raw in (pm.group("x").strip(), pm.group("y").strip()):
            if not NUM_RE.match(raw):
                errors.append("座標が数値でない: %s" % ln)
            elif not 0 <= float(raw) <= 1:
                errors.append("座標が0〜1の外: %s" % ln)
            elif re.match(r"^1\.0+$", raw):
                errors.append("最大値を「%s」と書いている（「1」と書く）: %s" % (raw, ln))
        points.append(name)
    if len(points) != n:
        errors.append("点の数が %d（案の数は %d）" % (len(points), n))
    seen = {}
    for name in points:
        m = re.match(r"^案(\d+)(?:\s|$)", name)
        if not m:
            errors.append("点の名前が「案N」で始まらない: %s" % name)
            continue
        seen[int(m.group(1))] = seen.get(int(m.group(1)), 0) + 1
    missing = [k for k in range(1, n + 1) if k not in seen]
    if missing:
        errors.append("点のない案: %s" % "・".join("案%d" % k for k in missing))
    extra = sorted(k for k, c in seen.items() if k > n or c > 1)
    if extra:
        errors.append("案の番号が範囲外か重複: %s" % "・".join("案%d" % k for k in extra))
    for key in ("x", "y"):
        ends = axes.get(key)
        if ends is None:
            errors.append("%s-axis がない" % key)
            continue
        if len(ends) != 2:
            errors.append("%s-axis の両端の名前が2つでない" % key)
        for name, quoted in ends:
            if not quoted:
                errors.append("%s-axis の名前が二重引用符で囲まれていない: %s" % (key, name))
            if '"' in name:
                errors.append("%s-axis の名前の中に二重引用符: %s" % (key, name))
        if axis == "mood" and len(ends) == 2 and tuple(e[0] for e in ends) != MOOD_AXES[key]:
            errors.append("%s-axis が指定と違う: %s（指定は %s --> %s）" % (
                key, " --> ".join(e[0] for e in ends), *MOOD_AXES[key]))
    info = {"points": points, "axes": {k: [e[0] for e in v] for k, v in axes.items()}}
    return errors, info


def mmdc_command(arg):
    """mmdc の命令（リスト）。見つからなければ None"""
    # POSIX の分け方（引用符を外す）。Windows のパスは「/」で書く
    parts = shlex.split(arg) if arg else ["mmdc"]
    exe = shutil.which(parts[0])
    return [exe] + parts[1:] if exe else None


def render(block, cmd):
    """mmdc で SVG に描く。(描けたか, 失敗の内容)"""
    with tempfile.TemporaryDirectory() as d:
        src, out = Path(d) / "chart.mmd", Path(d) / "chart.svg"
        src.write_text(block + "\n", encoding="utf-8")
        r = subprocess.run(cmd + ["-i", str(src), "-o", str(out), "-q"], capture_output=True,
                           stdin=subprocess.DEVNULL, encoding="utf-8", errors="replace")
        ok = r.returncode == 0 and out.is_file()
        return ok, "" if ok else (r.stderr or r.stdout).strip().splitlines()[-1:] or ["（出力なし）"]


def targets(paths):
    out = []
    for p in map(Path, paths):
        out.extend(sorted(p.glob("*.md")) if p.is_dir() else [p])
    return out


def check(paths, n, axis=None, mmdc=None, out=sys.stdout):
    cmd = mmdc_command(mmdc)
    failed = False
    out.write("# 案の比較図の検査（案の数 %d%s）\n\n" % (n, "、差の付け方 %s" % axis if axis else ""))
    out.write("描画: %s\n\n" % (" ".join(cmd) if cmd else "未確認（mmdc が見つからない。--mmdc で渡す）"))
    out.write("| ファイル | 図 | 点 | 軸 | 決まり | 描画 |\n|---|---|---|---|---|---|\n")
    details = []
    for path in targets(paths):
        blocks = mermaid_blocks(path.read_text(encoding="utf-8"))
        if len(blocks) != 1:
            failed = True
            out.write("| %s | %d 個 | — | — | 誤り（mermaid のコードブロックが %d 個） | — |\n" % (path.name, len(blocks), len(blocks)))
            continue
        errors, info = check_chart(blocks[0], n, axis)
        drawn = "未確認"
        if cmd:
            ok, why = render(blocks[0], cmd)
            drawn = "描けた" if ok else "描けない"
            if not ok:
                errors.append("mmdc で描けない: %s" % " ".join(why))
        failed = failed or bool(errors)
        axes = "／".join("%s: %s" % (k, " --> ".join(v)) for k, v in sorted(info["axes"].items()))
        out.write("| %s | 1 個 | %d | %s | %s | %s |\n" % (
            path.name, len(info["points"]), axes or "—", "誤り %d 件" % len(errors) if errors else "OK", drawn))
        if errors:
            details.append((path.name, errors))
    for name, errors in details:
        out.write("\n## %s\n\n" % name)
        for e in errors:
            out.write("- %s\n" % e)
    return 1 if failed else 0


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="案の比較図（B-FC）の文の生成と、回答の図の検査")
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("emit", help="B-FC の文を出す")
    e.add_argument("--axis", required=True)
    e.add_argument("--n", type=int, required=True)
    c = sub.add_parser("check", help="回答の図を検査する")
    c.add_argument("paths", nargs="+")
    c.add_argument("--n", type=int, required=True)
    c.add_argument("--axis")
    c.add_argument("--mmdc", help='mmdc の命令（例: "npx -y -p @mermaid-js/mermaid-cli@11.16.0 mmdc"）')
    a = ap.parse_args(argv)
    if a.cmd == "emit":
        sys.stdout.write(emit(a.axis, a.n))
        return 0
    return check(a.paths, a.n, a.axis, a.mmdc)


if __name__ == "__main__":
    sys.exit(main())
