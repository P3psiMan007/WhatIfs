# Episode 1 Zenn-Quality Visual Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Episode 1's generic icon slideshow with nine bespoke doodle-animation scenes, re-render the real 1080p episode, and deliver genuine QA artifacts without touching publisher-owned pass states.

**Architecture:** Keep the verified narration, measured timeline, captions, and beat cadence. Add a deterministic scene registry plus reusable SVG/doodle primitives; each canonical scene gets custom composition and motion keyed by scene ID and beat ordinal, with a real checked-in SVG plate referenced by canonical production input. The main factory is revision-safely moved back to `VOICE_READY` so the new renderer produces a fresh artifact after merge.

**Tech Stack:** React 18.3.1, Remotion 4.0.506, SVG/React markup, Node test runner, GitHub Actions, FFmpeg.

## Global Constraints

- Never use Higgsfield.
- Do not spend money or create paid resources.
- Do not copy Zenn's exact art/assets/branding; match its simplicity, concept density, and visual pacing with original What If Explains art.
- Preserve palette `#0b0d12`, `#eae7e1`, `#ffb340`.
- Preserve measured per-scene audio timing and the 3–6 second visual-beat gate.
- Never mark `QA_PASSED`, `AUTO_PUBLISH_READY`, or `PUBLISHED` from production code.
- No placeholder visual can be labeled publish-grade.

---

### Task 1: Add visual-registry regression tests

**Files:**
- Create: `video/src/sleep-visual-registry.mjs`
- Create: `video/src/sleep-visual-registry.test.mjs`
- Modify: `.github/workflows/episode-factory.yml`

**Interfaces:**
- Produces `SLEEP_SCENE_IDS`, `SLEEP_SCENE_ASSETS`, `getSleepSceneSpec(sceneId)`, and `assertSleepVisualCoverage(sceneIds)`.

- [ ] Write a failing Node test asserting exactly nine canonical scene IDs, one unique asset path per scene, no missing scene lookup, and no generic fallback.
- [ ] Run `node --test video/src/sleep-visual-registry.test.mjs` and confirm failure because the registry does not exist.
- [ ] Implement the minimal registry with IDs `scene-01` … `scene-09` and asset paths under `visuals/20260807-episode/`.
- [ ] Re-run the registry test and confirm green.
- [ ] Add the registry test to CI.

### Task 2: Add real per-scene art plates

**Files:**
- Create: `public/visuals/20260807-episode/scene-01.svg`
- Create: `public/visuals/20260807-episode/scene-02.svg`
- Create: `public/visuals/20260807-episode/scene-03.svg`
- Create: `public/visuals/20260807-episode/scene-04.svg`
- Create: `public/visuals/20260807-episode/scene-05.svg`
- Create: `public/visuals/20260807-episode/scene-06.svg`
- Create: `public/visuals/20260807-episode/scene-07.svg`
- Create: `public/visuals/20260807-episode/scene-08.svg`
- Create: `public/visuals/20260807-episode/scene-09.svg`

**Interfaces:**
- Each file is a 2560×1440 deterministic SVG plate, loaded by `staticFile()` through the registry path.

- [ ] Create nine original dark-navy/off-white/amber doodle plates matching the approved scene concepts.
- [ ] Ensure every SVG has distinct scene-specific subjects rather than generic icons.
- [ ] Verify all nine files are non-empty and paths exactly match the registry.

### Task 3: Build reusable doodle and motion primitives

**Files:**
- Create: `video/src/doodle-primitives.jsx`

**Interfaces:**
- Produces reusable components for hand-drawn lines, people, clocks, phones, beds, buildings, timeline markers, callout pills, arrows, and scene labels.

- [ ] Implement deterministic SVG primitives with slightly imperfect duplicated strokes.
- [ ] Drive all entrance/reveal movement from `useCurrentFrame()` / `interpolate()`; use no CSS animation or transition.
- [ ] Keep primitives presentation-only and independent from narration keyword heuristics.

### Task 4: Build nine bespoke scene components

**Files:**
- Create: `video/src/sleep-scenes.jsx`

**Interfaces:**
- Produces `SleepScene({beat, beatOrdinal, palette})` and internally maps exact scene IDs to bespoke components.

