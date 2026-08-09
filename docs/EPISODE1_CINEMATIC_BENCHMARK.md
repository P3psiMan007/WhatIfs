# Episode 1 — cinematic hook benchmark

A 28-second opening built to settle one question before any more of Episode 1
gets made: **is this visual language worth propagating across the full
episode?** It is a style test, not a deliverable episode.

The previous private upload (`3EGJqkrn42A`) stays private and is not Episode 1.
The illustrated-SVG scene system that produced it is not the target style; it
is left in the repo as the technical repair it was, and is not used here.

## What changed, and why

The rejected render failed for reasons that were partly technical and mostly
creative. Both are addressed structurally rather than by tuning numbers.

| Failure | Fix |
| --- | --- |
| Procedural doodles drawn over finished scene art — duplicate people, ghost limbs | `HOOK_SHOTS` names exactly **one** component per shot. Nothing composites a second subject over a first. |
| ~87 short black flashes, missed by a 0.5s blackdetect gate | Shots are stored as boundaries and expanded to overlap; `findCoverageGaps` throws at render time if any frame is unowned. `benchmark_qa.py` checks **every frame's** luma, not runs over 0.5s. |
| Narrator silently swapped to Kokoro `am_michael` | `benchmark_narration.py` and `benchmark_mix.py` both hard-check `en-US-BrianNeural` and fail closed. There is no fallback path to another voice. |
| Lines delivered too fast (168, 183.8 wpm) | Per-line rates tuned against **measured syllable rate**; every line lands under 4.0 syl/s, and the payoff line is the slowest in the piece. |
| Subtitles ended 0.24s after the picture | Captions are derived from real TTS word boundaries and clamped to the render duration. Covered by a test. |
| Static illustrated slides with slow zooms | Nine shots in 28s, each with its own camera move, plus a match cut and a visual rhyme. |

## The visual language

- **Silhouette and light, not drawn characters.** Figures are dark shapes lit
  from a named source. A silhouette with no rendered anatomy cannot have broken
  anatomy — this is a deliberate answer to the anatomy hard-fail, not an
  avoidance of it.
- **One light direction per scene.** Rim lights use a `userSpaceOnUse`
  gradient shared by every object in the frame, so the room is lit once rather
  than each object carrying its own little highlight ramp.
- **Depth by plane.** Every scene is 3–5 planes with independent parallax,
  progressive blur and haze between them.
- **A colour script, not a palette.** Cold night → dawn → warm morning →
  night city → daybreak → near-black for the one graphic → dusk.
- **Typography once.** `+8 HOURS` is the only on-screen text besides captions,
  and it is the promise the thumbnail makes.
- **Continuous grade.** Grain, vignette and colour lift are applied per shot
  from one component, so nine different scenes read as one piece of film.

## Shot plan

| # | Shot | In | Idea |
| --- | --- | --- | --- |
| 1 | `clock-macro` | 0.0s | 11:59 becomes 12:00. The last minute of the last night. |
| 2 | `bedroom-night` | 3.6s | The final bedtime, seen once. |
| 3 | `window-dawn` | 7.3s | Night hands over to morning. |
| 4 | `bedroom-morning` | 10.7s | Match cut — same frame, same camera, empty bed. |
| 5 | `clock-dissolve` | 13.1s | The opening clock again, display dead, coming apart. |
| 6 | `city-night` | 15.8s | A city that stopped switching off. |
| 7 | `city-sweep` | 18.9s | Day sweeps over it; nothing slows down. |
| 8 | `hours-graphic` | 21.9s | A third of the dial leaves the clock and becomes the number. |
| 9 | `closing-window` | 25.6s | One person, awake, holding the extra hours. |

## Sound

`benchmark_sound.py` synthesises the entire bed from sine partials, filtered
noise and shaped envelopes — drone, room-tone shift at the match cut, city
weight, a riser into the graphic, and a resolve. Nothing is sampled or
licensed, so the bed carries no third-party rights. The mix ducks the bed under
the narrator with a real sidechain compressor and normalises the programme to
-14 LUFS.

## Rebuilding it

```bash
npm install
python3 -m pip install edge-tts numpy

python3 tools/benchmark_narration.py --out benchmark/audio   # locked narrator
node    tools/benchmark-build.mjs                            # props + SRT
python3 tools/benchmark_sound.py                             # original bed
npx remotion render video/src/index.jsx CinematicHook \
  benchmark/hook-picture.mp4 --props=benchmark/hook-props.json \
  --codec=h264 --crf=17 --pixel-format=yuv420p
python3 tools/benchmark_mix.py                               # mix + mux
python3 tools/benchmark_qa.py benchmark/what-if-episode1-hook-benchmark.mp4
bash    tools/benchmark-frames.sh                            # stills to review
```

Behind a TLS-terminating egress proxy, point `SSL_CERT_FILE` at the proxy CA
before running the narration step; the script hands that bundle to edge-tts
explicitly and never weakens verification.

## What this benchmark does not settle

Approval here is approval of **style**. The full episode still needs its own
shot plan across all nine script sections, and the approved ChatGPT Images
thumbnail remains the thumbnail for the final upload.
