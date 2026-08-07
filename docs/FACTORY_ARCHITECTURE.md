# What If Explains — Factory Architecture

This document covers the reusable production infrastructure: how it's laid
out, how to drive it by hand, and how to recover when a step fails. For the
state machine itself (states, transitions, ownership rules, concurrency
rules), see [`EPISODE_STATE_PROTOCOL.md`](EPISODE_STATE_PROTOCOL.md) — this
doc assumes you've read that first.

## Architecture at a glance

```
episodes/current/episode-state.json   <- shared pointer: which episode, what state, revision
episodes/<episode-id>/                <- one directory per episode (the "episode package")
  episode.json                        <- premise, hook, target length (growth.* mirror)
  research.md, facts.json             <- research + fact ledger (not built by this factory)
  script.md                           <- full narration script (not built by this factory)
  pronunciation.json                  <- pronunciation overrides (not built by this factory)
  scene-manifest.json                 <- per-scene visual direction, timing, captions
  audio/
    auditions/<voiceId>.wav           <- 2-5 candidate hook recordings (gitignored media)
    voice-audition-manifest.json      <- candidates + mechanical checks (committed)
    narration.wav                     <- full approved narration (gitignored media)
    narration-timing.json             <- real per-word timing, source of truth (committed)
  renders/
    render-manifest.json              <- dimensions, duration, paths, git commit (committed)
  qa/
    <episode-id>-qa-report.json       <- mechanical PASS/FAIL/UNVERIFIED checks (committed)

src/                                  <- Remotion video project (TypeScript/React)
  video/types/                        <- EpisodePackage, SceneManifestEntry, VoiceConfig, etc.
  video/style/                        <- channel visual identity (channelStyle.ts)
  video/components/                   <- doodle visual primitives (characters, props, captions)
  video/captions/                     <- phrase segmentation, safe-bounds checking, rendering
  video/engine/                       <- ties types+style+components into an actual video
  Root.tsx                            <- registers the "Episode" and "FactoryTest" compositions

tools/                                <- plain Node scripts (no build step), one job each
  episode-state.mjs                   <- revision-safe state read/write (pre-existing)
  orchestrator.mjs                    <- routes "what's the next step" to the right tool below
  voice/                              <- Kokoro TTS: auditions, full narration, channel narrator
  qa/                                 <- ffprobe/ffmpeg-based technical checks
  render/                             <- Remotion bundle+render, finalize, contact sheet
  validate/                           <- ajv schema validation for episode.json/scene-manifest.json
  audio/                              <- ffmpeg mixing (narration+music+ambience+SFX)
  lib/                                <- shared ffmpeg binary resolution, process runner

.github/workflows/
  voice-audition.yml                  <- manual: generate audition candidates
  render-episode.yml                  <- manual: render + finalize + QA an episode
  episode-state-guard.yml             <- CI: validates state file on every push/PR (pre-existing)
  upload-youtube.yml                  <- manual, private-only upload (pre-existing, untouched)
```

**Ownership boundary this factory respects:** `tools/qa/run-technical-qa.mjs`
and the technical-QA step inside `render-episode.mjs` only ever write
`episodes/<id>/qa/*.json` files — they never touch `episode-state.json`'s
`qa.*` section or move state past `RENDERED`. Per the protocol, `qa.*` and
the `RENDERED -> QA_PASSED_AWAITING_USER_APPROVAL` transition belong to the
Critic/Analytics role, which also weighs subjective creative review this
factory cannot perform. The technical QA report is *input* to that decision,
not the decision itself.

**What this factory does NOT build:** research/fact-checking (SELECTED ->
RESEARCHED) and script writing (RESEARCHED -> SCRIPTED) are content-generation
steps for an LLM/Growth automation, not mechanical tooling — `tools/orchestrator.mjs`
NOOPs on those states rather than guessing. Voice *selection* (picking the
audition winner) and the Critic's subjective review are human/Critic
decisions this factory never makes automatically.

## Episode package format

Types live in `src/video/types/*.ts`; the same shapes are enforced at
runtime by JSON Schemas in `episodes/*.schema.json` (`episode-package`,
`scene-manifest`, `fact-ledger`, `voice-audition-manifest`,
`render-manifest`, `qa-report`). `tools/validate/validateEpisodePackage.mjs`
validates `episode.json` and `scene-manifest.json` against those schemas —
it's the first thing `render-episode.mjs` does, so a malformed episode
package fails fast with a specific field-level error instead of a confusing
downstream Remotion crash.

A `SceneManifestEntry` carries: scene ID, narration text/span, timing
(`startSeconds`/`endSeconds`, null until real narration exists), visual
purpose, focal subject, environment, props, camera intent, motion intent,
caption text, SFX intent, transition type, required assets, and what new
information the scene communicates.

## Voice workflow

### 1. Run auditions (SCRIPTED -> VOICE_AUDITIONS_READY)

```bash
EPISODE_ID=<id> npm run voice:audition
```

