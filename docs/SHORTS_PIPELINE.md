# Shorts pipeline

A separate, vertical short-form track that turns written copy into an approved
director's proposal and a set of **Gemini Omni Flash** prompts — six ~10-second
clips you render externally and stitch into one ~60-second short.

The approach follows the open-source
[`stickman-video-director`](https://github.com/kaomei/stickman-video-director)
Codex skill (MIT): propose, get a human yes, *then* generate prompts. Its
`SKILL.md`, `omni-flash-prompt-contract.md` and `style-catalog.md` are the
reference for everything below.

## Relationship to the episode factory

This pipeline is deliberately isolated from the long-form factory:

| | Long-form episode | Shorts |
|---|---|---|
| State | `episodes/current/episode-state.json` | `shorts/current/shorts-state.json` |
| Config | `config/autonomy.json` | `config/shorts-autonomy.json` |
| Renderer | Remotion, deterministic, first-party | Gemini Omni Flash, external, generative |
| Output | ~6:20 16:9 | ~0:60 9:16 (or 16:9 / 1:1) |
| Narration | Kokoro `af_heart`, locked | voiceover script only; TTS not wired up |

They share no state, no render path, and no publish quota. Nothing here
advances an episode, and `docs/PRODUCTION_REBUILD_ACTIVE.md` still governs the
episode track.

## The setup gate

An aspect ratio (`9:16`, `16:9`, `1:1`) and a theme (`dark`, `light`) must be
supplied. Neither is chosen silently, and a missing one is not defaulted away —
`missingSetup` reports every gap in a single message and planning stops.
Composition advice then follows the ratio: vertical gets stacked motion and
top-to-bottom reveals, 16:9 gets lateral staging, 1:1 gets short travel paths.

## The approval gate

Prompts cannot be produced from an unapproved proposal. `approveProposal`
stamps a SHA-256 digest of the directed content, and `buildPromptPackage`
recomputes that digest and refuses if it no longer matches — so editing the
proposal after approval invalidates it rather than silently shipping something
a human never saw. The state machine enforces the same rule a second time:
`PROPOSED -> PROMPTS_READY` is not a legal edge.

The digest covers every nested field. It deliberately does **not** use
`JSON.stringify`'s replacer-array argument, which is an allowlist applied at
every depth and would silently leave nested scene fields unhashed.

## States

```
IDLE -> DRAFTED -> PROPOSED -> APPROVED -> PROMPTS_READY
     -> CLIPS_RENDERED -> STITCHED -> QA_PASSED -> PUBLISHED_PRIVATE
```

Every stage from `PROPOSED` onward can fall back to `REJECTED`, and
`REJECTED -> IDLE` clears the short id. `PUBLISHED_PRIVATE` is terminal.
`CLIPS_RENDERED` onward are not yet automated — see *Not built yet*.

## Worked example

```bash
npm run shorts -- plan --copy shorts/fixtures/solar-storm-copy.txt \
  --aspect 9:16 --theme dark --actor you
# review shorts/current/proposal.json, then:
npm run shorts -- approve --actor you
npm run shorts -- prompts --actor you
```

`--aspect` and `--theme` are required; `--title` is optional. Point
`SHORTS_DIR` and `SHORTS_STATE_PATH` elsewhere to run against a sandbox; both
resolve per call.

`prompts` writes `shorts/current/prompt-package.json`: a global continuity
block, one standalone prompt per scene, and the stitching guide.

## What every prompt carries

Each of the six prompts is standalone and repeats the locks, in the order the
upstream contract sets out: output spec, environment, character, palette,
composition, inherited opening frame, three timed beats, quoted dialogue,
narrator, audio, closing frame, negatives.

- **Character DNA lock** — a hollow-circle-head stick figure, repeated verbatim.
  Without it the model renders scenery with no actor, which reads as a diagram
  rather than a story.
- **No technical colour notation.** Accents are named in ordinary words
  (`warm gold`, `vivid red`, `electric blue`), each with a fixed meaning that
  never changes between scenes. Hex survives on the proposal's `reviewSwatch`
  for human review only, and `buildPromptPackage` throws if any notation
  reaches a prompt — some models render a prominent hex string literally as
  on-screen text.
- **Continuity chain** — each scene declares the closing frame the next one
  inherits, and validation rejects a proposal whose chain is broken. The
  package ships a `stitchingGuide` naming the matched state at every cut.
- **Narrator lock** — one identical narrator description in all six prompts.
  Independent clips otherwise each invent their own voice.
- **BGM lock** — clip 1 establishes the theme; clips 2–6 are told to continue
  that exact bed.
- **Density floor** — at least four visual devices per scene, beats at
  `[0-3s]`, `[3-7s]`, `[7-10s]`, and an explicit instruction that something
  changes every two to three seconds and the figure is never idle.

## Copy requirements

The voiceover must land between 130 and 150 words across at least six
sentences. Overlong copy is trimmed back to the band at a sentence boundary;
copy that is too short **fails closed** rather than being padded, because
inventing narration is not this tool's job.

## Scene semantics

Scene shots are planned by the existing
`video/src/semantic-shot-planner.mjs`, so a short and an episode describe a
beat the same way (`contrast`, `process`, `cutaway`, `cause-effect`,
`network`, `scale`, `timeline`, `object-focus`). That planner truncates quoted
narration at 90 characters for its own renderer; the shorts layer trims those
quotes back to a clean sentence or word boundary so a dangling fragment never
reaches a prompt.

## Not built yet

- No clip rendering. Gemini Omni Flash / Google Flow is a paid external
  service; the prompts are handed off, not executed.
- No stitching, no TTS, no thumbnail, no upload. `CLIPS_RENDERED` onward are
  declared states with no automation behind them.
- Autonomy config is scaffolding — the gates in
  `config/shorts-autonomy.json` are declared, not enforced by a QA runner.
- Only Style 1 Classic Minimalist is implemented. The upstream catalog also
  defines Style 2A (Studio Tech) and 2B (Cinematic Story), which need their own
  character anchors and environment locks.

Generative video also has policy and copyright exposure the deterministic
Remotion path does not. Treat `config/shorts-autonomy.json`'s
`privateOnlyUntilUserApproval` as load-bearing before anything is published.

## Tests

```bash
npm run test:shorts        # 49 unit + integration tests
bash shorts/ci-approval-gate.sh   # end-to-end CLI gate, also run in CI
```