- [ ] Implement scene-01 hook choreography: last bedtime → wake/sunrise → eight-hour gap → external claims on time.
- [ ] Implement scene-02 time-life choreography: `2,920 HOURS`, `122 DAYS`, pursuits, 24h infrastructure.
- [ ] Implement scene-03 biology choreography: memory/attention/brain maintenance, heart and immune functions, impossible-premise vs sleep-deprivation split.
- [ ] Implement scene-04 circadian choreography: day/night wheel, physiology cycles, time cultures, 2 a.m. life.
- [ ] Implement scene-05 economy choreography: 24h city services, shifted schedules, employer tug on reclaimed time.
- [ ] Implement scene-06 boundary choreography: 3 a.m. inbox pressure, artificial night shield, legal/cultural boundary.
- [ ] Implement scene-07 home choreography: bedroom transformation, diverging partner schedules, overlap zone, sleepless baby.
- [ ] Implement scene-08 psychology choreography: continuous time stream, lost day chapters, reset rituals, escape from consciousness.
- [ ] Implement scene-09 payoff choreography: eight-hour life slice tug-of-war, then protected/self-owned ending.
- [ ] Ensure beat ordinal changes camera/focus/detail inside each scene rather than replaying one static composition.

### Task 5: Replace the generic icon renderer and thumbnail

**Files:**
- Modify: `video/src/what-if-episode.jsx`
- Modify: `video/src/root.jsx`

**Interfaces:**
- `WhatIfEpisode` renders `SleepScene` per beat, derives ordinal from canonical beat IDs, and keeps audio/captions.
- `WhatIfThumbnail` renders a bespoke 24-hour clock / awake-figure composition.

- [ ] Remove production dependence on the `Icon` keyword visual layer.
- [ ] Load each scene's checked-in SVG plate and animate camera/focus with the bespoke scene foreground.
- [ ] Retain the existing measured beat timing and narration audio.
- [ ] Redesign captions to be readable but visually secondary.
- [ ] Remove debug episode ID from final frames and thumbnail.
- [ ] Render smoke stills locally in CI and check no component/runtime errors.

### Task 6: Mark only the real current visual input publish-grade

**Files:**
- Modify: `episodes/current/production-input.json`
- Test: `tools/episode-producer.test.mjs`

**Interfaces:**
- Current Episode 1 receives `visualGrade: "publish-grade"` and all nine real `visualAsset` paths.

- [ ] Add a failing regression assertion that the current input's scene assets are complete, unique, and exactly correspond to the nine checked-in registry paths.
- [ ] Update current production input with the nine paths and `visualGrade` only after the files exist.
- [ ] Run producer + visual-guard tests and confirm publish-grade readiness is based on actual per-scene references.

### Task 7: Revision-safely invalidate the technical preview

**Files:**
- Modify: `episodes/current/episode-state.json`
- Modify: `queue/runner-status.json`

**Interfaces:**
- Episode state moves `RENDERED -> VOICE_READY` with revision increment and history reason; old `render_asset` is invalidated, selected voice retained.

- [ ] Re-read canonical state immediately before edit and abort on revision mismatch.
- [ ] Append a history record explicitly saying the heuristic technical preview is superseded by the bespoke visual rebuild.
- [ ] Set production `render_asset` to null and `qa_inputs_ready` false; preserve voice selection.
- [ ] Clear only the obsolete visual blocker from runner status so the factory can render; do not touch publisher-owned pass states.

### Task 8: Verify, PR, merge, and inspect the real factory render

**Files:**
- No new source file required unless a test reveals a defect.

**Interfaces:**
- Green PR CI is required before merge. Main factory run must produce `episode.mp4`, `thumbnail.png`, `contact-sheet.jpg`, and `first-30s-contact-sheet.jpg`.

- [ ] Run all Node tests including visual registry/guard.
- [ ] Run Remotion episode and thumbnail smoke renders.
- [ ] Open PR and inspect diff for accidental gate weakening or unrelated changes.
- [ ] Inspect PR workflow runs/jobs; fix any failure before merge.
- [ ] Squash merge only when evidence is green.
- [ ] Inspect the main factory workflow run rather than inferring completion.
- [ ] Fetch the render artifact list and verify all required files exist.
- [ ] Inspect first-30-second and full-video contact sheets for visual repetition, caption collisions, scene mismatch, and dead frames.
- [ ] If quality evidence fails, create the smallest follow-up repair and repeat the render loop.
- [ ] When the actual artifact is publish-grade, leave state for independent Critic + QA; do not self-approve.
