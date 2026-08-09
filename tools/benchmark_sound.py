#!/usr/bin/env python3
"""Original sound design for the Episode 1 cinematic hook.

Everything here is synthesised from scratch - sine partials, filtered noise and
shaped envelopes. No sampled or licensed material is involved, so the bed
carries no third-party rights.

The bed is written against the shot plan: night tone under the bedroom, a
brighter room tone from the match cut, city weight, a riser into the graphic
and a resolve under the closing frame.
"""
from __future__ import annotations

import argparse
import json
import math
import wave
from pathlib import Path

import numpy as np

SR = 48000


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR), dtype=np.float64) / SR


def env(t: np.ndarray, start: float, attack: float, hold: float, release: float) -> np.ndarray:
    """Attack / hold / release gate on an absolute timeline."""
    out = np.zeros_like(t)
    rise = (t - start) / max(1e-6, attack)
    fall = 1.0 - (t - (start + attack + hold)) / max(1e-6, release)
    out = np.clip(np.minimum(rise, fall), 0.0, 1.0)
    return out * out * (3 - 2 * out)  # smoothstep


def tone(t: np.ndarray, freq: float, detune: float = 0.0) -> np.ndarray:
    if detune:
        return 0.5 * (np.sin(2 * np.pi * freq * t) + np.sin(2 * np.pi * (freq * (1 + detune)) * t))
    return np.sin(2 * np.pi * freq * t)


def one_pole_lowpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    a = math.exp(-2 * math.pi * cutoff / SR)
    out = np.empty_like(signal)
    acc = 0.0
    for index, sample in enumerate(signal):
        acc = sample * (1 - a) + acc * a
        out[index] = acc
    return out


def one_pole_highpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    return signal - one_pole_lowpass(signal, cutoff)


def noise(length: int, seed: int) -> np.ndarray:
    return np.random.default_rng(seed).standard_normal(length)


def impact(t: np.ndarray, at: float, freq: float = 46.0, decay: float = 0.55, level: float = 0.5) -> np.ndarray:
    local = np.clip(t - at, 0, None)
    gate = (t >= at).astype(np.float64)
    sweep = freq * np.exp(-local * 2.2)
    phase = 2 * np.pi * np.cumsum(sweep) / SR
    return level * gate * np.exp(-local / decay) * np.sin(phase)


def shimmer(t: np.ndarray, at: float, level: float = 0.16) -> np.ndarray:
    local = np.clip(t - at, 0, None)
    gate = (t >= at).astype(np.float64)
    out = np.zeros_like(t)
    for index, freq in enumerate((1046.5, 1396.9, 2093.0, 2793.8)):
        out += np.sin(2 * np.pi * freq * t) * np.exp(-local / (1.5 - index * 0.22))
    return level * gate * out / 4


def chord(t: np.ndarray, freqs, start: float, attack: float, hold: float, release: float, level: float) -> np.ndarray:
    gate = env(t, start, attack, hold, release)
    out = np.zeros_like(t)
    for freq in freqs:
        out += tone(t, freq, detune=0.0016)
    return out / len(freqs) * gate * level


