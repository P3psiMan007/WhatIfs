# What If Explains — Autonomous Multi-Episode Video Factory Design

Date: 2026-08-07
Status: Approved concept, written-spec review pending
Owner goal: build a mostly unattended YouTube side-income system that produces fun, globally appealing curiosity explainers and optimizes for qualified views, watch time, repeat viewers, subscribers, and eventual revenue.

## 1. Success criteria

The factory targets **2 fully polished videos per day**, with a **3rd attempted only when it clears the exact same quality bar**. There is no quota-based quality downgrade.

A video counts toward the daily target only when it has:

- a strong, evidence-backed topic and packaging premise;
- a retention-focused script;
- approved production narration or an automatically evolved narrator that passed the experiment rules;
- deliberately authored scene direction rather than generic slide-like visuals;
- a completed 1920x1080 render with captions, sound design, and technical QA;
- packaging and metadata that pass the publishing gate;
- no unresolved factual, copyright, policy, advertiser-suitability, or technical blocker.

Initial narrator: `af_heart` via Kokoro at speed `0.95`. This is the starting baseline, not a permanent prohibition on experimentation.

## 2. Core operating principle

**ChatGPT automations make editorial/growth decisions. GitHub Actions perform deterministic heavy production work.**

ChatGPT crons should not repeatedly synthesize audio, render video, or maintain transient media. Their responsibilities are research, selection, criticism, experimentation, and state changes. GitHub Actions own repeatable build steps such as TTS, Remotion rendering, FFmpeg processing, technical QA, artifact retention, uploader execution, and machine-verifiable checks.

The repository is the durable shared control plane. Automations must not rely on conversational memory when repository state is available.

## 3. Queue architecture

Replace the single-active-episode bottleneck with a **3-slot production queue**.

Conceptual slots:

- **FINISH** — highest-priority episode: narration/render/QA/revision/publish gate.
- **PRODUCE** — researched/scripted episode being converted into voice + scene package.
- **PREPARE** — next data-driven topic being researched and packaged.

The queue is not a fixed binding to one stage. Every episode has its own state and revision. Slots are scheduling priorities only.

Suggested durable files:

```text
queue/production-queue.json
queue/daily-control.json
config/autonomy.json
learning/channel-learning.json
learning/experiments.json
episodes/<episode-id>/episode-state.json
```

`production-queue.json` contains episode IDs, priority, desired daily role, state, revision pointer, blockers, and last activity. `daily-control.json` tracks the current production date, minimum target 2, stretch target 3, how many videos reached publishable/published state, and whether the stretch attempt is allowed. Each episode keeps its own revision-safe state file so one bad episode never blocks the others.

### Concurrency rules

1. Every episode-state write supplies the revision read and increments by exactly one.
2. A writer may modify only the episode ID it read.
3. Queue writes use their own revision number and optimistic concurrency.
4. A failed episode is quarantined/revised; the next viable episode may continue.
5. No automation may count a QA failure as one of the daily two.
6. The optional third begins only after the system has credible capacity to finish the first two without lowering any threshold.

## 4. Episode state model

Per-episode lifecycle:

```text
SELECTED
→ RESEARCHED
→ SCRIPTED
→ VOICE_READY
→ ART_DIRECTED
→ RENDER_READY
→ RENDERED
→ QA_FAILED | QA_PASSED
→ PUBLISH_GATE_FAILED | AUTO_PUBLISH_READY
→ PRIVATE_CANARY | SCHEDULED | PUBLISHED
→ ANALYTICS_DUE
→ ANALYZED
```

Block states may include `RESEARCH_BLOCKED`, `VOICE_BLOCKED`, `ASSET_BLOCKED`, `RENDER_BLOCKED`, `POLICY_BLOCKED`, and `COPYRIGHT_BLOCKED`.

The existing voice-audition states remain useful for future narrator experiments, but the default production path may skip recurring voice auditions because the user selected `af_heart` as the current channel narrator.

## 5. Growth and topic selection

The growth system keeps enough strong candidates to prevent starvation while avoiding topic spam.

Candidate scoring remains evidence-driven and should consider:

- universal curiosity;
- title/open-loop strength;
- thumbnail mystery;
- paradox/surprise;
- first-30-second hook potential;
- escalation/story potential;
- visual storytelling potential;
- evidence depth;
- novelty/timing;
- saturation;
- advertiser suitability;
- misleading-packaging risk;
- prior channel performance for related topic families.

