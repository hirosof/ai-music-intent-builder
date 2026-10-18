#!/usr/bin/env python3
"""
Suno 生成曲の2グループ比較（H-09: Japanese traditional と Japanese style）

利用者の PC 内で完結する。音声ファイルを外部へ送信しない。
モデルを使う場合（--models）は、初回のみ Hugging Face から重みをダウンロードする
（送信されるのはダウンロード要求だけで、音声は送信しない）。

使い方:
    python compare_styles.py <音声フォルダ> --out <出力フォルダ> [--models ast,clap]

ファイル名の先頭でグループを判定する: a1_xxx.mp3 → A、b3_xxx.mp3 → B
（--pattern で変更可）。

指標と判定規則は、結果を見る前に固定したもの
（docs/examples/suno-test-02-jp-traditional-vs-style.md §7）。変更する場合は、
結果を見る前にドキュメント側を先に直すこと。
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import numpy as np

SCRIPT_VERSION = "1.0.0"

AUDIO_EXTS = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}

# ---------------------------------------------------------------------------
# 判定に使う主指標（事前に固定）
#   expect: "A" は A のほうが大きいと予想、"B" は B のほうが大きいと予想
# ---------------------------------------------------------------------------
PRIMARY = [
    # key,                  label,                                   expect, group
    ("pulse_clarity",      "D1 ビートの明瞭さ",                       "B", "dsp"),
    ("perc_ratio",         "D2 打楽器成分の比率",                     "B", "dsp"),
    ("polyphony_index",    "D3 同時に鳴る音高の数（和音の厚さ）",     "B", "dsp"),
    ("scale_index",        "D4 日本の音階への当てはまり − 七音音階",  "A", "dsp"),
    ("ast_index",          "M1 AST: 伝統寄りラベル − 現代寄りラベル", "A", "ast"),
    ("clap_index",         "M2 CLAP: 伝統寄りの文 − 現代寄りの文",    "A", "clap"),
]

# 参考指標（判定には使わない）
SECONDARY = [
    ("tempo_bpm",          "推定テンポ (BPM)"),
    ("ioi_cv",             "拍間隔のばらつき（大きいほど拍が揺れる）"),
    ("low_perc_ratio",     "低域(<150Hz)の打楽器成分の比率"),
    ("onset_rate",         "発音の頻度 (回/秒)"),
    ("quiet_ratio",        "静かな区間の比率（-40dB 未満）"),
    ("chord_change",       "1秒ごとの和声の変化量"),
    ("fit_diatonic",       "七音音階への当てはまり"),
    ("fit_anhemitonic",    "半音を含まない五音音階（民謡・律・ヨナ抜き）への当てはまり"),
    ("fit_miyakobushi",    "半音を含む五音音階（都節）への当てはまり"),
]

# AST（AudioSet 527 ラベル）で集計するラベル。存在しない名前は警告して無視する
AST_TRAD = ["Music of Asia", "Traditional music", "Flute", "Zither"]
AST_MODERN = ["Synthesizer", "Piano", "Drum kit", "Drum machine", "Electronic music"]
AST_REPORT = AST_TRAD + AST_MODERN + [
    "Harp", "Guitar", "Acoustic guitar", "Bowed string instrument", "Orchestra",
    "Percussion", "Drum", "New-age music", "Ambient music", "Theremin",
]

# CLAP のゼロショットの文。trad と modern の平均類似度の差を指標にする
CLAP_TRAD = [
    "traditional Japanese music played on shakuhachi and koto",
    "Japanese classical court music, gagaku",
    "solo shakuhachi bamboo flute with a breathy tone",
    "plucked koto zither melody",
    "shamisen music",
]
CLAP_MODERN = [
    "modern Japanese-style background music with piano and strings",
    "music with warm synthesizer pads",
    "music with a steady drum kit beat",
    "electronic music",
    "cinematic orchestral music",
]
CLAP_INSTRUMENTS = [
    "shakuhachi", "shinobue flute", "koto", "shamisen", "taiko drums",
    "piano", "acoustic guitar", "harp", "string ensemble", "synthesizer", "drum kit",
]

AST_MODEL_ID = "MIT/ast-finetuned-audioset-10-10-0.4593"
CLAP_MODEL_ID = "laion/larger_clap_music"


@dataclass
class Track:
    path: Path
    group: str
    take: str
    metrics: dict = field(default_factory=dict)
    ast_scores: dict = field(default_factory=dict)
    clap_scores: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# 信号解析（librosa）
# ---------------------------------------------------------------------------
SR = 22050
HOP = 512

SCALE_TEMPLATES = {
    "fit_diatonic": [0, 2, 4, 5, 7, 9, 11],
    "fit_anhemitonic": [0, 2, 4, 7, 9],     # 回転で 民謡音階・律音階・ヨナ抜き長音階を含む
    "fit_miyakobushi": [0, 1, 5, 7, 8],     # 都節音階（陰旋法）
}


def _best_rotation_fit(pc_hist: np.ndarray, degrees: list[int]) -> float:
    """12 通りの移調のうち、音高クラスのヒストグラムとテンプレートのコサイン類似度が最大のもの"""
    tmpl = np.zeros(12)
    tmpl[degrees] = 1.0
    h = pc_hist / (np.linalg.norm(pc_hist) + 1e-12)
    best = -1.0
    for r in range(12):
        t = np.roll(tmpl, r)
        best = max(best, float(np.dot(h, t / np.linalg.norm(t))))
    return best


def dsp_metrics(path: Path) -> dict:
    import librosa

    y, sr = librosa.load(str(path), sr=SR, mono=True)
    if y.size < sr * 5:
        raise ValueError("音声が5秒未満")

    m: dict[str, float] = {}
    m["duration_sec"] = y.size / sr

    # 調波成分と打楽器成分
    y_h, y_p = librosa.effects.hpss(y)
    e_h = float(np.sum(y_h ** 2))
    e_p = float(np.sum(y_p ** 2))
    m["perc_ratio"] = e_p / (e_h + e_p + 1e-12)

    S_p = np.abs(librosa.stft(y_p, hop_length=HOP)) ** 2
    S_all = np.abs(librosa.stft(y, hop_length=HOP)) ** 2
    freqs = librosa.fft_frequencies(sr=sr)
    low = freqs < 150
    m["low_perc_ratio"] = float(S_p[low].sum() / (S_all.sum() + 1e-12))

    # ビートの明瞭さ: 局所自己相関テンポグラムの、40〜200 BPM の範囲での最大値の時間平均
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    tg = librosa.feature.tempogram(onset_envelope=oenv, sr=sr, hop_length=HOP, win_length=384)
    bpms = librosa.tempo_frequencies(tg.shape[0], sr=sr, hop_length=HOP)
    valid = (bpms >= 40) & (bpms <= 200)
    frame_strength = tg[valid].max(axis=0)
    n_f = min(frame_strength.size, oenv.size)
    active = librosa.util.normalize(oenv[:n_f]) > 0.05
    m["pulse_clarity"] = float(np.mean(frame_strength[:n_f][active])) if np.any(active) else 0.0

    tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=HOP)
    m["tempo_bpm"] = float(np.atleast_1d(tempo)[0])
    bt = librosa.frames_to_time(beats, sr=sr, hop_length=HOP)
    if bt.size >= 8:
        ioi = np.diff(bt)
        m["ioi_cv"] = float(np.std(ioi) / (np.mean(ioi) + 1e-12))
    else:
        m["ioi_cv"] = float("nan")

    onsets = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=HOP)
    m["onset_rate"] = onsets.size / m["duration_sec"]

    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    db = librosa.amplitude_to_db(rms, ref=np.max(rms) + 1e-12)
    m["quiet_ratio"] = float(np.mean(db < -40))

    # 和声: 調波成分のクロマ
    chroma = librosa.feature.chroma_cqt(y=y_h, sr=sr, hop_length=HOP)
    rms_h = librosa.feature.rms(y=y_h, hop_length=HOP)[0]
    n = min(chroma.shape[1], rms_h.size)
    chroma, rms_h = chroma[:, :n], rms_h[:n]
    loud = rms_h > (0.1 * np.max(rms_h))
    if np.any(loud):
        c = chroma[:, loud]
        cmax = c.max(axis=0, keepdims=True) + 1e-12
        m["polyphony_index"] = float(np.mean(np.sum(c >= 0.5 * cmax, axis=0)))
        pc_hist = (c * rms_h[loud]).sum(axis=1)
    else:
        m["polyphony_index"] = float("nan")
        pc_hist = chroma.sum(axis=1)

    frames_per_sec = int(round(sr / HOP))
    blocks = [chroma[:, i:i + frames_per_sec].mean(axis=1) for i in range(0, n - frames_per_sec, frames_per_sec)]
    if len(blocks) >= 2:
        b = np.array(blocks)
        b = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-12)
        m["chord_change"] = float(np.mean(1.0 - np.sum(b[1:] * b[:-1], axis=1)))
    else:
        m["chord_change"] = float("nan")

    for key, deg in SCALE_TEMPLATES.items():
        m[key] = _best_rotation_fit(pc_hist, deg)
    m["scale_index"] = max(m["fit_anhemitonic"], m["fit_miyakobushi"]) - m["fit_diatonic"]
    return m


# ---------------------------------------------------------------------------
# モデル（任意）
# ---------------------------------------------------------------------------
def _windows(wave: np.ndarray, sr: int, sec: float = 10.0) -> list[np.ndarray]:
    size = int(sr * sec)
    out = [wave[i:i + size] for i in range(0, len(wave) - size + 1, size)]
    if not out:
        out = [np.pad(wave, (0, size - len(wave)))]
    return out


def _as_tensor(x):
    """transformers のバージョン差を吸収する（v4 はテンソル、v5 は pooler_output に射影・正規化済みの特徴）"""
    if hasattr(x, "pooler_output") and x.pooler_output is not None:
        return x.pooler_output
    return x


def run_ast(tracks: list[Track]) -> list[str]:
    import librosa
    import torch
    from transformers import ASTForAudioClassification, AutoFeatureExtractor

    warnings = []
    fe = AutoFeatureExtractor.from_pretrained(AST_MODEL_ID)
    model = ASTForAudioClassification.from_pretrained(AST_MODEL_ID).eval()
    name_to_id = {v: int(k) for k, v in model.config.id2label.items()}
    for name in AST_REPORT:
        if name not in name_to_id:
            warnings.append(f"AST: ラベル '{name}' がモデルにないため無視した")

    for t in tracks:
        y, _ = librosa.load(str(t.path), sr=16000, mono=True)
        probs = []
        with torch.no_grad():
            for w in _windows(y, 16000):
                inp = fe(w, sampling_rate=16000, return_tensors="pt")
                probs.append(torch.sigmoid(model(**inp).logits)[0].numpy())
        mean = np.mean(probs, axis=0)
        t.ast_scores = {name: float(mean[name_to_id[name]]) for name in AST_REPORT if name in name_to_id}
        top = np.argsort(mean)[::-1][:10]
        t.ast_scores["_top10"] = [(model.config.id2label[int(i)], float(mean[i])) for i in top]
        trad = [t.ast_scores[n] for n in AST_TRAD if n in t.ast_scores]
        modern = [t.ast_scores[n] for n in AST_MODERN if n in t.ast_scores]
        t.metrics["ast_index"] = float(np.mean(trad) - np.mean(modern)) if trad and modern else float("nan")
        print(f"  AST 完了: {t.path.name}")
    return warnings


def run_clap(tracks: list[Track]) -> list[str]:
    import librosa
    import torch
    from transformers import ClapModel, ClapProcessor

    torch.manual_seed(0)
    np.random.seed(0)  # ClapFeatureExtractor は numpy の乱数を使う
    proc = ClapProcessor.from_pretrained(CLAP_MODEL_ID)
    model = ClapModel.from_pretrained(CLAP_MODEL_ID).eval()
    texts = CLAP_TRAD + CLAP_MODERN + CLAP_INSTRUMENTS
    with torch.no_grad():
        tok = proc.tokenizer(texts, padding=True, return_tensors="pt")
        te = _as_tensor(model.get_text_features(**tok))
        te = te / te.norm(dim=-1, keepdim=True)

    for t in tracks:
        y, _ = librosa.load(str(t.path), sr=48000, mono=True)
        sims = []
        with torch.no_grad():
            for w in _windows(y, 48000):
                feats = proc.feature_extractor(w, sampling_rate=48000, return_tensors="pt")
                ae = _as_tensor(model.get_audio_features(**feats))
                ae = ae / ae.norm(dim=-1, keepdim=True)
                sims.append((ae @ te.T)[0].numpy())
        mean = np.mean(sims, axis=0)
        t.clap_scores = {text: float(s) for text, s in zip(texts, mean)}
        nt = len(CLAP_TRAD)
        t.metrics["clap_index"] = float(mean[:nt].mean() - mean[nt:nt + len(CLAP_MODERN)].mean())
        print(f"  CLAP 完了: {t.path.name}")
    return []


# ---------------------------------------------------------------------------
# 判定
# ---------------------------------------------------------------------------
def pair_wins(a: list[float], b: list[float], expect: str) -> tuple[float, int]:
    """予想どおりの向きの組の数と、有効な組の総数（同値は 0.5）"""
    a = [x for x in a if not math.isnan(x)]
    b = [x for x in b if not math.isnan(x)]
    wins = 0.0
    for x in a:
        for y in b:
            hi, lo = (x, y) if expect == "A" else (y, x)
            wins += 1.0 if hi > lo else (0.5 if hi == lo else 0.0)
    return wins, len(a) * len(b)


def judge(tracks: list[Track], used_groups: set[str]) -> dict:
    A = [t for t in tracks if t.group == "A"]
    B = [t for t in tracks if t.group == "B"]
    rows = []
    for key, label, expect, grp in PRIMARY:
        if grp not in used_groups:
            continue
        a = [t.metrics.get(key, float("nan")) for t in A]
        b = [t.metrics.get(key, float("nan")) for t in B]
        wins, total = pair_wins(a, b, expect)
        ratio = wins / total if total else float("nan")
        if total == 0:
            status = "欠測"
        elif ratio >= 15 / 16:
            status = "予想どおりに分離"
        elif ratio <= 1 / 16:
            status = "予想と逆に分離"
        elif ratio >= 13 / 16 or ratio <= 3 / 16:
            status = "傾向あり"
        else:
            status = "差なし"
        rows.append({"key": key, "label": label, "expect": expect, "wins": wins, "total": total,
                     "ratio": ratio, "status": status})

    n = len([r for r in rows if r["status"] != "欠測"])
    sep = sum(r["status"] == "予想どおりに分離" for r in rows)
    rev = sum(r["status"] == "予想と逆に分離" for r in rows)
    trend = sum(r["status"] in ("予想どおりに分離", "予想と逆に分離", "傾向あり") for r in rows)
    need = math.ceil(n * 2 / 3) if n else 0
    if n and sep >= need and rev == 0:
        verdict = "差あり"
    elif n and trend == 0:
        verdict = "差なし"
    else:
        verdict = "判定不能"
    return {"rows": rows, "n": n, "separated": sep, "reversed": rev, "need": need, "verdict": verdict,
            "n_a": len(A), "n_b": len(B)}


# ---------------------------------------------------------------------------
# 出力
# ---------------------------------------------------------------------------
def fmt(x) -> str:
    if isinstance(x, float):
        return "—" if math.isnan(x) else f"{x:.4f}"
    return str(x)


def write_outputs(tracks: list[Track], result: dict, out: Path, args, warnings: list[str]) -> None:
    out.mkdir(parents=True, exist_ok=True)
    keys = ["duration_sec"] + [k for k, *_ in PRIMARY] + [k for k, _ in SECONDARY]

    with open(out / "metrics.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["file", "group", "take"] + keys)
        for t in tracks:
            w.writerow([t.path.name, t.group, t.take] + [t.metrics.get(k, "") for k in keys])

    data = {
        "script_version": SCRIPT_VERSION,
        "created": datetime.now().isoformat(timespec="seconds"),
        "args": {"input": str(args.input), "models": args.models, "pattern": args.pattern},
        "judgement": result,
        "tracks": [{"file": t.path.name, "group": t.group, "take": t.take, "metrics": t.metrics,
                    "ast": t.ast_scores, "clap": t.clap_scores} for t in tracks],
        "warnings": warnings,
    }
    with open(out / "results.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=float)

    L = []
    L.append("# H-09 信号解析の結果\n")
    L.append(f"- 作成: {data['created']}（compare_styles.py {SCRIPT_VERSION}）")
    L.append(f"- 入力: `{args.input}`（A {result['n_a']}曲、B {result['n_b']}曲）")
    L.append(f"- モデル: {args.models or 'なし（信号解析のみ）'}\n")
    L.append(f"## 判定: **{result['verdict']}**\n")
    L.append(f"主指標 {result['n']} 個のうち、予想どおりに分離 {result['separated']} 個"
             f"（必要数 {result['need']}）、予想と逆に分離 {result['reversed']} 個。\n")
    L.append("| 主指標 | 予想 | 予想どおりの組 / 全組 | 状態 |")
    L.append("|---|---|---|---|")
    for r in result["rows"]:
        L.append(f"| {r['label']} | {r['expect']} が大きい | {r['wins']:g} / {r['total']} | {r['status']} |")
    L.append("\n判定規則: `docs/examples/suno-test-02-jp-traditional-vs-style.md` §7-3。\n")

    L.append("## 曲ごとの値\n")
    head = ["曲", "群"] + [k for k, *_ in PRIMARY if any(k in t.metrics for t in tracks)]
    L.append("| " + " | ".join(head) + " |")
    L.append("|" + "---|" * len(head))
    for t in tracks:
        L.append("| " + " | ".join([t.path.name, t.group] + [fmt(t.metrics.get(k, float("nan"))) for k in head[2:]]) + " |")

    L.append("\n### 参考指標（判定には使わない）\n")
    L.append("| 曲 | " + " | ".join(lbl for _, lbl in SECONDARY) + " |")
    L.append("|---|" + "---|" * len(SECONDARY))
    for t in tracks:
        L.append("| " + t.path.name + " | " + " | ".join(fmt(t.metrics.get(k, float("nan"))) for k, _ in SECONDARY) + " |")

    if any(t.ast_scores for t in tracks):
        names = [n for n in AST_REPORT if any(n in t.ast_scores for t in tracks)]
        L.append("\n## AST（AudioSet ラベルの確率。10秒窓の平均）\n")
        L.append("| 曲 | " + " | ".join(names) + " |")
        L.append("|---|" + "---|" * len(names))
        for t in tracks:
            L.append("| " + t.path.name + " | " + " | ".join(fmt(t.ast_scores.get(n, float("nan"))) for n in names) + " |")
        L.append("\n上位10ラベル:\n")
        for t in tracks:
            top = ", ".join(f"{n} {p:.3f}" for n, p in t.ast_scores.get("_top10", []))
            L.append(f"- {t.path.name}: {top}")

    if any(t.clap_scores for t in tracks):
        L.append("\n## CLAP（文との類似度。値の絶対値ではなく曲どうしの比較に使う）\n")
        texts = CLAP_TRAD + CLAP_MODERN + CLAP_INSTRUMENTS
        L.append("| 文 | " + " | ".join(t.path.name for t in tracks) + " |")
        L.append("|---|" + "---|" * len(tracks))
        for text in texts:
            L.append(f"| {text} | " + " | ".join(fmt(t.clap_scores.get(text, float("nan"))) for t in tracks) + " |")

    if warnings:
        L.append("\n## 警告\n")
        L.extend(f"- {w}" for w in warnings)

    (out / "report.md").write_text("\n".join(L) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")  # Windows のコンソールで表示できない文字があっても止めない
        except AttributeError:
            pass

    ap = argparse.ArgumentParser(description="Suno 生成曲の2グループ比較（H-09）")
    ap.add_argument("input", type=Path, help="音声ファイルのフォルダ")
    ap.add_argument("--out", type=Path, default=Path("h09_results"), help="出力フォルダ")
    ap.add_argument("--models", default="", help="使うモデル: ast, clap, ast,clap（省略時は信号解析のみ）")
    ap.add_argument("--pattern", default=r"^([abAB])(\d+)_", help="ファイル名からグループと番号を取る正規表現")
    args = ap.parse_args()

    if not args.input.is_dir():
        print(f"フォルダが見つからない: {args.input}", file=sys.stderr)
        return 2
    pat = re.compile(args.pattern)
    tracks = []
    for p in sorted(args.input.iterdir()):
        if p.suffix.lower() not in AUDIO_EXTS:
            continue
        mm = pat.search(p.name)
        if not mm:
            print(f"  スキップ（名前が規則に合わない）: {p.name}")
            continue
        tracks.append(Track(path=p, group=mm.group(1).upper(), take=mm.group(2)))
    if not any(t.group == "A" for t in tracks) or not any(t.group == "B" for t in tracks):
        print("A と B の両方のファイルが必要", file=sys.stderr)
        return 2

    models = {m.strip().lower() for m in args.models.split(",") if m.strip()}
    unknown = models - {"ast", "clap"}
    if unknown:
        print(f"不明なモデル: {', '.join(sorted(unknown))}", file=sys.stderr)
        return 2

    print(f"信号解析: {len(tracks)} 曲")
    for t in tracks:
        try:
            t.metrics.update(dsp_metrics(t.path))
            print(f"  完了: {t.path.name}")
        except Exception as e:  # noqa: BLE001
            print(f"  失敗: {t.path.name}: {e}", file=sys.stderr)
            return 1

    warnings: list[str] = []
    used = {"dsp"}
    if "ast" in models:
        print("AST（初回はモデルのダウンロードあり）")
        warnings += run_ast(tracks)
        used.add("ast")
    if "clap" in models:
        print("CLAP（初回はモデルのダウンロードあり）")
        warnings += run_clap(tracks)
        used.add("clap")

    result = judge(tracks, used)
    write_outputs(tracks, result, args.out, args, warnings)
    print(f"\n判定: {result['verdict']}  -> {args.out / 'report.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