def build(duration: float) -> np.ndarray:
    t = t_axis(duration)
    n = len(t)
    bed = np.zeros(n)

    # --- Night: deep drone under the bedroom shots -----------------------
    slow = 0.55 + 0.45 * np.sin(2 * np.pi * 0.07 * t)
    bed += tone(t, 55.0, 0.0012) * env(t, 0.0, 2.2, 12.0, 5.0) * 0.155 * slow
    bed += tone(t, 82.5, 0.0018) * env(t, 0.4, 3.0, 11.0, 5.5) * 0.075 * slow
    bed += tone(t, 110.0) * env(t, 1.0, 4.0, 8.0, 6.0) * 0.032

    # Air: barely-there filtered hiss, the sound of a quiet room.
    air = one_pole_highpass(noise(n, 11), 2600.0)
    bed += air * env(t, 0.0, 3.0, 22.0, 3.0) * 0.0075

    # The minute turning over.
    click = np.zeros(n)
    at = int(2.85 * SR)
    click[at : at + 900] = np.exp(-np.linspace(0, 9, 900)) * 0.5
    bed += one_pole_lowpass(click * noise(n, 3)[:n], 3200.0) * 0.9

    # --- Pad: A minor under the night, lifting to F major at the city ----
    bed += chord(t, (110.0, 130.81, 164.81), 4.0, 3.4, 5.6, 3.2, 0.085)
    bed += chord(t, (87.31, 130.81, 174.61), 13.0, 3.0, 6.4, 3.4, 0.085)
    bed += chord(t, (98.0, 146.83, 196.0), 21.4, 1.6, 3.4, 3.0, 0.10)

    # --- Match cut at 10.7s: the room tone opens up ----------------------
    bright = one_pole_highpass(noise(n, 27), 1400.0)
    bed += bright * env(t, 10.7, 1.1, 4.2, 2.6) * 0.011
    bed += impact(t, 10.7, freq=64.0, decay=0.8, level=0.20)

    # --- City weight ------------------------------------------------------
    rumble = one_pole_lowpass(noise(n, 41), 90.0)
    bed += rumble * env(t, 15.8, 1.2, 5.2, 2.4) * 0.075
    bed += impact(t, 15.8, freq=52.0, decay=0.9, level=0.24)
    bed += impact(t, 18.9, freq=58.0, decay=0.6, level=0.14)

    # --- Riser into the number -------------------------------------------
    rise_start, rise_end = 20.35, 21.9
    mask = (t >= rise_start) & (t < rise_end)
    progress = np.zeros(n)
    progress[mask] = (t[mask] - rise_start) / (rise_end - rise_start)
    riser = one_pole_highpass(noise(n, 57), 700.0)
    sweep_gain = np.where(mask, progress ** 2.4, 0.0)
    bed += riser * sweep_gain * 0.075
    bed += np.sin(2 * np.pi * np.cumsum(np.where(mask, 120 + progress * 420, 0.0)) / SR) * sweep_gain * 0.045

    # --- The number lands -------------------------------------------------
    bed += impact(t, 21.92, freq=44.0, decay=1.15, level=0.42)
    bed += shimmer(t, 24.35, level=0.055)

    # --- Resolve ----------------------------------------------------------
    bed += tone(t, 73.42, 0.001) * env(t, 25.4, 1.4, 1.0, 2.2) * 0.10
    bed += tone(t, 110.0, 0.0014) * env(t, 25.6, 1.6, 0.8, 2.0) * 0.05

    # Gentle master shaping: roll off anything that would fight the voice.
    bed = one_pole_lowpass(bed, 9000.0)

    # Hard fade at both ends so the mix can never start or end on a click.
    fade_in = np.clip(t / 0.8, 0, 1)
    fade_out = np.clip((duration - t) / 1.1, 0, 1)
    bed *= fade_in * fade_out

    peak = float(np.max(np.abs(bed))) or 1.0
    return bed / peak * 0.5


def write_wav(path: Path, mono: np.ndarray) -> None:
    # Slight stereo spread: the bed is wide, the transients stay centred.
    delay = int(0.011 * SR)
    left = mono.copy()
    right = np.concatenate([np.zeros(delay), mono[:-delay]]) * 0.94 + mono * 0.06
    stereo = np.stack([left, right], axis=1)
    data = np.clip(stereo, -1.0, 1.0)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes((data * 32767).astype(np.int16).tobytes())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="benchmark/audio/narration-manifest.json")
    parser.add_argument("--out", default="benchmark/audio/bed.wav")
    args = parser.parse_args()
    manifest = json.loads(Path(args.manifest).read_text())
    duration = float(manifest["narrationSeconds"])
    write_wav(Path(args.out), build(duration))
    print(f"sound bed {duration:.2f}s -> {args.out}")


if __name__ == "__main__":
    main()
