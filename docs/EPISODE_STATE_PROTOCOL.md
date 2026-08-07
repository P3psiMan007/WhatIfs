# What If Explains — Shared Episode State Protocol

Single source of truth for episode lifecycle: `episodes/current/episode-state.json`.

Canonical publishing controls: `config/autonomy.json` and `queue/daily-control.json`.

## Ownership

- **Growth Intelligence** owns `growth.*` and may create a new episode only from `IDLE` or `ANALYZED`.
- **Episode Factory** owns `production.*` and production states.
- **Critic + Analytics** owns `qa.*`, `analytics.*`, and voice selection.
- **Guarded Publisher** may upload/publish only when the canonical autonomy/control-plane files explicitly permit it and all required publish-gate evidence is present and passing.
- **User** remains the ultimate publication authority and may pause or revoke autonomy at any time through the kill switches.

## State machine

`IDLE -> SELECTED -> RESEARCHED -> SCRIPTED -> VOICE_AUDITIONS_READY -> VOICE_SELECTED -> VOICE_READY -> RENDERED -> QA_PASSED -> AUTO_PUBLISH_READY -> PUBLISHED -> ANALYZED`

`QA_PASSED_AWAITING_USER_APPROVAL` remains accepted as a legacy compatibility state but is not sufficient for autonomous publishing unless the canonical publishing controls and publish-gate evidence also authorize the action.

Allowed block/reject branches include `RESEARCH_BLOCKED`, `VOICE_BLOCKED`, `QA_FAILED_VOICE`, and `QA_FAILED`.

## Concurrency rules

1. Every episode-state write increments `state_revision` by exactly 1.
2. Writers must supply the revision they read.
3. If the on-disk revision changed, abort rather than overwrite.
4. Never update an `episode_id` that differs from the one read.
5. Every write appends a compact history record.
6. If canonical state/control files are accessible, automations must use them rather than memory.
7. If a required canonical file is inaccessible, missing, stale, contradictory, or cannot be verified, NOOP rather than inventing state.

## Guarded publication rule

Autonomous publication is allowed only through the repository's quality gates, canary rules, daily controls, and kill switches.

- If `config/autonomy.json` or `queue/daily-control.json` is missing, NOOP.
- If `pausePublishing` or `pauseAllProduction` is true, NOOP.
- Never infer readiness from a render existing. An episode must be explicitly `QA_PASSED` or `AUTO_PUBLISH_READY` and have complete passing publish-gate evidence.
- Required factual, package, retention, narration, visual, technical, policy, and copyright gates must pass, and required core scores must meet the configured threshold.
- The selected title/thumbnail pair and metadata must accurately match the video.
- Daily quota and minimum spacing must be respected.
- The first two real videos are canaries and must upload **private only**. Canary count decreases only after YouTube processing, metadata, thumbnail integrity, and machine-verifiable checks succeed.
- Public or scheduled publishing is allowed only after the canary requirement is complete and `autoPublishEnabled` is true.
- All uncertainty fails closed. Never bypass kill switches, fabricate verification, spend money, or publish a failed episode.
- Publication records must be revision-safe and include the YouTube video ID, chosen package, publication/schedule time, and experiment assignment.
