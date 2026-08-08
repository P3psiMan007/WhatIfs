# Factory V2 Upgrade Design

Date: 2026-08-08
Status: Approved design awaiting written-spec review
Owner goal: maximize legitimate YouTube views and channel income by producing high-quality, authored videos quickly and publishing them automatically only when they meet a strict quality bar.

## 1. Why this upgrade exists

The current factory can research, script, narrate, render, QA, and prepare YouTube uploads, but several parts are too indirect or brittle:

- finished renders live in GitHub Actions artifacts while the uploader expects a repository-local MP4;
- production can wait for scheduled runs instead of immediately starting the next step after a fix;
- upload verification is incomplete and public promotion is manually/hard-code blocked;
- asset sourcing is mostly bespoke/local and does not yet have a safe, automated external-asset router;
- QA can identify problems, but the system is not yet structured around targeted timestamp-level repairs;
- analytics are not yet a first-class feedback loop for future topic, hook, thumbnail, and pacing decisions.

Factory V2 keeps the existing bespoke What If Explains production system and replaces only the weak links. It does not adopt a generic “AI video generator” architecture.

## 2. Product principles

Priority order:

1. viewer satisfaction and legitimate views;
2. creative quality;
3. speed of iteration;
4. reliability and rights safety;
5. automation elegance.

The factory must never treat “render succeeded” as equivalent to “video is good.”

Every episode should feel authored, not mass-produced. Automation should remove waiting and repetitive work, not remove editorial judgment.

Higgsfield is out of scope and must not be used in this project.

## 3. Locked user decisions

### Asset policy

- Free, public-domain, or clearly commercial-use assets may be acquired and used automatically.
- Paid assets require explicit user approval before purchase or use.
- Assets with unclear licensing are rejected.
- Every third-party asset must store durable source and rights evidence in an episode asset manifest.

### QA policy

Use balanced self-repair:

- automatically fix defects that materially hurt retention, clarity, credibility, clickability, pacing, factual accuracy, technical quality, policy safety, or copyright safety;
- do not spend excessive cycles on tiny imperfections that do not affect the viewer experience;
- targeted repairs are preferred over full rebuilds.

### Public-publishing threshold

A video may become public automatically only when:

- every required core QA gate scores at least 9.0/10;
- there are zero major/publish-blocking findings;
- the exact uploaded asset has been verified successfully on YouTube;
- required metadata and thumbnail checks pass;
- publishing is not paused.

## 4. Architecture

Factory V2 is split into four bounded subsystems implemented in this order.

### A. Publishing Backbone

Purpose: move the exact QA-approved render artifact to YouTube with no manual file shuffling and prove that the upload is healthy before making it public.

Responsibilities:

- accept an exact render run ID and artifact name;
- download `episode-render` from the source GitHub Actions run;
- identify the canonical MP4 and thumbnail from that artifact;
- validate checksums/manifest identity so QA and publishing refer to the same render;
- upload the video as private;
- set title, description, tags/category, thumbnail, and audience settings;
- persist the YouTube video ID;
- poll YouTube until processing is complete or a terminal failure occurs;
- verify privacy status, title, description/package identity, thumbnail state when the API can prove it, and processing status;
- write a durable publication record;
- promote the same verified video to public when all publication gates are satisfied.

The first upload step remains private by design. “Private first” is a verification stage, not a multi-video canary requirement.

The current rule requiring two separate private videos before any public publishing will be replaced with a per-video verification gate because the user explicitly approved automatic publishing after QA.

### B. Creative QA and Repair Loop

Purpose: convert QA from a one-shot scorecard into a practical editor loop.

The critic operates on the full rendered video plus structured timeline metadata and returns timestamped findings.

Each finding contains:

- start/end timestamp;
- gate/category;
- severity;
- viewer-impact explanation;
- likely root cause;
- smallest recommended repair;
- whether the repair requires narration, captions, visuals, timing, metadata, or full-scene work.

Repair policy:

- factual or rights failures always block publication;
- major retention/pacing/clarity defects trigger automatic targeted repair;
- minor aesthetic issues may be recorded without forcing another render;
- rerender only changed segments/data where the current Remotion architecture allows it, while the final deliverable remains a full canonical render;
- after any material repair, immediately trigger the next factory run instead of waiting for schedule;
- avoid duplicate runs when an equivalent run is already active.

The QA loop stops when either:

1. all required gates are >= 9.0 and no blockers remain; or
2. the factory reaches a bounded repair-attempt limit for the same unresolved issue and records a precise blocker instead of looping forever.

Initial recommended bound: 3 automatic repair attempts per materially identical finding before escalation.

### C. Asset Router and Rights Ledger

Purpose: improve visual quality without turning videos into generic stock-footage compilations.

The router chooses among:

1. bespoke Remotion/SVG/D3 visuals;
2. ChatGPT Images for hero images and thumbnails;
3. free/public-domain/commercial-use real media;
4. user-approved paid media.

Preferred free sources may include providers such as Wikimedia Commons, Openverse, Internet Archive, Pexels, and Pixabay when their current asset-specific terms permit the intended commercial use.

For every external candidate the router must evaluate:

- semantic relevance to the exact visual beat;
- resolution/aspect ratio;
- visible watermark/logos where inappropriate;
- source reliability;
- license/usage rights;
- attribution requirements;
- duplication/repetition risk;
- whether a bespoke visual would communicate the idea better.

Low-relevance candidates are automatically rejected and another source or custom visual is tried.

Each accepted asset gets a manifest entry containing at minimum:

- asset ID;
- episode/beat ID;
- local file/checksum;
- source URL;
- source/provider;
- creator when available;
- license name;
- license evidence URL/text reference;
- commercial-use status;
- attribution requirement;
- acquisition timestamp;
- verification status.

If rights cannot be proven, the asset cannot enter a public render.

### D. Analytics Brain

Purpose: make published results improve the next video instead of simply collecting vanity metrics.

At defined checkpoints after publication, collect the metrics available through YouTube APIs/analytics permissions, including where available:

- impressions;
- CTR;
- views;
- watch time;
- average view duration;
- audience retention curve/key drop-offs;
- traffic sources;
- subscriber change;
- package/title/thumbnail experiment data when available.

Recommended checkpoints:

- early signal: 24 hours;
- stabilization: 72 hours;
- learning snapshot: 7 days.

The analytics output should produce a short decision record:

- KEEP: elements supported by the data;
- CHANGE: elements likely hurting performance;
- AVOID: patterns that repeatedly underperform;
- TEST NEXT: one or two concrete experiments for the next episode.

Analytics must inform future topic selection, hook construction, title/package choice, thumbnail composition, pacing, and scene density. It must not automatically chase noisy short-term metrics when sample sizes are too small.

## 5. End-to-end data flow

```text
Demand/topic research
        ↓
3 title + thumbnail packages
        ↓
Research + fact ledger
        ↓
Story structure + script
        ↓
Beat-by-beat visual plan
        ↓
Asset router
(custom graphics / ChatGPT Images / licensed media)
        ↓
Voice + captions
        ↓
Canonical render artifact
        ↓
Full-video critic
        ↓
Timestamped findings
        ↓
Targeted repair
        ↓
Immediate rerender trigger
        ↓
Independent QA >= 9.0 on every required gate
        ↓
Download exact approved artifact
        ↓
Upload PRIVATE
        ↓
YouTube processing + metadata verification
        ↓
Promote same video PUBLIC
        ↓
24h / 72h / 7d analytics
        ↓
Lessons feed next episode
```

## 6. State and records

Existing `episode-state.json` remains the canonical production-state record.

Add or normalize the following durable records:

- render identity: run ID, artifact ID/name, checksum, render-manifest checksum;
- asset-rights manifest;
- timestamped critic findings and repair history;
- YouTube publication record containing video ID, privacy transitions, verification results, chosen package, upload time, public time, and source render identity;
- post-publication analytics snapshots and resulting lessons.