Or via GitHub Actions: Actions tab → "Voice Audition" → Run workflow,
supply `episode_id` (optional `hook_path`, `audition_voices`). Generates
2-5 Kokoro TTS candidates from the **same** ~15-30s hook (extracted from
`script.md`, or from `hook_path` if given), each recording provider/model/
voice ID/speed/language/settings plus mechanical checks (file exists,
non-zero duration, silence, clipping — never a subjective quality claim).
Writes `episodes/<id>/audio/voice-audition-manifest.json` and advances
state. **No automation ever picks the winner** — that's the next step.

### 2. A human picks the winner (VOICE_AUDITIONS_READY -> VOICE_SELECTED)

Listen to the candidates in `episodes/<id>/audio/auditions/`, then either:

- Set `production.selected_voice` on the episode's state (episode-specific
  choice), or
- Lock in a permanent channel narrator (see below) — future episodes then
  pick it up automatically with no per-episode choice needed.

Either way, finish with:
```bash
node tools/episode-state.mjs transition <revision> <id> VOICE_SELECTED critic "picked af_heart"
```

### 3. Choosing/setting the permanent channel narrator

`config/channel-voice.json` starts unselected (`"selected": false`). To lock
one in:
```js
import { setChannelNarrator } from "./tools/voice/channelNarrator.mjs";
setChannelNarrator({ provider: "kokoro", model: "onnx-community/Kokoro-82M-v1.0-ONNX", voiceId: "af_heart", speed: 1, language: "en-US", settings: {} }, "ep-that-chose-it", "warm, clear delivery");
```
`resolveNarratorVoice(state)` (used by narration generation) prefers the
episode's own `production.selected_voice` and falls back to this file, so an
episode can always override the channel default.

### 4. Generate full narration (VOICE_SELECTED -> VOICE_READY)

```bash
EPISODE_ID=<id> npm run voice:narration
```
Streams the full `script.md` through Kokoro in its natural (sentence-level)
chunks — each chunk's duration is *measured*, not estimated, and chunk
boundaries are exact; word-level timestamps inside a chunk are interpolated
proportionally to word length (documented approximation, see
`tools/voice/narrationTiming.mjs`). Writes `narration.wav` +
`narration-timing.json`, runs the same mechanical checks, and **only**
advances state if the result passes (`fileExists` and `nonZeroDuration` both
`PASS`) — a failed generation never silently moves the pipeline forward.

## Rendering an episode (VOICE_READY -> RENDERED)

```bash
EPISODE_ID=<id> npm run render:episode
```
Or via GitHub Actions: Actions tab → "Render Episode" → Run workflow. One
script performs the entire sequence: validate the episode package against
its schema, confirm `narration.wav` exists, bundle the Remotion project,
render the full 1920x1080/30fps video (narration's real duration is always
the timing source of truth), finalize with an ffmpeg faststart remux,
generate a contact sheet, run technical QA, then commit
`render-manifest.json` + the QA report and advance state to `RENDERED`.

Narration audio can't be loaded from an arbitrary filesystem path by
Remotion's `<Audio>` — only `http(s)://` URLs or paths under the project's
`public/` dir via `staticFile()`. The render script stages a copy into
`public/render-assets/<id>/` for the duration of the render and always
cleans it up afterward (even on failure).

## Where artifacts appear

| Artifact | Committed to git | Location |
|---|---|---|
| `episode-state.json` | yes | `episodes/current/` |
| Audition/narration manifests | yes | `episodes/<id>/audio/*.json` |
| Render/QA manifests | yes | `episodes/<id>/{renders,qa}/*.json` |
| Audition/narration WAVs | **no** — CI artifact only | uploaded by `voice-audition.yml` |
| Final MP4, render log, contact sheet | **no** — CI artifact only | uploaded by `render-episode.yml` |

GitHub Actions artifacts are retained 90 days (`retention-days: 90` on both
workflows). Locally, everything lands under `out/` and `episodes/<id>/`
directly — nothing is hidden.

## QA workflow

`tools/qa/technicalChecks.mjs` has one function per check (file exists,
non-zero size, resolution, fps, duration, video/audio stream presence,
unexpected silence, clipping, black frames, frozen frames, missing required
assets, render-log errors), each returning `PASS`/`FAIL`/`UNVERIFIED`.
`runTechnicalQA()` aggregates them: `FAIL` if any check `FAIL`ed, else
`UNVERIFIED` if any check couldn't run, else `PASS` — a check that never ran
is never counted as a pass. Run standalone:
```bash
EPISODE_ID=<id> npm run qa:technical
```
This is **mechanical only** — it cannot judge whether an episode is good,
funny, accurate, or on-brand. That's the Critic's job, using this report as
one input alongside actually watching the video.

## How Claude / an automated routine interacts with the factory

