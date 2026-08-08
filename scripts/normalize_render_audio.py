#!/usr/bin/env python
"""Normalize a rendered episode's audio without re-encoding its video stream."""
from __future__ import annotations

import argparse
import copy
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def _run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        raise RuntimeError(
            f"command failed ({proc.returncode}): {' '.join(cmd)}\n{proc.stderr[-4000:]}"
        )
    return proc


def _run_quiet(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if proc.returncode != 0:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(cmd)}")


def parse_loudnorm_json(stderr: str) -> dict:
    matches = re.findall(r'\{\s*"input_i".*?\}', stderr, re.S)
    if not matches:
        raise ValueError("ffmpeg loudnorm output did not contain measurement JSON")
    return json.loads(matches[-1])


def build_loudnorm_second_pass_filter(
    measured: dict,
    *,
    target_i: float,
    target_tp: float,
    target_lra: float,
) -> str:
    required = ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")
    missing = [key for key in required if key not in measured]
    if missing:
        raise ValueError("missing loudnorm measurements: " + ", ".join(missing))
    return (
        f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}:"
        f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
        f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
        f"offset={measured['target_offset']}:linear=true:print_format=summary"
    )


def ffprobe_json(video: Path) -> dict:
    proc = _run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration,size,bit_rate",
            "-show_entries",
            "stream=index,codec_name,codec_type,width,height,r_frame_rate,channels,sample_rate",
            "-of",
            "json",
            str(video),
        ]
    )
    return json.loads(proc.stdout)


def measure_output_loudness(video: Path) -> tuple[float, float]:
    proc = _run(
        [
            "ffmpeg",
            "-hide_banner",
            "-nostats",
            "-i",
            str(video),
            "-vn",
            "-map",
            "0:a:0",
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json",
            "-f",
            "null",
            "-",
        ]
    )
    measured = parse_loudnorm_json(proc.stderr)
    return float(measured["input_i"]), float(measured["input_tp"])


def update_manifest_for_normalized_render(
    manifest: dict,
    *,
    run_id: str,
    probe: dict,
    integrated_lufs: float,
    true_peak_dbfs: float,
    source_run_id: str,
) -> dict:
    updated = copy.deepcopy(manifest)
    updated["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    updated["githubRunId"] = str(run_id)
    updated["artifactName"] = "episode-render"
    updated["filename"] = "episode.mp4"
    updated["technical"] = probe
    updated["audioQa"] = {
        "normalized": True,
        "targetIntegratedLufs": -16.0,
        "targetTruePeakDbfs": -1.5,
        "integratedLufs": round(float(integrated_lufs), 1),
        "truePeakDbfs": round(float(true_peak_dbfs), 1),
        "videoStreamCopied": True,
        "sourceRunId": str(source_run_id),
    }
    return updated


def normalize_video_audio(
    input_video: Path,
    output_video: Path,
    *,
    target_i: float = -16.0,
    target_tp: float = -1.5,
    target_lra: float = 7.0,
) -> tuple[dict, float, float]:
    first = _run(
        [
            "ffmpeg",
            "-hide_banner",
            "-nostats",
            "-i",
            str(input_video),
            "-vn",
            "-map",
            "0:a:0",
            "-af",
            f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}:print_format=json",
            "-f",
            "null",
            "-",
        ]
    )
    measured = parse_loudnorm_json(first.stderr)
    second_pass = build_loudnorm_second_pass_filter(
        measured,
        target_i=target_i,
        target_tp=target_tp,
        target_lra=target_lra,
    )
    output_video.parent.mkdir(parents=True, exist_ok=True)
    _run_quiet(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-nostats",
            "-i",
            str(input_video),
            "-map",
            "0:v:0",
            "-map",
            "0:a:0",
            "-c:v",
            "copy",
            "-af",
            second_pass,
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            str(output_video),
        ]
    )
    probe = ffprobe_json(output_video)
    integrated, true_peak = measure_output_loudness(output_video)
    return probe, integrated, true_peak


def validate_normalized_output(
    source_probe: dict,
    output_probe: dict,
    integrated_lufs: float,
    true_peak_dbfs: float,
) -> None:
    source_video = next(
        (s for s in source_probe.get("streams", []) if s.get("codec_type") == "video"), None
    )
    output_video = next(
        (s for s in output_probe.get("streams", []) if s.get("codec_type") == "video"), None
    )
    output_audio = next(
        (s for s in output_probe.get("streams", []) if s.get("codec_type") == "audio"), None
    )
    if not source_video or not output_video or not output_audio:
        raise ValueError("source/output streams incomplete")
    for key in ("codec_name", "width", "height", "r_frame_rate"):
        if output_video.get(key) != source_video.get(key):
            raise ValueError(
                f"video stream changed at {key}: source={source_video.get(key)!r} "
                f"output={output_video.get(key)!r}"
            )
    if output_audio.get("codec_name") != "aac" or int(output_audio.get("channels") or 0) != 2:
        raise ValueError("normalized output must contain stereo AAC audio")
    source_duration = float((source_probe.get("format") or {}).get("duration") or 0)
    output_duration = float((output_probe.get("format") or {}).get("duration") or 0)
    if abs(output_duration - source_duration) > 0.1:
        raise ValueError(
            f"duration drift too large: source={source_duration} output={output_duration}"
        )
    if not (-16.5 <= integrated_lufs <= -15.5):
        raise ValueError(
            f"integrated loudness outside publish target window: {integrated_lufs} LUFS"
        )
    if true_peak_dbfs > -1.0:
        raise ValueError(f"true peak too high: {true_peak_dbfs} dBFS")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-video", required=True)
    parser.add_argument("--output-video", required=True)
    parser.add_argument("--manifest-in", required=True)
    parser.add_argument("--manifest-out", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--source-run-id", required=True)
    args = parser.parse_args()

    input_video = Path(args.input_video)
    output_video = Path(args.output_video)
    manifest_in = Path(args.manifest_in)
    manifest_out = Path(args.manifest_out)

    source_probe = ffprobe_json(input_video)
    probe, integrated, peak = normalize_video_audio(input_video, output_video)
    validate_normalized_output(source_probe, probe, integrated, peak)

    manifest = json.loads(manifest_in.read_text(encoding="utf-8"))
    updated = update_manifest_for_normalized_render(
        manifest,
        run_id=args.run_id,
        probe=probe,
        integrated_lufs=integrated,
        true_peak_dbfs=peak,
        source_run_id=args.source_run_id,
    )
    manifest_out.parent.mkdir(parents=True, exist_ok=True)
    manifest_out.write_text(json.dumps(updated, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "integratedLufs": integrated,
                "truePeakDbfs": peak,
                "runId": str(args.run_id),
            }
        )
    )


if __name__ == "__main__":
    main()