A low-scoring idea is rejected even if production capacity is idle. The system should rather produce 2 excellent videos than force a third weak one.

The selected topic stores exactly three paired title/thumbnail packages. Package alternatives must represent genuinely different hypotheses, not cosmetic wording changes.

## 6. Script and retention system

The script system optimizes for **click → satisfied watch**, not click alone.

Required behavior:

- no greeting/logo intro/throat-clearing;
- premise and curiosity gap established immediately;
- first 20–30 seconds pay off the title/thumbnail promise while opening a stronger loop;
- recurring question → evidence → answer → reversal/new question progression;
- concrete examples and visualizable consequences;
- repetition/dead-transition deletion pass;
- personal payoff near the ending;
- full fact ledger with stronger evidence for claims that drive title, hook, twist, or ending.

Scripts may be rewritten automatically when Critic scoring is below threshold.

## 7. Visual quality system

The current generic keyword-mapped renderer is retained only as a fallback/debug tool. It is **not sufficient for publishable production**.

The production scene manifest must support explicit art direction, including where applicable:

- scene type and visual purpose;
- subject identity;
- character pose and expression;
- character placement/scale;
- prop placement/scale;
- foreground, midground, and background layers;
- environment;
- palette/accent;
- visual metaphor;
- diagram/number/contrast treatment;
- camera framing and movement;
- animation/motion beats;
- transition anchor for real match cuts;
- caption text and placement;
- SFX cue;
- required original/generated/licensed assets;
- exact new information communicated by the shot.

The visual director should prefer one strong visual idea per scene, custom physical storytelling, controlled motion, and scene-to-scene variety. Repetitive cards, dashboards, icon grids, endless kinetic text, generic particles, tiny subjects, large unexplained empty areas, and PowerPoint sequencing are publish blockers when they materially reduce quality.

## 8. Voice and sound

Baseline narrator:

```json
{
  "provider": "kokoro",
  "model": "onnx-community/Kokoro-82M-v1.0-ONNX",
  "voiceId": "af_heart",
  "speed": 0.95,
  "language": "en-US"
}
```

Narration generation requires pronunciation preparation and mechanical audio QA. The sound mix must preserve intelligibility and keep narration dominant.

The autonomous evolution system may eventually test alternate narrator voices, speeds, or delivery settings. Narrator replacement requires a controlled experiment and materially stronger channel evidence; one weak video can never cause a voice swap.

## 9. QA and auto-publish gate

A render is not publishable merely because it exists.

Mandatory gates:

### Factual
- consequential claims supported;
- uncertainty wording preserved;
- counterfactual/speculative claims clearly framed;
- no title promise contradicted by evidence.

### Packaging
- three paired title/thumbnail hypotheses exist;
- default package has one clear curiosity mechanism;
- phone-size thumbnail readability;
- no deceptive promise;
- script satisfies package promise.

### Retention
- first 30 seconds reviewed sentence-by-sentence;
- no dead intro;
- curiosity resets and escalation present;
- weak/repetitive sections revised.

### Narration/audio
- intelligible and natural enough for long-form listening;
- pronunciation acceptable;
- no clipping, long silence, duplicate phrases, or obvious generation corruption;
- music/SFX do not mask speech.

### Visual
- full render/contact sheet inspected;
- no broken/missing assets;
- no black/frozen/dead frames;
- captions stay in safe bounds;
- deliberate scene direction and adequate variety;
- no major style drift.

### Technical
- valid 1920x1080 output;
- expected FPS/duration;
- usable audio/video streams;
- sync and render integrity;
- no unresolved ffmpeg/Remotion errors.

### Policy/monetization/copyright
- advertiser-suitability review;
- no unlicensed music or copied creator assets;
- no misleading metadata;
- darker subjects contextualized rather than gratuitously graphic.

Core creative categories must score **>= 9/10**. Any hard blocker prevents publishing.

## 10. Autonomous publishing and canary

Owner authorization: autonomous publication is permitted after all gates pass.

The first **two production videos** use a canary procedure:

1. upload as private;
2. wait for YouTube processing;
3. verify the processed video/metadata/thumbnail are present and structurally correct using available APIs/checks;
4. re-run machine-verifiable publish checks;
5. only then make public/schedule if no blocker exists.

