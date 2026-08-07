# Autonomous Video Factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade What If Explains from a single-episode manual-publish factory into a revision-safe, three-slot, self-improving system targeting two polished videos per day with an optional third, guarded autonomous publishing, and analytics-driven evolution.

**Architecture:** Keep ChatGPT automations responsible for editorial/growth decisions while GitHub Actions own deterministic heavy work. Introduce per-episode state plus a three-slot queue, guarded narration/render/publish workflows, explicit art-direction manifests, and persistent analytics/experiment records. Preserve fail-closed behavior and canary publication before unattended public mode.

**Tech Stack:** Node.js 22, TypeScript, React 19, Remotion 4, Kokoro JS, ffmpeg/ffprobe, JSON Schema/Ajv, GitHub Actions, YouTube Data/Analytics APIs through the existing uploader/auth path.

## Global Constraints

- Daily target: 2 fully polished videos; a 3rd only when it passes the identical quality threshold.
- Core creative QA categories must score >= 9/10; hard factual, copyright, policy, audio, visual, or technical blockers prevent publishing.
- Starting narrator: Kokoro `af_heart`, speed `0.95`, `en-US`.
- First two production videos use private-canary verification before public auto-publish unlock.
- `pauseAllProduction` and `pausePublishing` kill switches must fail closed.
- Do not copy another creator's artwork, wording, private/custom voice, or music.
- Do not fabricate analytics, files, verification, or workflow success.

---

### Task 1: Factory CI and cloud narration

**Files:**
- Create: `.github/workflows/factory-ci.yml`
- Create: `.github/workflows/generate-narration.yml`
- Modify: `package.json`
- Test: existing `tools/voice/*.test.mjs`, render/validation tests

**Interfaces:**
- Consumes: `EPISODE_ID`, revision-safe episode state, `config/channel-voice.json`, episode `script.md`.
- Produces: narration WAV/timing artifact and a state transition from `VOICE_SELECTED`/equivalent production-ready voice state to `VOICE_READY` only after mechanical QA.

