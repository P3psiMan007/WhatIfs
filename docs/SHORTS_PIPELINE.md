# Shorts pipeline

A separate, vertical short-form track that turns written copy into an approved
director's proposal and a set of **Gemini Omni Flash** prompts — six ~10-second
clips you render externally and stitch into one ~60-second short.

The approach is adapted from the open-source
[`stickman-video-director`](https://github.com/kaomei/stickman-video-director)
Codex skill (MIT): propose, get a human yes, *then* generate prompts.

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
npm run shorts -- plan --copy shorts/fixtures/solar-storm-copy.txt --actor you
# review shorts/current/proposal.json, then:
npm run shorts -- approve --actor you
npm run shorts -- prompts --actor you
```

`plan` accepts `--aspect 9:16|16:9|1:1`, `--theme dark|light` and an optional
`--title`. Point `SHORTS_DIR` and `SHORTS_STATE_PATH` elsewhere to run against
a sandbox; both resolve per call.

`prompts` writes `shorts/current/prompt-package.json`: one prompt per scene with
time beats, an SFX note, and the shared negative constraints. Each prompt
restates the aspect ratio and palette, because Gemini generates every clip in
isolation and otherwise drifts between scenes.

## Copy requirements

The voiceover must land between 110 and 170 words across at least six
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

Generative video also has policy and copyright exposure the deterministic
Remotion path does not. Treat `config/shorts-autonomy.json`'s
`privateOnlyUntilUserApproval` as load-bearing before anything is published.

## Tests

```bash
npm run test:shorts        # 34 unit + integration tests
bash shorts/ci-approval-gate.sh   # end-to-end CLI gate, also run in CI
```
