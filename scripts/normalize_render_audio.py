#!/usr/bin/env python
from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path


def build_ffmpeg_args(source: str, output: str) -> list[str]:
    return [
        "ffmpeg", "-y", "-v", "error", "-i", source,
        "-map", "0:v:0", "-map", "0:a:0",
        "-c:v", "copy",
        "-af", "volume=8.5dB,alimiter=limit=0.75:level=false",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        output,
    ]


def loudness_is_publish_grade(integrated_lufs: float, true_peak_db: float) -> bool:
    return -17.5 <= integrated_lufs <= -15.0 and true_peak_db <= -1.0


def probe_loudness(path: str) -> tuple[float, float]:
    cmd = [
        "ffmpeg", "-hide_banner", "-nostats", "-i", path,
        "-vn", "-af", "ebur128=peak=true", "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    integrated_matches = re.findall(r"I:\s+(-?\d+(?:\.\d+)?)\s+LUFS", proc.stderr)
    peak_matches = re.findall(r"Peak:\s+(-?\d+(?:\.\d+)?)\s+dBFS", proc.stderr)
    if not integrated_matches or not peak_matches:
        raise RuntimeError("ffmpeg ebur128 did not emit integrated loudness and true-peak measurements")
    return float(integrated_matches[-1]), float(peak_matches[-1])


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize the verified Episode 1 Kokoro render without re-encoding video")
    parser.add_argument("source")
    parser.add_argument("output")
    args = parser.parse_args()

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(build_ffmpeg_args(args.source, args.output), check=True)
    integrated, peak = probe_loudness(args.output)
    print(f"normalized_loudness_lufs={integrated}")
    print(f"normalized_true_peak_dbfs={peak}")
    if not loudness_is_publish_grade(integrated, peak):
        raise SystemExit(f"normalized render failed loudness gate: {integrated} LUFS, {peak} dBFS")


if __name__ == "__main__":
    main()