After two successful canaries, `config/autonomy.json` may unlock normal auto-publishing.

Required kill switches:

```json
{
  "autoPublishEnabled": false,
  "canaryVideosRemaining": 2,
  "dailyMinimum": 2,
  "dailyStretch": 3,
  "pauseAllProduction": false,
  "pausePublishing": false
}
```

The user can disable publishing or all production with a single config change. Failed policy/copyright/security checks automatically set `pausePublishing: true` until the cause is understood.

## 11. Upload timing

The production target and upload target are separate. The factory may finish videos at any hour but should publish/schedule them based on performance evidence.

Until the channel has enough history, avoid posting multiple videos back-to-back. Maintain spacing between the two required daily videos. Once audience analytics become meaningful, the system may experiment with publication windows and spacing.

A third video is published only when it passes the same gates and the experiment controller believes the extra upload is unlikely to cannibalize the two required videos.

## 12. Self-improvement and experiments

The factory is allowed to evolve:

- topic mix;
- title patterns;
- thumbnail composition;
- hook structure;
- pacing;
- episode duration;
- visual grammar;
- scene density;
- narrator/voice settings;
- sound design patterns;
- publication time/spacing;
- series structure;
- metadata/description conventions.

It must evolve through experiments, not uncontrolled drift.

### Analytics checkpoints

For each published video, store due checkpoints approximately at:

- 2 hours;
- 6 hours;
- 24 hours;
- 72 hours;
- 7 days.

Use whatever verified YouTube metrics are available. Preferred evidence includes impressions, Home/Suggested CTR, traffic source, first-30-second retention, average view duration, average percentage viewed, retention dips/spikes, subscriber conversion, returning viewers, thumbnail test results, and revenue/RPM once available.

### Learning model

Persist lessons as:

- `KEEP` — repeatedly supported pattern;
- `CHANGE` — pattern with evidence of weakness;
- `AVOID` — repeated failure or policy/quality risk;
- `TEST_NEXT` — hypothesis not yet proven.

Every lesson records evidence, sample size, confidence, affected videos, and date. The system must distinguish correlation from causation and avoid major channel changes from tiny samples.

### Experiment rules

- Prefer one material variable per experiment where possible.
- Record baseline, hypothesis, metric, guardrail, sample threshold, success/failure rule, and rollback before applying a significant change.
- Native YouTube thumbnail testing should be preferred when eligible.
- Optimize for satisfied watch time and long-term growth, not CTR in isolation.
- A test that increases CTR but harms retention/watch time is not automatically a winner.

## 13. Cron / automation architecture

Use **five ChatGPT automations** plus GitHub Actions for mechanical execution.

### Cron 1 — What If Queue + Growth Intelligence

**Cadence:** every 4 hours, `condition_watch`.

Responsibilities:

- read queue, daily control, learning, and experiment state;
- check current public trend/opportunity data when queue capacity exists;
- keep up to three high-confidence episodes in the pipeline;
- select only when a queue slot is open;
- produce three paired packages for new selections;
- assign experiment hypotheses where appropriate;
- never render or publish.

No-op when queue is healthy and no meaningful intelligence changed.

### Cron 2 — What If Episode Factory

**Cadence:** hourly, `condition_watch`.

Responsibilities:

- advance the highest-priority eligible episodes;
- research/fact ledger;
- script/rewrite;
- art direction and scene manifest;
- ensure narrator config/pronunciation inputs;
- commit durable production inputs;
- hand deterministic heavy jobs to GitHub Actions;
- inspect returned artifacts/state and continue;
- never bypass QA/publish gate.

The factory may advance different episodes on different runs so FINISH, PRODUCE, and PREPARE overlap.

### Cron 3 — What If Critic + QA

**Cadence:** hourly, `condition_watch`.

Responsibilities:

- independently inspect changed scripts/renders/packaging;
- reject factual, retention, narration, visual, technical, policy, or packaging weaknesses;
- write prioritized required fixes;
- set `QA_PASSED` only when every mandatory gate is satisfied;
- never publish.

This role must remain separate from the Factory so the producer cannot approve its own work.

### Cron 4 — What If Publisher

**Cadence:** hourly, `condition_watch`.

