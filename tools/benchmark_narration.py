#!/usr/bin/env python3
"""Generate the Episode 1 cinematic hook narration with the locked narrator.

Narration is produced one line at a time so that pacing gaps between lines are
designed, not accidental, and so caption cues are derived from real word
boundaries instead of estimates. The narrator identity is hard-locked: if the
approved voice cannot be produced, this script fails closed rather than
substituting a different voice.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import shutil
import ssl
import subprocess
import sys
from pathlib import Path

import edge_tts
import edge_tts.communicate

APPROVED_VOICE = "en-US-BrianNeural"


def network_config() -> dict:
    """Honour corporate/CI egress config without ever weakening verification.

    Some CI and sandbox environments terminate TLS at an egress proxy and expose
    its CA via the standard variables. edge-tts pins its own certifi context, so
    the bundle has to be handed to it explicitly.
    """
    bundle = next(
        (
            value
            for value in (
                os.environ.get("EDGE_TTS_CA_BUNDLE"),
                os.environ.get("SSL_CERT_FILE"),
                os.environ.get("REQUESTS_CA_BUNDLE"),
            )
            if value and Path(value).exists()
        ),
        None,
    )
    if bundle:
        edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=bundle)
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or None
    return {"caBundle": bundle, "proxy": proxy}


NETWORK = network_config()

# Designed pacing. `gap_after` is the silence appended after the line, in
# seconds. Rates are tuned per line by measured syllable rate, not by feel:
# the hook lands deliberately, the body sits around 4 syl/s, the payoff slows.
LINES = [
    {"id": "l1", "text": "Tonight, you go to bed for the last time.", "rate": "-8%", "gap_after": 0.58},
    {
        "id": "l2",
        "text": "Tomorrow, every human wakes up and discovers that sleep is simply unnecessary.",
        "rate": "-15%",
        "gap_after": 0.60,
    },
    {"id": "l3", "text": "No fatigue. No brain fog. No hidden health cost.", "rate": "-2%", "gap_after": 0.50},
    {
        "id": "l4",
        "text": "Whatever your body used to repair during sleep now happens while you are awake.",
        "rate": "-19%",
        "gap_after": 0.74,
    },
    {"id": "l5", "text": "You just gained roughly eight extra hours every day.", "rate": "-18%", "gap_after": 1.30},
]

LEAD_IN = 0.80  # silence before the first word so shot 1 can establish


def count_syllables(text: str) -> int:
    """Rough English syllable count - good enough to police narration pace."""
    total = 0
    for raw in text.lower().split():
        word = "".join(ch for ch in raw if ch.isalpha())
        if not word:
            continue
        groups = 0
        previous_vowel = False
        for ch in word:
            is_vowel = ch in "aeiouy"
            if is_vowel and not previous_vowel:
                groups += 1
            previous_vowel = is_vowel
        if word.endswith("e") and groups > 1 and not word.endswith(("le", "ee", "ye")):
            groups -= 1
        total += max(1, groups)
    return total


def attach_punctuation(text: str, words: list[dict]) -> list[dict]:
    """Re-join spoken word boundaries with the punctuation of the source line.

    Edge TTS reports boundaries as bare words, so captions built straight from
    them lose every comma and full stop - which also destroys any chance of
    splitting captions on sentence structure.
    """
    tokens = text.split()
    cursor = 0
    normalise = lambda value: "".join(ch for ch in value.lower() if ch.isalnum())
    out = []
    for word in words:
        target = normalise(word["text"])
        display = word["text"]
        for offset in range(cursor, min(len(tokens), cursor + 4)):
            if normalise(tokens[offset]) == target:
                display = tokens[offset]
                cursor = offset + 1
                break
        out.append({**word, "display": display})
    return out


def ffmpeg_bin() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    bundled = Path("/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux")
    if bundled.exists():
        return str(bundled)
    raise SystemExit("ffmpeg not found")


async def synth_line(line: dict, out_dir: Path) -> dict:
    """Render one narration line and capture its real word boundaries."""
    communicate = edge_tts.Communicate(
        line["text"],
        APPROVED_VOICE,
        rate=line["rate"],
        boundary="WordBoundary",
        proxy=NETWORK["proxy"],
    )
    audio = bytearray()
    words: list[dict] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
            words.append(
                {
                    "text": chunk["text"],
                    "start": chunk["offset"] / 1e7,
                    "end": (chunk["offset"] + chunk["duration"]) / 1e7,
                }
            )
    if not audio:
        raise SystemExit(f"no audio produced for line {line['id']} with {APPROVED_VOICE}")
    if not words:
        raise SystemExit(f"no word boundaries produced for line {line['id']}")
    mp3 = out_dir / f"{line['id']}.mp3"
    mp3.write_bytes(bytes(audio))
    return {**line, "mp3": str(mp3), "words": words}


def probe_duration(path: str) -> float:
    ff = ffmpeg_bin()
    probe = ff.replace("ffmpeg", "ffprobe")
    if not Path(probe).exists():
        # Bundled playwright ffmpeg has no ffprobe; decode instead.
        out = subprocess.run(
            [ff, "-v", "error", "-i", path, "-f", "null", "-"],
            capture_output=True,
            text=True,
        )
        # Fall back to stream-length measurement via wav conversion.
        wav = Path(path).with_suffix(".probe.wav")
        subprocess.run([ff, "-y", "-v", "error", "-i", path, str(wav)], check=True)
        import wave

        with wave.open(str(wav)) as w:
            duration = w.getnframes() / float(w.getframerate())
        wav.unlink(missing_ok=True)
        return duration
    out = subprocess.run(
        [probe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(out.stdout.strip())


def build(out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    rendered = [asyncio.run(synth_line(line, out_dir)) for line in LINES]

    ff = ffmpeg_bin()
    cursor = LEAD_IN
    cues = []
    parts = []
    for index, line in enumerate(rendered):
        wav = out_dir / f"{line['id']}.wav"
        subprocess.run(
            [ff, "-y", "-v", "error", "-i", line["mp3"], "-ar", "48000", "-ac", "1", str(wav)],
            check=True,
        )
        duration = probe_duration(str(wav))
        spoken = attach_punctuation(line["text"], line["words"])
        words = [
            {"text": w["display"], "start": cursor + w["start"], "end": cursor + w["end"]} for w in spoken
        ]
        word_count = len(words)
        speech_span = max(0.001, words[-1]["end"] - words[0]["start"])
        cues.append(
            {
                "id": line["id"],
                "text": line["text"],
                "start": round(cursor, 3),
                "speechStart": round(words[0]["start"], 3),
                "end": round(cursor + duration, 3),
                "duration": round(duration, 3),
                "gapAfter": line["gap_after"],
                "words": [{"text": w["text"], "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in words],
                "wpm": round(word_count / (duration / 60.0), 1),
                "syllablesPerSecond": round(count_syllables(line["text"]) / duration, 2),
                "articulationWpm": round(word_count / (speech_span / 60.0), 1),
            }
        )
        parts.append({"wav": str(wav), "lead": 0.0 if index else LEAD_IN, "tail": line["gap_after"]})
        cursor += duration + line["gap_after"]

    # Concatenate with designed silence, sample-accurate, into one narration bed.
    filter_parts = []
    inputs = []
    for index, part in enumerate(parts):
        inputs += ["-i", part["wav"]]
        pad = f"adelay={int(part['lead'] * 1000)}|{int(part['lead'] * 1000)}" if part["lead"] else "anull"
        filter_parts.append(f"[{index}:a]{pad},apad=pad_dur={part['tail']}[a{index}]")
    concat = "".join(f"[a{i}]" for i in range(len(parts)))
    filter_complex = ";".join(filter_parts) + f";{concat}concat=n={len(parts)}:v=0:a=1[out]"
    narration = out_dir / "narration.wav"
    subprocess.run(
        [ff, "-y", "-v", "error", *inputs, "-filter_complex", filter_complex, "-map", "[out]",
         "-ar", "48000", "-ac", "1", str(narration)],
        check=True,
    )
    total = probe_duration(str(narration))

    manifest = {
        "voice": APPROVED_VOICE,
        "leadIn": LEAD_IN,
        "narrationWav": str(narration),
        "narrationSeconds": round(total, 3),
        "cues": cues,
    }
    (out_dir / "narration-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="benchmark/audio")
    args = parser.parse_args()
    manifest = build(Path(args.out))
    print(f"voice={manifest['voice']} total={manifest['narrationSeconds']}s")
    for cue in manifest["cues"]:
        print(
            f"  {cue['id']} {cue['start']:>6.2f}-{cue['end']:>6.2f}  "
            f"{cue['wpm']:>6.1f} wpm  {cue['syllablesPerSecond']:>4.2f} syl/s  {cue['text']}"
        )
    fast = [c for c in manifest["cues"] if c["syllablesPerSecond"] > 4.15]
    if fast:
        print("WARNING: lines above 4.15 syl/s:", [c["id"] for c in fast], file=sys.stderr)


if __name__ == "__main__":
    main()