A publication record must never claim success without a real YouTube video ID returned by the API.

## 7. Immediate-trigger behavior

Scheduled workflows remain only a fallback/recovery mechanism.

Normal behavior after a completed fix is:

`fix → commit/merge → immediate watched push/event → render/QA`

The factory should not deliberately sleep until the next hourly/scheduled window.

Duplicate work should be prevented with concurrency/idempotency checks based on episode ID + source revision/render identity.

## 8. Failure handling

The system fails closed for publication but not for production.

Examples:

- render failure: retry only if the failure is transient; otherwise record the exact command/log blocker;
- asset license uncertainty: reject asset and try another route;
- bad visual match: reject candidate and try another asset/custom illustration;
- YouTube upload interruption: use resumable upload/retry where safe;
- YouTube processing failure: keep video private and record API failure reason;
- thumbnail upload failure: keep private; retry/repair before public;
- metadata mismatch: correct while private and reverify;
- QA score below 9: repair and rerender when material;
- repeated identical QA failure after bounded attempts: stop the loop and surface one precise blocker.

No failure may silently downgrade the public-quality threshold.

## 9. Testing strategy

### Unit tests

- publication-gate evaluation;
- QA score/blocker evaluation;
- artifact identity/checksum matching;
- asset-license acceptance/rejection;
- critic finding normalization/deduplication;
- repair-attempt limits;
- analytics decision-record schema.

### Integration tests

- workflow downloads a synthetic render artifact from another run or mocked equivalent;
- uploader performs private-upload flow against mocked YouTube API objects;
- verification polls through processing states correctly;
- public promotion cannot occur before all gates pass;
- public promotion occurs for the same verified video ID after all gates pass;
- ambiguous/unlicensed asset is rejected;
- immediate trigger does not create duplicate equivalent runs.

### Regression tests

Keep existing Episode 1 visual/script/thumbnail guards and add tests ensuring the old Edge narration route cannot silently return as the canonical commercial narration provider.

### Live canary

For the first real Factory V2 publication:

1. upload the QA-approved episode private;
2. verify API status, processing, metadata, and thumbnail;
3. verify the publication record points to the exact approved render;
4. promote that same video public automatically;
5. verify final public privacy state through API;
6. persist the public URL/video ID before reporting completion.

## 10. Rollout order

### Phase 1 — Publishing Backbone

Fix artifact handoff, YouTube verification, durable publication records, private-first verification, and automatic public promotion.

### Phase 2 — Creative QA Loop

Introduce timestamped critic findings, bounded targeted repair, immediate rerender triggering, and deduplication.

### Phase 3 — Asset Router

Add external free/commercial-use media discovery, relevance scoring, rights manifest, and paid-asset approval boundary.

### Phase 4 — Analytics Brain

Add 24h/72h/7d snapshots and explicit feedback into future editorial decisions.

Each phase must leave the existing factory usable even if later phases are not yet complete.

## 11. Success criteria

Factory V2 is successful when:

- a QA-approved render can move from GitHub Actions artifact to a verified public YouTube video without manual file handling;
- the exact published video can be cryptographically/structurally traced back to the QA-approved render;
- public publishing is impossible below the 9.0-per-gate threshold or while a major blocker exists;
- fixes trigger the next production iteration immediately rather than waiting for a schedule;
- the system can automatically reject bad or legally unclear external assets;
- paid assets always require user approval;
- full-video QA produces actionable timestamped repairs instead of only global scores;
- repeated QA loops are bounded and idempotent;
- post-publication analytics change concrete decisions for subsequent episodes;
- no completion claim is made without a verified YouTube video ID/public state.

## 12. Explicit non-goals for this upgrade

- building a generic multi-channel “content farm” system;
- maximizing upload count at the expense of quality;
- fully replacing human/editorial judgment with one model score;
- purchasing paid media or services automatically;
- using unclear-license voices, footage, music, images, or other assets;
- using Higgsfield;
- rewriting unrelated parts of the repository simply for architectural cleanliness.
