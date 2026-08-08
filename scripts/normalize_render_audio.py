#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


def build_ffmpeg_args(source: str, output: str) -> list[str]:
    return [
        "ffmpeg", "-y", "-v", "error", "-i", source,
        "-map", "0:v:0", "-map", "0:a:0",
        "-c:v", "copy",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        output,
    ]


def loudness_is_publish_grade(integrated_lufs: float, true_peak_db: float) -> bool:
    return -17.5 <= integrated_lufs <= -15.0 and true_peak_db <= -1.0


def probe_loudness(path: str) -> tuple[float, float]:
    cmd = [
        "ffmpeg", "-hide_banner", "-nostats", "-i", path,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    text = proc.stderr
    start = text.rfind("{")
    end = text.rfind("}")
    if start < 0 or end < start:
        raise RuntimeError("ffmpeg loudnorm did not emit JSON measurements")
    data = json.loads(text[start:end + 1])
    return float(data["input_i"]), float(data["input_tp"])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("output")
    args = parser.parse_args()

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(build_ffmpeg_args(args.source, args.output), check=True)
    integrated, peak = probe_loudness(args.output)
    print(json.dumps({"integratedLUFS": integrated, "truePeakDb": peak}))
    if not loudness_is_publish_grade(integrated, peak):
        raise SystemExit(f"normalized render failed loudness gate: {integrated} LUFS, {peak} dBTP")


if __name__ == "__main__":
    main()
