# Episode 1 Zenn-Quality Visual Rebuild Design

## Goal

Finish `20260807-episode` as a publish-grade 1080p faceless explainer whose visual quality is comparable in *clarity, pacing, simplicity, and concept density* to Zenn (`@Zenn0009`) while keeping What If Explains' own dark-navy / warm-amber identity. Do not copy Zenn's exact drawings, compositions, branding, or assets.

## Quality bar

The current render fails because it maps narration keywords to generic icons and rotates a few layouts. The rebuild must instead make every narrative section feel intentionally illustrated.

The final video must:

- retain the verified script, narration timing, captions, 3–6 second visual-beat cadence, citations, and packaging hypotheses already produced;
- use nine bespoke visual worlds, one for each scripted scene;
- change focal composition, camera position, annotation, character pose, data callout, or diagram state on essentially every visual beat;
- use hand-drawn/doodle visual language with thick imperfect strokes, simple characters, restrained shapes, and high visual hierarchy;
- preserve the existing palette `#0b0d12`, `#eae7e1`, `#ffb340` rather than imitating Zenn's exact palette;
- avoid generic icon slides, stock-footage dumps, AI-generated cinematic filler, placeholder assets, and Higgsfield;
- keep captions readable but visually secondary to the main illustration;
- use Remotion-only deterministic motion for camera moves, drawing reveals, counters, timelines, callouts, and transitions;
- produce a thumbnail that is visually consistent with the episode and retains exactly three package hypotheses in canonical production input;
- fail closed if the bespoke visual scene registry or any required scene art is missing.

## Visual architecture

### 1. Doodle primitives

Create reusable React/SVG primitives for people, clocks, phones, beds, buildings, arrows, paths, labels, cards, and hand-drawn strokes. Motion is driven only by Remotion frame state (`useCurrentFrame`, `interpolate`, `Easing`) and never by CSS transitions/animations.

### 2. Scene registry

Create nine scene components keyed by canonical `scene-01` through `scene-09`. Each component consumes the current beat and local frame progress. The scenes are:

1. **Last bedtime / hook** — bedroom, last sleep, sunrise, eight-hour wedge opening, work/attention pressure entering the recovered time.
2. **A second life** — 2,920 hours → 122 days, calendar/time transformation, language/company/chess/family choices, around-the-clock infrastructure.
3. **Sleep is doing work** — brain maintenance, memory, attention, heart/immune repair, explicit separation of impossible premise from real sleep deprivation.
4. **Night still exists inside you** — circadian wheel, day/night physiology, overlapping time cultures, a 2 a.m. normal-day vignette.
5. **The 24-hour economy** — always-open city, 3 a.m. gym, midnight class, shifted construction, then employer pressure expanding into reclaimed time.
6. **Sleep was a boundary** — 3 a.m. messages, universal unavailability disappearing, artificial/legal night as an attention shield.
7. **Homes and relationships change** — bedroom/floorplan transformation, partners on diverging schedules, deliberate overlap hours, sleepless baby punchline.
8. **Memory and time** — days losing chapter boundaries, continuous timeline, artificial reset rituals, need for psychological escape despite no biological sleep.
9. **Payoff** — reclaimed one-third of life represented as an eight-hour slice contested by work/family/economy/internet, ending with the slice protected by the individual.

### 3. Beat choreography

The existing measured beat timeline remains authoritative. A deterministic beat-style selector uses `sceneId` plus the beat ordinal *within that scene* to choose camera framing, illustration emphasis, callout treatment, and small motion. It must not infer the central picture from generic keyword matching.

### 4. Persistent scene art

Each scene has a real checked-in SVG art plate in `public/visuals/20260807-episode/`. Remotion uses the plate as a background/detail layer while React/SVG foreground animation creates beat-specific movement. Canonical `production-input.json` references these nine real files through `visualAsset` and may be marked `visualGrade: publish-grade` only when all nine are present.

## Thumbnail

Package A remains the current render selection, but the thumbnail art becomes a custom doodle composition: an awake figure facing a 24-hour clock whose eight-hour night segment has physically opened into a glowing amber gap. Text remains `8 HOURS BACK`. The thumbnail must have one dominant idea, strong silhouette readability, and no episode ID/debug text.

## State and re-render

Because the current `RENDERED` artifact is explicitly a technical preview, revision-safely invalidate it back to `VOICE_READY` with the reason that the placeholder visual render is superseded by the bespoke visual rebuild. Preserve the existing narration choice. On main, the guarded factory may regenerate deterministic TTS if the transient narration artifact is unavailable and then render the new video.

## Verification

Before merge:

- unit tests prove all nine scene IDs have bespoke registry entries;
- tests prove canonical scene art references are complete and no fallback icon mode can be considered publish-grade;
- full existing state/producer/guard tests pass;
- Remotion smoke still renders for episode and thumbnail.

After merge:

- inspect the real main workflow run rather than inferring completion;
- verify `episode.mp4`, thumbnail, full contact sheet, and first-30-second contact sheet exist;
- inspect contact-sheet evidence for visual repetition, caption collisions, dead frames, and scene/voice mismatch;
- do not set `QA_PASSED` or `AUTO_PUBLISH_READY`; hand finished artifacts to independent Critic + QA.
