#!/usr/bin/env python
"""Extract objective evidence from a rendered episode for independent QA.

This tool deliberately does NOT assign a QA score or PASS decision. It reports
measurable facts (caption timing, sentence pace, payoff pace, render shape,
visual-beat metadata, narrator identity, and durable rights-evidence presence)
so the independent critic can make the final >=9/10 judgment.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from statistics import median

TIMING_RE = re.compile(
    r"(?P<sh>\d+):(?P<sm>\d+):(?P<ss>\d+),(?P<sms>\d+)\s+-->\s+"
    r"(?P<eh>\d+):(?P<em>\d+):(?P<es>\d+),(?P<ems>\d+)"
)
WORD_RE = re.compile(r"\b[\w’'-]+\b", re.UNICODE)


def _seconds(h: str, m: str, s: str, ms: str) -> float:
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip().lower()


def parse_srt(text: str) -> list[dict]:
    cues: list[dict] = []
    for block in re.split(r"\r?\n\s*\r?\n", str(text or "").strip()):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        timing_index = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if timing_index is None:
            continue
        match = TIMING_RE.fullmatch(lines[timing_index])
        if not match:
            continue
        g = match.groupdict()
        start = _seconds(g["sh"], g["sm"], g["ss"], g["sms"])
        end = _seconds(g["eh"], g["em"], g["es"], g["ems"])
        caption = " ".join(lines[timing_index + 1:]).strip()
        if not caption:
            continue
        duration = end - start
        words = len(WORD_RE.findall(caption))
        wpm = words * 60 / duration if duration > 0 else math.inf
        cues.append({
            "start": round(start, 3),
            "end": round(end, 3),
            "duration": round(duration, 3),
            "text": caption,
            "words": words,
            "wpm": round(wpm, 1) if math.isfinite(wpm) else None,
        })
    return cues


def _percentile(values: list[float], percentile: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * percentile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def _pace_summary(cues: list[dict]) -> dict:
    wpms = [float(cue["wpm"]) for cue in cues if cue.get("wpm") is not None]
    return {
        "cueCount": len(cues),
        "medianWpm": round(median(wpms), 1) if wpms else None,
        "p90Wpm": round(_percentile(wpms, 0.9), 1) if wpms else None,
        "maxWpm": round(max(wpms), 1) if wpms else None,
        "fastestCues": sorted(
            [
                {
                    "start": cue["start"],
                    "end": cue["end"],
                    "wpm": cue["wpm"],
                    "text": cue["text"],
                }
                for cue in cues if cue.get("wpm") is not None
            ],
            key=lambda item: item["wpm"],
            reverse=True,
        )[:5],
    }


def _find_payoff_cues(cues: list[dict], production: dict) -> list[dict]:
    scenes = production.get("scenes") or []
    payoff_scene = next(
        (scene for scene in reversed(scenes) if str(scene.get("headline") or "").strip().upper() == "PAYOFF"),
        scenes[-1] if scenes else None,
    )
    if not payoff_scene:
        return []
    payoff_text = _normalize(payoff_scene.get("narration"))
    matches = []
    for cue in cues:
        normalized = _normalize(cue.get("text"))
        if normalized and normalized in payoff_text:
            matches.append(cue)
    return matches


def _render_summary(manifest: dict, production: dict) -> dict:
    technical = manifest.get("technical") or {}
    stream = (technical.get("streams") or [{}])[0] or {}
    fmt = technical.get("format") or {}
    width = int(stream.get("width") or 0)
    height = int(stream.get("height") or 0)
    frame_rate = str(stream.get("r_frame_rate") or "")
    narrator = manifest.get("narrator") or {}
    image_assets = manifest.get("imageAssets") or {}
    return {
        "episodeId": manifest.get("episodeId"),
        "episodeMatchesProduction": manifest.get("episodeId") == production.get("episodeId"),
        "runId": str(manifest.get("githubRunId")) if manifest.get("githubRunId") is not None else None,
        "artifactName": manifest.get("artifactName"),
        "codec": stream.get("codec_name"),
        "width": width,
        "height": height,
        "frameRate": frame_rate,
        "durationSeconds": float(fmt.get("duration")) if fmt.get("duration") not in (None, "") else None,
        "technicalShapeOk": (
            stream.get("codec_name") == "h264"
            and width == 1920
            and height == 1080
            and frame_rate == "30/1"
        ),
        "visualQa": manifest.get("visualQa") or {},
        "visualGrade": manifest.get("visualGrade"),
        "qaInputsReady": manifest.get("qaInputsReady"),
        "publishBlocker": manifest.get("publishBlocker"),
        "narratorAudioSha256": narrator.get("audioSha256"),
        "imageAssetManifestSha256": image_assets.get("sha256"),
        "imageAssetRevision": image_assets.get("assetRevision"),
    }


def _rights_summary(production: dict, rights_path: Path) -> dict:
    narrator = production.get("narrator") or {}
    declared_voice = str(narrator.get("voice") or "").strip()
    evidence = rights_path.read_text(encoding="utf-8") if rights_path.is_file() else ""
    lower = evidence.lower()
    model_ok = "kokoro-82m" in lower
    license_ok = "apache-2.0" in lower
    voice_ok = bool(declared_voice) and declared_voice.lower() in lower
    commercial_ok = any(word in lower for word in ("commercial", "production"))
    return {
        "evidencePath": str(rights_path),
        "evidenceFileExists": rights_path.is_file(),
        "kokoroEvidencePresent": model_ok and license_ok and voice_ok and commercial_ok,
        "modelMentioned": model_ok,
        "licenseMentioned": license_ok,
        "voiceMentioned": voice_ok,
        "commercialUseMentioned": commercial_ok,
        "declaredProvider": narrator.get("provider"),
        "declaredModel": narrator.get("model"),
        "declaredLicense": narrator.get("license"),
        "declaredVoice": narrator.get("voice"),
    }


def build_evidence(cues: list[dict], production: dict, manifest: dict, rights_path: Path) -> dict:
    overlaps = []
    invalid = []
    for index, cue in enumerate(cues):
        if cue["duration"] <= 0:
            invalid.append(index + 1)
        if index and cue["start"] < cues[index - 1]["end"]:
            overlaps.append({
                "previousCue": index,
                "currentCue": index + 1,
                "overlapSeconds": round(cues[index - 1]["end"] - cue["start"], 3),
            })

    payoff_cues = _find_payoff_cues(cues, production)
    narrator = production.get("narrator") or {}
    return {
        "evidenceVersion": "1.0",
        "decisionAuthority": "independent QA; this file is evidence only and MUST NOT be treated as a PASS",
        "render": _render_summary(manifest, production),
        "captions": {
            "cueCount": len(cues),
            "overlapCount": len(overlaps),
            "overlaps": overlaps,
            "invalidTimingCount": len(invalid),
            "invalidTimingCueNumbers": invalid,
            "firstStart": cues[0]["start"] if cues else None,
            "lastEnd": cues[-1]["end"] if cues else None,
        },
        "narration": {
            "provider": narrator.get("provider"),
            "model": narrator.get("model"),
            "license": narrator.get("license"),
            "voice": narrator.get("voice"),
            **_pace_summary(cues),
        },
        "payoff": _pace_summary(payoff_cues),
        "rights": _rights_summary(production, rights_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--srt", required=True)
    parser.add_argument("--production-input", required=True)
    parser.add_argument("--render-manifest", required=True)
    parser.add_argument("--rights-evidence", default="docs/licenses/kokoro-82m.md")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    srt = Path(args.srt).read_text(encoding="utf-8")
    production = json.loads(Path(args.production_input).read_text(encoding="utf-8"))
    manifest = json.loads(Path(args.render_manifest).read_text(encoding="utf-8"))
    evidence = build_evidence(parse_srt(srt), production, manifest, Path(args.rights_evidence))
    Path(args.output).write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