- [ ] **Step 1:** Add a PR-safe Linux CI workflow running `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and the synthetic Remotion render smoke without writing repository state.
- [ ] **Step 2:** Add a narration workflow that validates episode ID/state/revision, runs `npm run voice:narration`, uploads WAV/timing artifacts, and commits only manifest/state changes with optimistic concurrency.
- [ ] **Step 3:** Run CI on the branch and inspect actual job logs/artifacts; fix Linux-only failures before continuing.
- [ ] **Step 4:** Commit with `feat: add factory CI and cloud narration workflow`.

### Task 2: Per-episode state and three-slot queue

**Files:**
- Create: `queue/production-queue.schema.json`
- Create: `queue/daily-control.schema.json`
- Create: `config/autonomy.schema.json`
- Create: `queue/production-queue.json`
- Create: `queue/daily-control.json`
- Create: `config/autonomy.json`
- Create: `tools/queue/queue-state.mjs`
- Create: `tools/queue/queue-state.test.mjs`
- Modify: `tools/orchestrator.mjs`
- Modify: `tools/orchestratorRouting.mjs`

**Interfaces:**
- Produces: revision-safe `readQueue`, `enqueueEpisode`, `updateEpisodePointer`, `claimNextEligible`, `releaseClaim`, and daily throughput-controller functions.
- Episode states live at `episodes/<episode-id>/episode-state.json`; queue slots are priorities, not stage ownership.

- [ ] **Step 1:** Write tests for queue revision conflicts, duplicate episode rejection, three-slot capacity, blocked-episode isolation, and daily minimum/stretch rules.
- [ ] **Step 2:** Run tests and confirm RED.
- [ ] **Step 3:** Implement schemas/default files and queue state helpers minimally until tests pass.
- [ ] **Step 4:** Update orchestrator routing to choose the highest-priority eligible episode without cross-episode writes.
- [ ] **Step 5:** Run full tests/typecheck/lint/build.
- [ ] **Step 6:** Commit with `feat: add revision-safe multi-episode production queue`.

### Task 3: Explicit production art direction

**Files:**
- Modify: `episodes/scene-manifest.schema.json`
- Modify: `src/video/types/scene.ts`
- Create: `src/video/types/artDirection.ts`
- Modify: `src/video/engine/SceneRenderer.tsx`
- Create: `src/video/engine/DirectedSceneRenderer.tsx`
- Create tests under `src/video/engine/` for directed layout selection and fallback behavior.

**Interfaces:**
- New scene directives include character pose/expression/placement/scale, prop placement, layer definitions, palette/accent, visual metaphor, framing, transition anchor, and caption placement.
- Heuristic keyword mapping remains debug fallback only.

- [ ] **Step 1:** Write schema/type tests proving publishable scenes require explicit direction while debug scenes may opt into fallback.
- [ ] **Step 2:** Run and confirm RED.
- [ ] **Step 3:** Extend schema/types with explicit directives and validation.
- [ ] **Step 4:** Implement `DirectedSceneRenderer` with foreground/midground/background composition and explicit placement.
- [ ] **Step 5:** Route publishable scenes through the directed renderer; preserve fallback behind an explicit flag.
- [ ] **Step 6:** Render synthetic scene-variety fixtures and inspect contact sheets.
- [ ] **Step 7:** Commit with `feat: add explicit production art direction`.

### Task 4: Publish-grade QA artifact and gate

**Files:**
- Modify: `episodes/qa-report.schema.json`
- Create: `episodes/publish-gate.schema.json`
- Create: `tools/qa/evaluatePublishGate.mjs`
- Create: `tools/qa/evaluatePublishGate.test.mjs`
- Modify: `tools/qa/run-technical-qa.mjs`

**Interfaces:**
- Produces an explicit `AUTO_PUBLISH_READY`/blocked gate artifact only when factual, package, retention, narration, visual, technical, policy, and copyright checks are all represented and core scores are >=9.

- [ ] **Step 1:** Write failing tests for missing mandatory evidence, score <9, copyright/policy blockers, UNVERIFIED technical checks, and passing complete evidence.
- [ ] **Step 2:** Implement gate evaluation fail-closed.
- [ ] **Step 3:** Ensure producer/render code cannot self-approve subjective categories.
- [ ] **Step 4:** Run full verification.
- [ ] **Step 5:** Commit with `feat: add guarded publish-quality gate`.

### Task 5: Canary-aware autonomous publisher

**Files:**
- Modify: `youtube_uploader/uploader.py`
- Modify: `.github/workflows/upload-youtube.yml`
- Create: `tools/publish/publishController.mjs`
- Create: `tools/publish/publishController.test.mjs`
- Modify: `config/autonomy.json`

**Interfaces:**
- Consumes only publish-gate-passed episodes plus kill-switch/daily-control state.
- First two videos upload private, verify processing/metadata/thumbnail, then may be scheduled/public only if canary verification succeeds.

- [ ] **Step 1:** Write tests showing publisher refuses missing QA, paused publishing, exceeded daily quota, insufficient spacing, and unresolved canary verification.
- [ ] **Step 2:** Preserve private-only default in uploader while adding an explicit guarded visibility transition path that cannot be caller-overridden without gate evidence.
- [ ] **Step 3:** Add workflow inputs/state guards and upload verification output.
- [ ] **Step 4:** Test against dry-run/mocked YouTube calls before any real upload.
- [ ] **Step 5:** Commit with `feat: add canary-aware autonomous publisher`.

### Task 6: Analytics checkpoints and self-improvement records

**Files:**
- Create: `learning/channel-learning.schema.json`
- Create: `learning/experiments.schema.json`
- Create: `learning/channel-learning.json`
- Create: `learning/experiments.json`
- Create: `tools/analytics/checkpoints.mjs`
- Create: `tools/analytics/checkpoints.test.mjs`
- Create: `tools/analytics/learningStore.mjs`
- Create: `tools/analytics/learningStore.test.mjs`

**Interfaces:**
- Checkpoints: approximately 2h, 6h, 24h, 72h, 7d after publication.
- Lessons: `KEEP`, `CHANGE`, `AVOID`, `TEST_NEXT` with evidence, sample size, confidence, affected videos, and date.

- [ ] **Step 1:** Write tests for due-checkpoint calculation, idempotency, unavailable metrics, experiment sample thresholds, and lesson confidence updates.
- [ ] **Step 2:** Implement checkpoint and durable learning helpers.
- [ ] **Step 3:** Add analytics ingestion helper only if current OAuth scopes support verified metrics; otherwise fail closed with an explicit authorization blocker.
- [ ] **Step 4:** Run tests and commit with `feat: add analytics learning loop`.

### Task 7: Production controller and two-video daily throughput

**Files:**
- Create: `.github/workflows/production-controller.yml`
- Create: `tools/queue/dailyController.mjs`
- Create: `tools/queue/dailyController.test.mjs`
- Modify: `tools/orchestrator.mjs`

**Interfaces:**
- Priorities: finish daily minimum 2 → protect quality/spacing → prepare tomorrow queue → stretch third → non-critical experiments.

- [ ] **Step 1:** Write tests for daily-two priority, third-video suppression until minimum is credible, blocked episode replacement, and no quality-threshold mutation.
- [ ] **Step 2:** Implement deterministic controller and safe scheduled/action trigger.
- [ ] **Step 3:** Run simulated three-episode state transitions without media generation.
- [ ] **Step 4:** Commit with `feat: add daily production throughput controller`.

### Task 8: Automation prompt migration

**External state:** ChatGPT scheduled automations.

**Interfaces:**
- Existing jobs reused: Growth Intelligence, Episode Factory, Critic + Analytics.
- Only two new task slots are consumed: Publisher and Performance Learner.

- [ ] **Step 1:** Change Growth Intelligence cadence to every 4 hours and make it read/write the repository queue/learning control plane.
- [ ] **Step 2:** Update Episode Factory hourly prompt for multi-episode priority routing and GitHub Actions handoffs.
- [ ] **Step 3:** Re-enable and update Critic + QA hourly prompt as independent reviewer.
- [ ] **Step 4:** Create Publisher hourly condition-watch task.
- [ ] **Step 5:** Create Performance Learner hourly condition-watch task.
- [ ] **Step 6:** Verify all five tasks no-op safely when their prerequisites are absent.

### Task 9: Real two-video canary launch

**Files:** real `episodes/<id>/` packages and persistent workflow artifacts.

- [ ] **Step 1:** Select and produce the first real data-backed episode using current narrator and explicit scene direction.
- [ ] **Step 2:** Run real narration and render Actions; inspect logs, WAV, MP4, contact sheet, and QA artifacts.
- [ ] **Step 3:** Pass independent Critic gate.
- [ ] **Step 4:** Upload privately and verify YouTube processing/metadata/thumbnail.
- [ ] **Step 5:** Repeat with a second real episode.
- [ ] **Step 6:** Only after both pass, set `autoPublishEnabled: true` and `canaryVideosRemaining: 0`.
- [ ] **Step 7:** Verify kill switches once more before unattended public mode.