Responsibilities:

- act only on `QA_PASSED` episodes;
- run final metadata/package/policy/copyright checks;
- enforce daily quota and spacing rules;
- execute two-video canary policy before full auto-publishing unlock;
- upload/schedule/publish through the deterministic uploader workflow;
- record YouTube video ID, chosen package, publication time, and experiment assignment;
- fail closed on uncertainty.

No-op when no episode is publishable or spacing/quota says wait.

### Cron 5 — What If Performance Learner

**Cadence:** hourly, `condition_watch`.

Responsibilities:

- check only analytics checkpoints that are actually due;
- fetch verified metrics when available;
- diagnose topic/package/hook/pacing/visual/voice/timing performance;
- update `KEEP/CHANGE/AVOID/TEST_NEXT` learning records;
- close or continue experiments using predeclared rules;
- feed lessons into Queue + Growth Intelligence;
- avoid overreacting to tiny samples.

The hourly cadence is a scheduler convenience; most runs should no-op because no checkpoint is due.

## 14. GitHub Actions architecture

GitHub Actions own the heavy and deterministic stages.

Required workflows after implementation:

- CI/test/build/security smoke on factory changes;
- narration generation;
- render/finalize/contact-sheet/technical QA;
- asset/mechanical validation as needed;
- private-canary/upload workflow;
- analytics ingestion/helper workflow if API scopes and credentials support it.

Workflows should be triggerable by state/input commits and/or safe schedules so the system does not depend on a human pressing "Run workflow". State-mutating workflows require revision/episode guards.

Actions artifacts retain WAVs, MP4s, contact sheets, logs, and reports long enough for QA and debugging. The repository stores manifests/state, not unnecessary binary history.

## 15. Failure behavior

Fail closed rather than publish questionable work.

Examples:

- bad premise → `RESEARCH_BLOCKED` and replace with another queue candidate;
- weak script → automatic rewrite loop;
- poor narration → regenerate/fix pronunciation/voice settings;
- weak visual scene → targeted scene/art-direction revision;
- render failure → rerun only after diagnosis;
- QA failure → return to the exact owning stage;
- copyright/policy uncertainty → block publication;
- analytics unavailable → record unavailable, never invent data;
- API/auth failure → production may continue, publishing pauses if the failure prevents safe verification.

## 16. Daily throughput controller

The scheduler prioritizes in this order:

1. unblock/finish videos required to reach daily minimum 2;
2. preserve quality and spacing for those two;
3. prepare tomorrow's queue;
4. attempt the third only after the first two are credibly on track or completed;
5. run non-critical experiments without jeopardizing the minimum-quality pipeline.

A day with two excellent videos is success. A day with two excellent videos plus one equally strong third is stretch success. Three mediocre videos is failure.

## 17. Scope boundaries

This design authorizes autonomous evolution and autonomous publishing after the canary and quality gates. It does **not** authorize:

- buying paid assets/services without separate permission;
- copying another creator's artwork, script, private/custom voice, or music;
- bypassing YouTube policy/copyright restrictions;
- fabricating analytics or verification;
- intentionally lowering the QA threshold to hit quota.

## 18. Implementation order

1. finish independent audit/fixes of PR #1;
2. add cloud narration + real CI verification;
3. introduce per-episode state + queue/daily/autonomy configs;
4. upgrade explicit art-direction schema and renderer support;
5. add deterministic production controller workflows;
6. add Critic-compatible QA artifacts and publish gate;
7. convert uploader from private-only manual path into canary-aware guarded publisher while preserving the kill switch;
8. add analytics/learning storage and checkpoint logic;
9. update the five ChatGPT automations to use the repo control plane;
10. run first two real videos through private canary;
11. unlock autonomous public publishing only after both canaries pass.

## 19. Verification before autonomous launch

Autonomous public mode is not considered ready until:

- repo CI passes on Linux;
- actual Kokoro narration workflow succeeds in GitHub Actions;
- a real Remotion render succeeds in GitHub Actions;
- artifacts can be retrieved and inspected;
- multi-episode revision/race tests pass;
- publisher cannot act on failed/missing QA;
- kill switches work;
- private upload and YouTube processing verification work;
- two real production canaries pass end-to-end;
- no automatic path can silently skip factual, visual, audio, technical, or publishing gates.
