# Episode 1 Full Cinematic Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with tests and verification before completion.

**Goal:** Rebuild Episode 1 in the user-approved cinematic style with continuous `af_heart` narration, pass all QA gates, and upload the exact approved render privately to YouTube.

**Architecture:** Keep the existing producer/state/publisher pipeline, replace only the visual beat owner with a cinematic scene renderer, repair the factory's stale narrator checks, and preserve measured scene/beat timing. Reuse the approved cinematic benchmark visual grammar and maintain one visual owner per beat.

**Tech Stack:** Remotion/React, Node.js, Kokoro 0.9.4, FFmpeg/ffprobe, GitHub Actions, existing Python YouTube publisher.

## Global Constraints
- Never use Higgsfield.
- Narrator is exactly `af_heart` at speed `0.95`; no fallback.
- User-approved style is the cinematic benchmark before editorial.
- Core QA gates >=9/10 and zero major blockers before upload.
- Final upload is PRIVATE until verified; rejected video `3EGJqkrn42A` stays private.
- Use the approved verified ChatGPT Images thumbnail override.

### Task 1: Repair narration/factory contract
- Add tests that require `af_heart`, speed 0.95, whole-scene flow, and no Brian/Michael fallback.
- Update producer payload to carry explicit `provider`, `voice`, and `speed`.
- Trim only edge silence in the Kokoro batch renderer.
- Update Episode Factory dependency install/validation to Kokoro and remove stale Edge-only assertions.

### Task 2: Add full cinematic visual owner
- Add a cinematic beat renderer with scene-specific visual families and motivated camera motion.
- Keep the approved cinematic benchmark treatment for the hook and hero photographic beats.
- Replace `SleepAssetScene` in the episode renderer; keep the thumbnail renderer unchanged.
- Add tests rejecting old SVG/doodle ownership in `WhatIfEpisode` and requiring continuous cinematic ownership.

### Task 3: Invalidate rejected state and rebuild
- Persist canonical `af_heart` narrator config and mark old render/QA state for regeneration.
- Merge only after PR CI is green.
- Let the merge trigger Episode Factory immediately; inspect logs and repair repo-fixable failures.

### Task 4: Inspect exact render and independent QA
- Download the exact `episode-render` artifact.
- Inspect contact sheets and representative frames from every section plus transitions.
- Run black-frame, audio, duration, codec, caption-boundary, voice-marker, loudness, and repetition checks.
- Iterate once or more if any major visual/narration issue remains.
- Require independent QA scores >=9/10 in every core category.

### Task 5: Verified private YouTube upload
- Trigger the existing gated upload workflow only for the exact QA-approved artifact.
- Verify processing, title, approved thumbnail, private visibility, playback, and exact render identity.
- Persist the new video ID/link and notify the user only when that verified private link exists, or if a genuine owner-only action is required.