`tools/orchestrator.mjs` is the single entry point:
```bash
npm run episode:next -- --episode <id>
# or: EPISODE_ID=<id> npm run episode:next
```
It reads `episodes/current/episode-state.json`, routes to the one tool that
owns the current state's next step (voice audition, narration, or render),
and safely NOOPs — with a specific reason, never a guess — on every state
with no automated action (`IDLE`, `SELECTED`, `RESEARCHED`,
`VOICE_AUDITIONS_READY`, `RENDERED`, `QA_PASSED_AWAITING_USER_APPROVAL`,
`PUBLISHED`, `ANALYZED`, both `*_BLOCKED` states, `QA_FAILED_VOICE`). Every
dispatched tool re-reads and re-validates state itself before acting — the
orchestrator's read is only for routing, never a substitute for that check.

## Publication lock

No script in this repository calls a YouTube upload endpoint. The only
upload path is the pre-existing `.github/workflows/upload-youtube.yml`,
which is manually triggered, always uploads as `private`
(`youtube_uploader/uploader.py` hard-codes `privacyStatus: "private"`, not
caller-overridable), and is architecturally separate from everything this
factory build touched. `QA_PASSED_AWAITING_USER_APPROVAL` is the highest
state any automation here can reach.

## Recovering from failures

- **A voice audition candidate fails to generate:** the manifest still
  records it (`generationFailed: true`, checks `UNVERIFIED`) and state still
  advances as long as at least one candidate succeeded. If *all* fail,
  state stays `SCRIPTED` and the run exits non-zero — rerun once the
  underlying issue (model download, disk space) is fixed.
- **Narration generation fails or fails mechanical QA:** state stays
  `VOICE_SELECTED`, nothing is overwritten. Rerun `npm run voice:narration`.
- **Render fails partway:** state stays at its pre-render value (`VOICE_READY`
  or `QA_FAILED`); the staged `public/render-assets/` copy is always cleaned
  up (`finally` block) even on failure, so reruns start clean.
- **Finalize or contact-sheet generation fails but the raw render succeeded:**
  logged as a warning, not a hard failure — the unfinalized MP4 is kept and
  state still advances to `RENDERED`, since a missing contact sheet
  shouldn't block the pipeline; the render log records what happened.
- **QA_FAILED:** `tools/orchestrator.mjs` does not re-render automatically.
  It prints `qa.required_fixes`/`qa.top_issues` from state (falling back to
  "check qa-report.json manually" if those are empty) so a human/critic can
  decide what a targeted rerender needs to change, then rerun
  `npm run render:episode` once fixed.
- **Revision conflict** (`revision conflict: expected X, found Y`): another
  process wrote to `episode-state.json` first. Re-read the current state and
  retry with the new revision — never force-overwrite.

## Exact commands reference

```bash
node tools/episode-state.mjs show                          # inspect current state
EPISODE_ID=<id> npm run voice:audition                      # SCRIPTED -> VOICE_AUDITIONS_READY
EPISODE_ID=<id> npm run voice:narration                     # VOICE_SELECTED -> VOICE_READY
EPISODE_ID=<id> npm run render:episode                      # VOICE_READY -> RENDERED
EPISODE_ID=<id> npm run qa:technical                        # standalone technical QA
npm run episode:next -- --episode <id>                      # auto-route to the next step
npm test                                                    # full test suite (node --test)
npm run typecheck                                           # tsc --noEmit
npm run lint                                                # eslint src
npm run build                                                # remotion bundle
npm run render:test                                          # render the synthetic FactoryTest composition
npx remotion studio                                          # visual preview in the browser
```

## Known limitations (honestly scoped, not silently glossed over)

- **`SceneRenderer`'s default visual mapping is a heuristic fallback, not
  art direction.** It turns free-text `environment`/`props`/`visualPurpose`
  fields into a plausible visual via keyword matching (`contentHints.ts`).
  A real content/art-direction pipeline should eventually author explicit
  per-scene visual directives instead.
- **The default `DoodleCharacter` placement floats slightly above each
  environment's implied ground line** (environments don't expose their own
  ground-Y coordinate for the generic renderer to align to). Cosmetic, not
  functional — every other mechanic (poses, expressions, props, camera
  moves, captions, transitions) works correctly.
- **`match-cut` renders as an instant hard cut at the engine level.** A true
  match-cut (shared visual anchor across the cut) is a content-authoring
  concern the manifest doesn't carry yet.
- **Passing a plain string to `kokoro-js`'s `tts.stream()` hangs forever**
  after the last chunk (confirmed by direct testing — the process exits with
  "Detected unsettled top-level await" instead of completing). Always go
  through `tools/voice/kokoroClient.mjs`'s `streamSynthesize`, which uses
  the documented `TextSplitterStream` push/close pattern instead.
- **No dedicated GitHub Actions workflow for narration generation** — only
  auditions and rendering have workflow files, matching what was explicitly
  requested. `npm run voice:narration` works standalone/locally today; add
  a `narration.yml` mirroring `voice-audition.yml` if CI-triggered narration
  generation is wanted later.
- **`onnxruntime-node` prints a harmless N-API version warning** ("only API
  versions [1, 21] are supported... Current ORT Version is: 1.21.0") on
  Node 24 — a third-party native-binary compat shim, not a real error;
  Kokoro synthesis works correctly despite it (verified with real audio
  output).
