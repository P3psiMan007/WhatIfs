#!/usr/bin/env python3
"""Mix narration + sound bed and mux onto the rendered picture.

Levels live here and nowhere else. The bed is ducked under the narrator with a
real sidechain compressor rather than a static level, so the voice always sits
on top without the bed disappearing between lines.
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def probe(path: str, entries: str) -> str:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", entries, "-of", "default=nw=1:nk=1", path],
        capture_output=True,
        text=True,
        check=True,
    )
    return out.stdout.strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--picture", default="benchmark/hook-picture.mp4")
    parser.add_argument("--narration", default="benchmark/audio/narration.wav")
    parser.add_argument("--bed", default="benchmark/audio/bed.wav")
    parser.add_argument("--manifest", default="benchmark/audio/narration-manifest.json")
    parser.add_argument("--out", default="benchmark/what-if-episode1-hook-benchmark.mp4")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text())
    if manifest.get("voice") != "en-US-BrianNeural":
        raise SystemExit(f"refusing to mix: narrator is {manifest.get('voice')}")

    duration = float(probe(args.picture, "format=duration"))
    mixed = Path(args.out).with_suffix(".mix.wav")
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)

    # -18 LUFS on the voice leaves headroom for the bed; the whole programme is
    # normalised to -14 LUFS at the end, which is what YouTube plays back at.
    filter_complex = (
        "[0:a]aformat=channel_layouts=stereo,"
        "highpass=f=85,"
        "acompressor=threshold=-20dB:ratio=2.6:attack=8:release=180:makeup=2,"
        "loudnorm=I=-18:TP=-2.5:LRA=9,"
        "aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0[voice];"
        "[voice]asplit=2[voice_out][voice_key];"
        "[1:a]aformat=channel_layouts=stereo,volume=0.62[bedraw];"
        "[bedraw][voice_key]sidechaincompress=threshold=0.035:ratio=7:attack=14:release=340:makeup=1[bed];"
        "[voice_out][bed]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[premaster];"
        "[premaster]alimiter=limit=0.94:attack=5:release=60,"
        f"loudnorm=I=-14:TP=-1.5:LRA=10,atrim=0:{duration:.3f},asetpts=N/SR/TB[out]"
    )

    run([
        "ffmpeg", "-y", "-v", "error",
        "-i", args.narration,
        "-i", args.bed,
        "-filter_complex", filter_complex,
        "-map", "[out]", "-ar", "48000", "-ac", "2",
        str(mixed),
    ])

    # Remotion's MJPEG pipeline tags the picture full-range (yuvj420p). On a
    # film this dark, a player that ignores the tag crushes every black in it,
    # so the master is conformed to limited-range yuv420p with explicit
    # BT.709 signalling rather than stream-copied.
    run([
        "ffmpeg", "-y", "-v", "error",
        "-i", args.picture,
        "-i", str(mixed),
        "-map", "0:v:0", "-map", "1:a:0",
        "-vf", "scale=in_range=full:out_range=limited,format=yuv420p",
        "-c:v", "libx264", "-preset", "slow", "-crf", "17",
        "-pix_fmt", "yuv420p",
        "-color_range", "tv", "-colorspace", "bt709",
        "-color_primaries", "bt709", "-color_trc", "bt709",
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart",
        "-shortest",
        args.out,
    ])
    mixed.unlink(missing_ok=True)

    final = float(probe(args.out, "format=duration"))
    print(f"mixed -> {args.out}  picture {duration:.3f}s  final {final:.3f}s")


if __name__ == "__main__":
    main()
