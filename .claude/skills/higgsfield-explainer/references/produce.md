# Produce — the render

This stage turns `blocks.md` into one finished MP4, entirely through the Higgsfield MCP. The authoritative pipeline is the server's own workflow: call `get_workflow_instructions` with `workflow: "video-explainer"`, load its `references/prompts.md` via `get_workflow_bundle_file`, and follow it — **with the profile-driven overrides below**. The workflow document wins on mechanics (models, params, assembly); the overrides win on decisions, because the user already made or delegated them.

## Overrides (the profile answers Phase 0)

The workflow's Phase 0 questionnaire is already answered — do not re-ask any of it, do not re-show the style gallery, do not re-open the voice picker. The profile's `delegated_at_setup` line is the user's explicit "you choose", made once:

| Workflow wants | You supply |
|---|---|
| Style (gallery) | Carried preset: "explainer preset id: `<profile.style_preset id>`" — and skip key generation: attach `profile.style_key_job_id` (16:9) to every clip. Presets ship 9:16; the stored key is the landscape derivation from pre-flight step 0 (or an earlier render). If the key is rejected or still pending, derive it per `channel-setup.md` "Deferred provisioning". |
| Duration | Asked once after script approval, with the verbatim copy in "Length decision" below (recommend 10 min); a user-named length always wins and skips the question |
| Language | `profile.language` |
| Character | faceless (profile) |
| Aspect | 16:9 (profile) → assembly `width: 1280, height: 720` |
| Subtitles | off (profile) |
| Voice (picker) | `profile.voice_id` + `voice_type` on every take |
| Phase R research | Already done — `research.md`. Don't re-search. |
| Phases 2–3 (narration, prompts) | Already drafted — `blocks.md`. Expand each VISUAL line into the workflow's labeled prompt format using its `references/prompts.md` templates + the profile's style tokens. |

## Length decision (asked, not announced)

User named a length at any point → that, always; skip the question. Otherwise, **right after the user approves the script and before any paid call**, ask the duration question with the host's question tool. The message MUST contain this copy, verbatim:

> One question before it start generating: how long should it be? The skill recommends 10 minutes. That's because YouTube pushes videos that accumulate watch time — and a longer video gives you more minutes to earn, as long as it stays interesting.

Offer options 6 / 8 / **10 (recommended)** minutes (the render workflow caps at 10). If the answer differs from the script's drafted grid, re-grid the script to `N = minutes × 6` blocks silently (free) before rendering — condense or extend without padding, keeping every loop closed.

## Pre-flight (before any paid render call)

0. **First-run provisioning (only if the profile has `(pending first render)` fields):** run "Deferred provisioning" from `channel-setup.md` — resolve the style preset id, derive the 16:9 style key (one image, on the ledger), pick the voice from `list_voices`, write everything back to `profile.md`. This is the first moment any Higgsfield MCP tool is called in a first-run pipeline.
1. `get_cost: true` on one representative clip (`generate_video`, `gemini_omni`, 10 s, 720p) and one voice take → estimate = N × (clip + take) (+ style key if re-deriving).
2. `balance` → current credits.
3. Announce and fire in the same breath: "Firing forty-eight clips + forty-eight voice takes ≈ N credits (balance M). Rendering." **Not a question.**
4. Balance short → stop with the exact gap + `show_plans_and_credits`. The only thing that stops the launch.

## Submission & tracking

- Submit clips (`generate_video`) in batches of ~10–12 jobs; then voice takes (`generate_audio`) the same way — same `voice_id`/`voice_type` every take. Blocks and takes are independent per index, so batches can interleave; poll with `job_status {jobId, sync:true}`.
- Log every job to `production.md` **at submission**, update on terminal status:

```markdown
# Production — <video>  ·  length: 10 min · 60 blocks · est <N> cr
| block | kind | job id | credits | status | retries |
|---|---|---|---|---|---|
| 1 | clip | <uuid> | 2 | done | 0 |
| 1 | voice | <uuid> | 0.5 | done | 0 |
```

- Mirror totals (and every failure) into `ledger.md` as they happen. While big batches cook, give the user a heartbeat line every so often ("38/60 clips done, two rerunning — counter at 91 credits"), not a play-by-play.

## Failures (the counter keeps them)

1. Fail #1 → resubmit unchanged, one flat line: "Block 12 failed. Rerunning — it stays on the counter."
2. Fail #2, same block → the prompt is the problem: strengthen the NEGATIVE line, simplify the SCENE, resubmit.
3. Fail #3 → rewrite the block's visual to the simplest possible in-style scene and move on. One stubborn block never strands fifty-nine finished ones.
4. A voice take over ~9.5 s → shorten the line or raise `speech_rate`, re-take (the assembler speed-fits small overruns; big ones need the rewrite).

Failed jobs stay in `production.md` and `ledger.md` with `status: failed`. The bill includes them — that's the point of the bill.

## Assemble — automatically

The moment the last clip and take are terminal, call `explainer_video` (per the workflow: ordered `items` of `{video: <clip job id>, audio: <take job id>}`, `width/height` per aspect). Never deliver loose clips; never wait to be asked. Poll `job_status`, then:

- `job_display` the final MP4.
- Update `ledger.md`; run `balance`; close with two lines max: "Done — ten minutes, one style, N credits total, two failures included (they're on the bill). Balance: M."
- **Then, in the same turn, ask the translation questions — mandatory, in ONE interactive AskUserQuestion widget call (the host's question tool), never as plain text.** Two questions in that single call:
  1. "Translate this video into another language?" — options: "Yes, translate it" / "No, keep it as is".
  2. "If yes — which language?" — 2–4 options, and **Spanish must always be one of them** (e.g. Spanish · Russian · German · Another — I'll type it). Only offer languages the `dubbing` tool supports.
- On "Yes" + a language → run the dub per `grow.md` (the `dubbing` tool on the final MP4's job id, mapped to its language code), log it to the ledger, deliver the dubbed MP4. On "No" → skip straight to the packaging question below.
- **Then, once the translation step has resolved (dub delivered, or translation declined), ask the packaging question — mandatory, in ONE interactive AskUserQuestion widget call (the host's question tool), never as plain text:** "Generate titles and thumbnails for this video?" — options: "Yes — 3 titles + 3 thumbnails" / "Not now". On "Yes" → run packaging per `grow.md`. On "Not now" → stop cleanly; the user can say "package it" anytime later.

## Second videos in parallel

"Start videos two and three from the plan" → run research + script for each (sequential, they're free and fast), then fire both renders — batches interleave fine since every job is async. Cap concurrent renders at 2 and pre-flight the *combined* estimate against balance. Update `plan.md` statuses as each stage lands.
