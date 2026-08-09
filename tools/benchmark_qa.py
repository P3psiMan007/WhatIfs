#!/usr/bin/env python3
"""Objective checks on the exact rendered file.

This deliberately does not score creativity. It measures the things that are
measurable, so that the human review can spend its attention on the things that
are not. The black-flash check works frame by frame: the rejected Episode 1
render was full of 0.1-0.2s dips that a 0.5s blackdetect threshold never saw.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

# A single frame below this average luma is a flash worth failing on.
BLACK_YAVG = 10.0
# A frame this much darker than its neighbours is a dip even if not fully black.
DIP_RATIO = 0.42


def probe_json(path: str) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", path],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(out.stdout)


def frame_luma(path: str) -> list[float]:
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf",
         "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"],
        capture_output=True,
        text=True,
        check=True,
    )
    return [float(m) for m in re.findall(r"lavfi\.signalstats\.YAVG=([0-9.]+)", out.stdout)]


def audio_stats(path: str) -> dict:
    out = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", path, "-af", "ebur128=framelog=quiet,astats=metadata=1:reset=0",
         "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    text = out.stderr
    stats = {}
    integrated = re.search(r"I:\s*(-?[0-9.]+)\s*LUFS", text)
    peak = re.search(r"Peak:\s*(-?[0-9.]+)\s*dBFS", text)
    if integrated:
        stats["integratedLufs"] = float(integrated.group(1))
    if peak:
        stats["truePeakDb"] = float(peak.group(1))
    return stats


def srt_bounds(path: Path) -> dict:
    if not path.exists():
        return {}
    stamps = re.findall(r"(\d\d):(\d\d):(\d\d),(\d\d\d) --> (\d\d):(\d\d):(\d\d),(\d\d\d)", path.read_text())
    if not stamps:
        return {}
    to_seconds = lambda h, m, s, ms: int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000
    starts = [to_seconds(*row[:4]) for row in stamps]
    ends = [to_seconds(*row[4:]) for row in stamps]
    return {"cues": len(stamps), "firstStart": min(starts), "lastEnd": max(ends)}


def analyse(video: Path, srt: Path) -> dict:
    meta = probe_json(str(video))
    video_stream = next(s for s in meta["streams"] if s["codec_type"] == "video")
    audio_stream = next((s for s in meta["streams"] if s["codec_type"] == "audio"), None)
    duration = float(meta["format"]["duration"])
    num, den = (video_stream["r_frame_rate"].split("/") + ["1"])[:2]
    fps = float(num) / float(den)

    luma = frame_luma(str(video))
    black = [index for index, value in enumerate(luma) if value < BLACK_YAVG]

    dips = []
    for index in range(1, len(luma) - 1):
        neighbours = max(luma[index - 1], luma[index + 1])
        if neighbours > 12 and luma[index] < neighbours * DIP_RATIO:
            dips.append({"frame": index, "seconds": round(index / fps, 3),
                         "yavg": round(luma[index], 2), "neighbourYavg": round(neighbours, 2)})

    def runs(indices):
        out = []
        for index in indices:
            if out and index == out[-1][1] + 1:
                out[-1][1] = index
            else:
                out.append([index, index])
        return [{"fromFrame": a, "toFrame": b, "fromSeconds": round(a / fps, 3),
                 "seconds": round((b - a + 1) / fps, 3)} for a, b in out]

    captions = srt_bounds(srt)
    report = {
        "file": str(video),
        "sizeBytes": video.stat().st_size,
        "durationSeconds": round(duration, 3),
        "fps": round(fps, 3),
        "resolution": f"{video_stream['width']}x{video_stream['height']}",
        "videoCodec": video_stream["codec_name"],
        "pixelFormat": video_stream.get("pix_fmt"),
        "audioCodec": audio_stream["codec_name"] if audio_stream else None,
        "audioChannels": audio_stream.get("channels") if audio_stream else None,
        "audioSampleRate": audio_stream.get("sample_rate") if audio_stream else None,
        "framesAnalysed": len(luma),
        "minFrameLuma": round(min(luma), 2) if luma else None,
        "meanFrameLuma": round(sum(luma) / len(luma), 2) if luma else None,
        "blackFrames": runs(black),
        "luminanceDips": dips,
        "captions": captions,
        "audio": audio_stats(str(video)) if audio_stream else {},
    }

    failures = []
    if report["blackFrames"]:
        failures.append(f"{len(black)} near-black frame(s)")
    if dips:
        failures.append(f"{len(dips)} single-frame luminance dip(s)")
    if captions and captions.get("lastEnd", 0) > duration + 0.001:
        failures.append(f"subtitles end {captions['lastEnd'] - duration:.3f}s after the picture")
    if not audio_stream:
        failures.append("no audio stream")
    if abs(fps - 30) > 0.01:
        failures.append(f"unexpected frame rate {fps}")
    if video_stream["width"] < 1920 or video_stream["height"] < 1080:
        failures.append("below 1080p")
    report["failures"] = failures
    report["pass"] = not failures
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video")
    parser.add_argument("--srt", default="benchmark/hook.srt")
    parser.add_argument("--out", default="benchmark/qa-report.json")
    args = parser.parse_args()

    report = analyse(Path(args.video), Path(args.srt))
    Path(args.out).write_text(json.dumps(report, indent=2) + "\n")

    print(f"{report['resolution']} {report['fps']}fps {report['durationSeconds']}s  "
          f"{report['videoCodec']}/{report['audioCodec']}  {report['sizeBytes'] / 1e6:.2f} MB")
    print(f"frames {report['framesAnalysed']}  min luma {report['minFrameLuma']}  mean {report['meanFrameLuma']}")
    print(f"black frames: {len(report['blackFrames'])}   luminance dips: {len(report['luminanceDips'])}")
    if report["captions"]:
        print(f"captions {report['captions']['cues']} cues, last ends {report['captions']['lastEnd']}s "
              f"(picture {report['durationSeconds']}s)")
    if report["audio"]:
        print(f"audio {report['audio']}")
    if report["failures"]:
        print("FAIL: " + "; ".join(report["failures"]), file=sys.stderr)
        sys.exit(1)
    print("objective checks passed")


if __name__ == "__main__":
    main()
