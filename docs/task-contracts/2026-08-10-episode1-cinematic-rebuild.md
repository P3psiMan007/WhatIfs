# Episode 1 cinematic rebuild task contract

## Goal

Produce one new, fully verified private-ready render of Episode 1 that passes every core QA category at 9/10 or above with no major blocker.

## Exact source of truth

`origin/main` at `5933399`, specifically `episodes/current/production-input.json`, `video/src/cinematic-full-episode.jsx`, and the failed independent review `episodes/current/independent-qa-review-31325045813.json`.

## Constraints

Use the approved pre-editorial cinematic language; preserve Kokoro `af_heart` at `0.95` with `continuous-v2`; do not use Higgsfield, am_michael, Brian, or any fallback voice. The rejected private video `3EGJqkrn42A` remains private. Reuse the approved verified ChatGPT Images thumbnail only. Remove the visual motifs named in the failed review.

## Approval gate

The user has explicitly approved continuation and this visual direction. No upload may occur until a new exact-artifact independent QA report passes all core gates.

## Success checks

Full 1080p render, frame/contact-sheet review across all nine sections, technical/narration/factual/package/policy/copyright QA, exact-artifact provenance, and private YouTube playback/privacy/metadata/thumbnail verification.

## Final handoff

Report done, evidence, remaining uncertainty, and next action. Only provide a new private link if it has been verified.
