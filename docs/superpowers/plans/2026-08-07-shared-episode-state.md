# Shared Episode State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the three What If Explains automations and the Claude/GitHub production runner one durable, conflict-safe source of truth for the current episode.

**Architecture:** Store current episode state in `episodes/current/episode-state.json`, validate its structure with a JSON Schema, and mutate it only through a revision-checked CLI. GitHub Actions runs tests on every relevant change. Automation prompts should prefer this file whenever repository access is available and NOOP rather than infer state if it cannot be read.

**Tech Stack:** JSON, JSON Schema draft 2020-12, Node.js 22, GitHub Actions.

## Global Constraints

- Pipeline version is `2.1`.
- No automation may publish a YouTube video.
- `QA_PASSED_AWAITING_USER_APPROVAL` is the highest autonomous state.
- Every mutation increments `state_revision`.
- Stale-revision and wrong-episode writes must fail.
- No secrets, OAuth tokens, API keys, cookies, or generated large video files go into Git.

---

### Task 1: Add durable state and schema

**Files:**
- Create: `episodes/current/episode-state.json`
- Create: `episodes/episode-state.schema.json`

- [ ] Copy both supplied files into the repository.
- [ ] Run `node -e "JSON.parse(require('fs').readFileSync('episodes/current/episode-state.json','utf8'))"`.
- [ ] Commit with `git commit -m "feat: add shared episode state"`.

### Task 2: Add revision-safe mutation CLI

**Files:**
- Create: `tools/episode-state.mjs`
- Create: `tools/episode-state.test.mjs`

- [ ] Run `node --test tools/episode-state.test.mjs`.
- [ ] Verify all tests pass.
- [ ] Use `node tools/episode-state.mjs show` to inspect state.
- [ ] Commit with `git commit -m "feat: add episode state guard"`.

### Task 3: Add CI validation

**Files:**
- Create: `.github/workflows/episode-state-guard.yml`

- [ ] Copy the supplied workflow.
- [ ] Push a branch and confirm `Episode State Guard` passes.
- [ ] Commit with `git commit -m "ci: validate episode state"`.

### Task 4: Wire automations and production runner

- [ ] Make every worker read `episodes/current/episode-state.json` first when repo access exists.
- [ ] Refuse to act if `episode_id` or `state_revision` no longer matches the value read at start.
- [ ] Growth may create a new episode only from `IDLE` or `ANALYZED`.
- [ ] Factory may only mutate production data plus allowed production states.
- [ ] Critic may only mutate QA, analytics, and voice-selection state.
- [ ] Keep publication manual.
- [ ] Verify a dry-run lifecycle through `SELECTED -> SCRIPTED -> VOICE_AUDITIONS_READY` without any public upload.

### Task 5: Verify conflict handling

- [ ] Start two local processes from the same revision.
- [ ] Let the first write succeed.
- [ ] Confirm the second fails with `revision conflict`.
- [ ] Confirm a worker using the wrong episode ID fails with `episode mismatch`.
- [ ] Confirm the repo contains no secrets or large render outputs.
