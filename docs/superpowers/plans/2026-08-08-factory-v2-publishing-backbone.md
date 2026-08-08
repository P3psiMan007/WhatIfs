# Factory V2 Publishing Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the exact QA-approved render artifact from GitHub Actions to a verified private YouTube upload, then automatically promote that same video ID to public only after every required QA gate is at least 9.0/10 and all upload checks pass.

**Architecture:** Keep the existing Episode Factory and YouTube uploader, but add a small publication domain around them: a fail-closed gate evaluator, exact artifact identity verification, YouTube status verification/public promotion, durable publication records, and an idempotent GitHub Actions workflow. The upload workflow will trigger from canonical QA/state/config changes on `main`, download the exact render referenced by QA from the source Actions run, upload privately, verify processing/metadata/thumbnail state, and then set the same video public.

**Tech Stack:** Python 3.11 stdlib `unittest`/`unittest.mock`, `google-api-python-client`, GitHub Actions, GitHub CLI (`gh`), Node 22 for existing publishing-control-plane validation.

## Global Constraints

- Public publishing requires every required core QA gate to score at least `9.0/10`.
- Public publishing requires zero major or publish-blocking findings.
- Upload must always begin as private and public promotion must target the exact same verified YouTube video ID.
- The exact uploaded render must be structurally traceable to the QA-approved GitHub Actions render run and artifact.
- Publishing must fail closed on uncertainty; production may continue.
- `pausePublishing: true` must prevent public promotion and new automatic uploads.
- Paid assets are never purchased or used automatically; Phase 1 does not add asset acquisition.
- Scheduled workflows remain fallback only; normal progress should happen from immediate watched push/event triggers.
- No completion claim is valid without a real YouTube video ID and a verified final public privacy state.
- Higgsfield must not be used.

---

## File Structure

### New Python modules

- `youtube_uploader/publish_gate.py` — pure publication eligibility evaluation.
- `youtube_uploader/verifier.py` — YouTube read/poll/promote helpers.
- `youtube_uploader/publication_record.py` — durable idempotent publication record model and atomic writes.
- `youtube_uploader/publisher.py` — orchestration for private upload, verification, same-ID promotion, and resume.
- `youtube_uploader/test_publish_gate.py` — gate unit tests.
- `youtube_uploader/test_verifier.py` — API verification/promotion unit tests.
- `youtube_uploader/test_publication_record.py` — record/idempotency tests.
- `youtube_uploader/test_publisher.py` — orchestration unit tests using mocked YouTube API.
- `scripts/verify_render_artifact.py` — parse QA render URI, validate downloaded artifact identity, emit machine-readable metadata/checksums.
- `scripts/test_verify_render_artifact.py` — render-artifact identity tests.

### Modified files

- `youtube_uploader/auth.py` — make CI credentials usable for both upload and read verification with the already-authorized scopes.
- `youtube_uploader/uploader.py` — expose private-upload primitives without hard-coding the entire lifecycle into one function.
- `.github/workflows/upload-youtube.yml` — automatic, idempotent, artifact-driven publishing workflow plus manual fallback.
- `config/autonomy.json` — replace two-video canary semantics with per-video private-first verification and enable approved automatic publishing.
- `tools/publishing-control-plane.mjs` — new reusable validator for autonomy/daily-control semantics.
- `tools/publishing-control-plane.test.mjs` — validator tests.
- `.github/workflows/publishing-control-plane-guard.yml` — call the reusable validator instead of inline logic.
- `episodes/current/publication.json` — created by the live workflow after the first real upload, not pre-populated in source.

---

### Task 1: Replace two-video canary with per-video publication controls

**Files:**
- Create: `tools/publishing-control-plane.mjs`
- Create: `tools/publishing-control-plane.test.mjs`
- Modify: `config/autonomy.json`
- Modify: `.github/workflows/publishing-control-plane-guard.yml`

**Interfaces:**
- Produces: `validatePublishingControls(autonomy, daily)` which throws on invalid/fail-open config and returns `true` on success.
- Consumed by: GitHub publishing guard and Python publication gate semantics.

- [ ] **Step 1: Write the failing Node tests**

Create `tools/publishing-control-plane.test.mjs` with cases proving:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublishingControls } from './publishing-control-plane.mjs';

const validAutonomy = {
  autonomy_version: '1.1',
  revision: 1,
  autoPublishEnabled: true,
  requiredCoreScore: 9,
  publishReadyStates: ['QA_PASSED', 'AUTO_PUBLISH_READY'],
  requiredGates: ['factual','package','retention','narration','visual','technical','policy','copyright'],
  verification: {
    privateFirst: true,
    requireProcessingVerification: true,
    requireMetadataVerification: true,
    requireThumbnailVerification: true,
    promoteSameVideoIdOnly: true
  },
  publication: {
    failClosedOnUncertainty: true
  }
};

const validDaily = {
  control_version: '1.0', revision: 4,
  pauseAllProduction: false, pausePublishing: false,
  dailyPublishQuota: 1, publishedToday: 0,
  minimumSpacingMinutes: 0,
  lastPublicationAt: null, lastSuccessfulCanaryAt: null,
  notes: ''
};

test('accepts private-first per-video verification config', () => {
  assert.equal(validatePublishingControls(validAutonomy, validDaily), true);
});

test('rejects public publishing without private-first verification', () => {
  assert.throws(() => validatePublishingControls({
    ...validAutonomy,
    verification: {...validAutonomy.verification, privateFirst: false}
  }, validDaily), /privateFirst/);
});

test('rejects core score below 9', () => {
  assert.throws(() => validatePublishingControls({...validAutonomy, requiredCoreScore: 8.9}, validDaily), />= 9/);
});

test('rejects fail-open publication config', () => {
  assert.throws(() => validatePublishingControls({
    ...validAutonomy,
    publication: {failClosedOnUncertainty: false}
  }, validDaily), /failClosed/);
});
```

- [ ] **Step 2: Run tests and confirm they fail because the validator does not exist**

Run:

```bash
node --test tools/publishing-control-plane.test.mjs
```

Expected: FAIL with module-not-found or missing export.

- [ ] **Step 3: Implement the reusable validator**

Create `tools/publishing-control-plane.mjs` exporting `validatePublishingControls`. Validate exact versions/types, `requiredCoreScore >= 9`, all eight required gates, all five verification booleans set `true`, `failClosedOnUncertainty === true`, valid daily quota/count/spacing, and boolean pause switches.

- [ ] **Step 4: Update autonomy config to the approved semantics**

Replace the old two-video `canary` block with:

```json
"autonomy_version": "1.1",
"revision": 1,
"autoPublishEnabled": true,
"verification": {
  "privateFirst": true,
  "requireProcessingVerification": true,
  "requireMetadataVerification": true,
  "requireThumbnailVerification": true,
  "promoteSameVideoIdOnly": true
},
"publication": {
  "failClosedOnUncertainty": true
}
```

Preserve `requiredCoreScore`, `publishReadyStates`, `requiredGates`, and the existing recording requirements unless a test proves they conflict.

- [ ] **Step 5: Update the guard workflow to invoke the reusable validator**

Use:

```yaml
- name: Validate publishing controls
  run: node -e "import('./tools/publishing-control-plane.mjs').then(({validateFiles}) => validateFiles('config/autonomy.json','queue/daily-control.json'))"
```

Export `validateFiles` from the module as a thin JSON-file loader around `validatePublishingControls`.

- [ ] **Step 6: Run the validator tests and existing control-plane workflow logic locally**

Run:

```bash
node --test tools/publishing-control-plane.test.mjs
node -e "import('./tools/publishing-control-plane.mjs').then(({validateFiles}) => validateFiles('config/autonomy.json','queue/daily-control.json'))"
```

Expected: all tests PASS and prints `Publishing control plane OK`.

- [ ] **Step 7: Commit**

```bash
git add tools/publishing-control-plane.mjs tools/publishing-control-plane.test.mjs config/autonomy.json .github/workflows/publishing-control-plane-guard.yml
git commit -m "feat: switch publishing to per-video verification"
```

---

### Task 2: Add a pure fail-closed publication gate evaluator

**Files:**
- Create: `youtube_uploader/publish_gate.py`
- Create: `youtube_uploader/test_publish_gate.py`

**Interfaces:**
- Produces: `GateDecision(allowed: bool, reasons: tuple[str, ...])`.
- Produces: `evaluate_publication_gate(qa_review: dict, episode_state: dict, autonomy: dict, daily: dict) -> GateDecision`.
- Consumed by: `youtube_uploader.publisher.publish_episode`.

- [ ] **Step 1: Write failing gate tests**

Cover at minimum:

```python
from unittest import TestCase
from youtube_uploader.publish_gate import evaluate_publication_gate

class PublishGateTests(TestCase):
    def base(self):
        qa = {
            "status": "QA_PASSED",
            "publishDecision": "PASS",
            "coreScores": {
                "factual": 9.2, "package": 9.1, "retention": 9.0,
                "narration": 9.0, "visual": 9.3, "technical": 9.7,
                "policy": 9.0, "copyright": 9.0,
            },
            "failures": [],
            "reviewedStateRevision": 56,
            "reviewedRenderAsset": "github-actions://run/123/artifact/episode-render/episode.mp4"
        }
        state = {"state": "QA_PASSED", "state_revision": 56}
        autonomy = {
            "autoPublishEnabled": True,
            "requiredCoreScore": 9,
            "publishReadyStates": ["QA_PASSED", "AUTO_PUBLISH_READY"],
            "requiredGates": list(qa["coreScores"]),
            "verification": {"privateFirst": True, "requireProcessingVerification": True,
                             "requireMetadataVerification": True, "requireThumbnailVerification": True,
                             "promoteSameVideoIdOnly": True},
            "publication": {"failClosedOnUncertainty": True}
        }
        daily = {"pausePublishing": False, "dailyPublishQuota": 1, "publishedToday": 0}
        return qa, state, autonomy, daily

    def test_allows_exact_9_or_higher_with_no_blockers(self):
        qa, state, autonomy, daily = self.base()
        self.assertTrue(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_any_gate_below_9(self):
        qa, state, autonomy, daily = self.base()
        qa["coreScores"]["narration"] = 8.9
        result = evaluate_publication_gate(qa, state, autonomy, daily)
        self.assertFalse(result.allowed)
        self.assertIn("narration", " ".join(result.reasons))

    def test_blocks_publish_blocking_failure(self):
        qa, state, autonomy, daily = self.base()
        qa["failures"] = [{"severity": "publish-blocking", "finding": "bad"}]
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_state_revision_mismatch(self):
        qa, state, autonomy, daily = self.base()
        state["state_revision"] = 57
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)
```

Also test `pausePublishing`, `autoPublishEnabled`, missing required score, non-pass QA decision, quota reached, and missing reviewed render URI.

- [ ] **Step 2: Run the test and verify failure**

```bash
python -m unittest youtube_uploader.test_publish_gate -v
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement the minimal gate evaluator**

Use a frozen dataclass:

```python
@dataclass(frozen=True)
class GateDecision:
    allowed: bool
    reasons: tuple[str, ...]
```

Collect every blocking reason instead of failing at the first one. Return `allowed=True` only when `reasons` is empty.

- [ ] **Step 4: Run tests**

```bash
python -m unittest youtube_uploader.test_publish_gate -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add youtube_uploader/publish_gate.py youtube_uploader/test_publish_gate.py
git commit -m "feat: add fail-closed publication gate"
```

---

### Task 3: Verify exact render-artifact identity before upload

**Files:**
- Create: `scripts/verify_render_artifact.py`
- Create: `scripts/test_verify_render_artifact.py`

**Interfaces:**
- Produces: `parse_render_asset_uri(uri: str) -> RenderAssetRef` with `run_id`, `artifact_name`, `filename`.
- Produces: `verify_artifact(qa_review_path, canonical_manifest_path, downloaded_dir) -> dict` containing `runId`, `artifactName`, `videoPath`, `thumbnailPath`, `videoSha256`, `thumbnailSha256`, `manifestSha256`.
- Consumed by: upload workflow and publisher.

- [ ] **Step 1: Write URI and identity tests**

Use `tempfile.TemporaryDirectory` to create a downloaded artifact containing `episode.mp4`, `thumbnail.png`, and `render-manifest.json`.

Test:

```python
ref = parse_render_asset_uri(
    "github-actions://run/31252577314/artifact/episode-render/episode.mp4"
)
self.assertEqual(ref.run_id, "31252577314")
self.assertEqual(ref.artifact_name, "episode-render")
self.assertEqual(ref.filename, "episode.mp4")
```

Then prove verification rejects:

- downloaded manifest `githubRunId` different from QA URI run ID;
- downloaded `artifactName` different from QA URI;
- canonical checked-in manifest content different from downloaded manifest;
- missing MP4 or thumbnail.

And accepts exact matching manifests/files while emitting SHA-256 hashes.

- [ ] **Step 2: Run tests and verify failure**

```bash
python -m unittest scripts.test_verify_render_artifact -v
```

Expected: FAIL because verifier does not exist.

- [ ] **Step 3: Implement parser, SHA-256 helper, and identity checks**

The URI parser must accept only:

```text
github-actions://run/<digits>/artifact/<non-empty-name>/<non-empty-filename>
```

Fail closed on all other formats.

Identity verification must compare the downloaded artifact's `render-manifest.json` byte-for-byte SHA-256 with the canonical checked-in `episodes/current/render-manifest.json`, then verify manifest `githubRunId`, `artifactName`, and `filename` against the QA URI.

- [ ] **Step 4: Add CLI output**

Support:

```bash
python scripts/verify_render_artifact.py \
  --qa-review episodes/current/qa-review.json \
  --canonical-manifest episodes/current/render-manifest.json \
  --downloaded-dir incoming-render \
  --output /tmp/render-identity.json
```

Write one JSON object suitable for later workflow steps.

- [ ] **Step 5: Run tests**

```bash
python -m unittest scripts.test_verify_render_artifact -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify_render_artifact.py scripts/test_verify_render_artifact.py
git commit -m "feat: verify approved render artifact identity"
```

---

### Task 4: Add YouTube read verification and same-ID public promotion

**Files:**
- Modify: `youtube_uploader/auth.py`
- Modify: `youtube_uploader/uploader.py`
- Create: `youtube_uploader/verifier.py`
- Create: `youtube_uploader/test_verifier.py`

**Interfaces:**
- `credentials_from_env(scopes=None)` defaults to `AUTHORIZE_SCOPES` for the publisher lifecycle.
- `upload_private(..., youtube=None) -> str` returns YouTube video ID and never uploads public directly.
- `fetch_video(youtube, video_id: str) -> dict` reads `snippet,status,processingDetails`.
- `wait_until_processed(youtube, video_id, timeout_seconds=900, poll_seconds=10) -> dict` returns the ready video resource or raises on failure/timeout.
- `verify_metadata(video, expected_title: str, expected_description: str) -> tuple[bool, tuple[str,...]]`.
- `promote_public(youtube, video_id: str) -> dict` calls `videos.update(part="status", ...)` preserving current status fields that must survive.

- [ ] **Step 1: Write failing verifier tests with mocked YouTube resources**

Test processing progression:

```python
responses = [
    {"items": [{"id":"abc", "status":{"privacyStatus":"private"},
                "processingDetails":{"processingStatus":"processing"},
                "snippet":{"title":"T", "description":"D", "thumbnails":{"default":{}}}}]},
    {"items": [{"id":"abc", "status":{"privacyStatus":"private"},
                "processingDetails":{"processingStatus":"succeeded"},
                "snippet":{"title":"T", "description":"D", "thumbnails":{"default":{}}}}]},
]
```

Assert the poller returns the second state, fails on `processingStatus="failed"`, and fails if `items=[]`.

Test metadata mismatch and verify `promote_public` targets `video_id="abc"` and writes `privacyStatus="public"` only after verification.

- [ ] **Step 2: Run test and verify failure**

```bash
python -m unittest youtube_uploader.test_verifier -v
```

Expected: FAIL.

- [ ] **Step 3: Update auth scopes for the full approved lifecycle**

Change `credentials_from_env()` so the publisher uses the already-minted upload + readonly scopes. Do not add a new OAuth scope or require reauthorization.

- [ ] **Step 4: Refactor uploader to an injectable private-upload primitive**

Keep the hard safety invariant: the insert body must always begin with `privacyStatus="private"`.

Allow an optional injected `youtube` service in tests to avoid network calls.

Return only the resulting video ID from upload.

- [ ] **Step 5: Implement verifier helpers**

Use `videos().list(part="snippet,status,processingDetails", id=video_id)`.

Treat the custom-thumbnail requirement as satisfied only when:

1. `thumbnails.set` returned successfully during upload; and
2. the post-processing video resource contains a non-empty `snippet.thumbnails` map.

Do not claim the Data API cryptographically proves the exact thumbnail bytes; the publication record will separately store the local thumbnail SHA-256 used in the successful `thumbnails.set` call.

- [ ] **Step 6: Run tests**

```bash
python -m unittest youtube_uploader.test_verifier -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add youtube_uploader/auth.py youtube_uploader/uploader.py youtube_uploader/verifier.py youtube_uploader/test_verifier.py
git commit -m "feat: verify and promote YouTube uploads"
```

---

### Task 5: Add durable publication records and idempotent resume

**Files:**
- Create: `youtube_uploader/publication_record.py`
- Create: `youtube_uploader/test_publication_record.py`

**Interfaces:**
- Produces: `load_publication_record(path) -> dict | None`.
- Produces: `atomic_write_publication_record(path, record: dict) -> None`.
- Produces: `same_source_render(record, identity: dict) -> bool` comparing episode/run/artifact/video SHA-256.
- Publication record schema version: `1.0`.

- [ ] **Step 1: Write failing record tests**

Prove:

- missing file returns `None`;
- atomic write round-trips valid JSON;
- `same_source_render` returns true only for exact `sourceRender.runId`, `artifactName`, and `videoSha256` match;
- a record with an existing `youtube.videoId` can be resumed instead of causing a second upload.

Use a record shape:

```json
{
  "publicationVersion": "1.0",
  "episodeId": "20260807-episode",
  "sourceRender": {
    "runId": "123",
    "artifactName": "episode-render",
    "videoSha256": "...",
    "thumbnailSha256": "...",
    "manifestSha256": "..."
  },
  "package": {"id":"A", "title":"..."},
  "youtube": {
    "videoId": "abc",
    "url": "https://www.youtube.com/watch?v=abc",
    "thumbnailSetSucceeded": true,
    "processingVerified": false,
    "metadataVerified": false,
    "privateVerifiedAt": null,
    "publicVerifiedAt": null,
    "privacyTransitions": ["private"]
  }
}
```

- [ ] **Step 2: Run tests and verify failure**

```bash
python -m unittest youtube_uploader.test_publication_record -v
```

- [ ] **Step 3: Implement atomic JSON writes**

Write to a sibling temporary file, `flush`, `os.fsync`, then `os.replace`.

Reject records missing `publicationVersion`, `episodeId`, `sourceRender`, or `youtube`.

- [ ] **Step 4: Run tests**

```bash
python -m unittest youtube_uploader.test_publication_record -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add youtube_uploader/publication_record.py youtube_uploader/test_publication_record.py
git commit -m "feat: record idempotent YouTube publication state"
```

---

### Task 6: Build the private → verify → public publisher orchestrator

**Files:**
- Create: `youtube_uploader/publisher.py`
- Create: `youtube_uploader/test_publisher.py`

**Interfaces:**
- Produces:

```python
def publish_episode(
    *,
    video_path: str,
    thumbnail_path: str,
    identity: dict,
    qa_review: dict,
    episode_state: dict,
    render_manifest: dict,
    autonomy: dict,
    daily_control: dict,
    publication_record_path: str,
    youtube=None,
) -> dict:
    ...
```

- Consumes gate evaluator, private uploader, verifier, and publication record helpers.
- Returns the final persisted publication record.

- [ ] **Step 1: Write failing orchestration tests**

Use mocks to prove four critical flows:

1. Gate blocked → no YouTube insert/update call.
2. First run → upload private exactly once, write video ID, verify, promote same ID, verify public, write final record.
3. Re-run with same source render and existing private video ID → do not upload a duplicate; resume verification/promotion.
4. Re-run with different source video SHA-256 → fail closed rather than attaching the old YouTube ID to a new render.

Also prove a thumbnail failure keeps the video private and raises a publish blocker.

- [ ] **Step 2: Run test and verify failure**

```bash
python -m unittest youtube_uploader.test_publisher -v
```

- [ ] **Step 3: Implement orchestration in explicit stages**

Required order:

```text
publication gate
→ source identity/idempotency check
→ upload PRIVATE if no existing same-render video ID
→ persist video ID immediately
→ wait for processing success
→ verify title/description and thumbnail-set evidence
→ persist private verification
→ promote SAME video ID to public
→ fetch again and require privacyStatus=public
→ persist final public verification and URL
```

Persist after each irreversible external side effect so a runner crash can resume safely.

- [ ] **Step 4: Expose a CLI**

Support explicit file arguments:

```bash
python -m youtube_uploader.publisher \
  --video incoming-render/episode.mp4 \
  --thumbnail incoming-render/thumbnail.png \
  --identity /tmp/render-identity.json \
  --qa-review episodes/current/qa-review.json \
  --episode-state episodes/current/episode-state.json \
  --render-manifest episodes/current/render-manifest.json \
  --autonomy config/autonomy.json \
  --daily-control queue/daily-control.json \
  --publication-record episodes/current/publication.json
```

The title/description/chosen package must come from canonical `render-manifest.json`, not manual workflow inputs.

- [ ] **Step 5: Run tests**

```bash
python -m unittest youtube_uploader.test_publisher -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add youtube_uploader/publisher.py youtube_uploader/test_publisher.py
git commit -m "feat: orchestrate verified automatic publication"
```

---

### Task 7: Replace the manual repo-path uploader workflow with exact artifact publishing

**Files:**
- Modify: `.github/workflows/upload-youtube.yml`

**Interfaces:**
- Trigger: `push` on `main` when canonical QA/state/config/daily-control files change, plus `workflow_dispatch` fallback.
- Input source of truth: QA review + canonical render manifest; no manually supplied title/video path required.
- Artifact source: `qa-review.json.reviewedRenderAsset`.

- [ ] **Step 1: Change the workflow trigger and permissions**

Use:

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "episodes/current/qa-review.json"
      - "episodes/current/episode-state.json"
      - "episodes/current/render-manifest.json"
      - "config/autonomy.json"
      - "queue/daily-control.json"
      - "youtube_uploader/**"
      - "scripts/verify_render_artifact.py"
      - ".github/workflows/upload-youtube.yml"

permissions:
  actions: read
  contents: write

concurrency:
  group: publish-current-episode
  cancel-in-progress: false
```

- [ ] **Step 2: Add a cheap preflight gate before downloading artifacts**

Run a short Python snippet importing `evaluate_publication_gate`. If blocked, print every reason and exit `0` with a `PUBLISH_ELIGIBLE=false` environment flag so the job performs no external YouTube side effect.

- [ ] **Step 3: Parse the exact render run/artifact from QA**

Use `scripts/verify_render_artifact.py` URI parser via a small CLI mode or Python snippet to write `RUN_ID` and `ARTIFACT_NAME` to `$GITHUB_ENV`.

- [ ] **Step 4: Download the exact artifact directly from the source run**

Use the GitHub CLI already present on hosted runners:

```bash
mkdir -p incoming-render
gh run download "$RUN_ID" -n "$ARTIFACT_NAME" -D incoming-render
```

Set `GH_TOKEN: ${{ github.token }}`.

- [ ] **Step 5: Verify artifact identity and hashes**

Run:

```bash
python scripts/verify_render_artifact.py \
  --qa-review episodes/current/qa-review.json \
  --canonical-manifest episodes/current/render-manifest.json \
  --downloaded-dir incoming-render \
  --output /tmp/render-identity.json
```

This step must fail the job before YouTube upload if identity cannot be proven.

- [ ] **Step 6: Run the publisher**

Provide only existing YouTube secrets and canonical file paths. Do not accept title/description/privacy as workflow inputs.

- [ ] **Step 7: Persist publication proof back to the repo**

After the publisher returns, require `episodes/current/publication.json` to contain a non-empty `youtube.videoId`.

Commit only that record if changed:

```bash
git config user.name "whatifs-publisher"
git config user.email "whatifs-publisher@users.noreply.github.com"
git add episodes/current/publication.json
if ! git diff --cached --quiet; then
  git commit -m "chore: record verified YouTube publication"
  git pull --rebase origin main
  git push
fi
```

Do not include `publication.json` in this workflow's push path filter, preventing self-trigger loops.

- [ ] **Step 8: Add workflow-level Python tests before side effects**

Before artifact download/upload, run:

```bash
python -m unittest discover -s youtube_uploader -p 'test_*.py' -v
python -m unittest scripts.test_verify_render_artifact -v
node --test tools/publishing-control-plane.test.mjs
```

- [ ] **Step 9: Commit**

```bash
git add .github/workflows/upload-youtube.yml
git commit -m "feat: publish exact approved render artifact"
```

---

### Task 8: Full regression verification and merge readiness

**Files:**
- Verify all Phase 1 files above.
- No new production behavior beyond fixing discovered test failures.

**Interfaces:**
- Deliverable: one branch where factory tests, publishing tests, workflow control tests, and Remotion smoke tests all pass before merge.

- [ ] **Step 1: Run all new Python tests**

```bash
python -m unittest discover -s youtube_uploader -p 'test_*.py' -v
python -m unittest scripts.test_verify_render_artifact -v
```

Expected: PASS.

- [ ] **Step 2: Run all existing Node/factory tests plus the new control-plane test**

```bash
node --test \
  tools/episode-state.test.mjs \
  tools/episode-runner.test.mjs \
  tools/episode-producer.test.mjs \
  tools/episode1-visual-rebuild.test.mjs \
  tools/episode1-thumbnail-rebuild.test.mjs \
  tools/episode1-hook-contrast-rebuild.test.mjs \
  tools/episode1-late-beat-rebuild.test.mjs \
  tools/episode1-illustrated-v3-rebuild.test.mjs \
  tools/episode1-character-payoff-v4-rebuild.test.mjs \
  tools/publish-grade-visual-guard.test.mjs \
  tools/publishing-control-plane.test.mjs \
  video/src/thumbnail-layout.test.mjs \
  video/src/hook-contrast.test.mjs \
  video/src/sleep-beat-phase.test.mjs \
  video/src/sleep-visual-registry.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run syntax/compile checks**

```bash
python -m py_compile youtube_uploader/*.py scripts/verify_render_artifact.py
node --check tools/publishing-control-plane.mjs
```

Expected: PASS.

- [ ] **Step 4: Run Remotion smoke renders**

```bash
npm install --no-audit --no-fund
npx remotion still video/src/index.jsx WhatIfEpisode /tmp/whatifs-smoke.png --frame=60
npx remotion still video/src/index.jsx WhatIfThumbnail /tmp/whatifs-thumb.png
test -s /tmp/whatifs-smoke.png && test -s /tmp/whatifs-thumb.png
```

Expected: PASS.

- [ ] **Step 5: Review the diff specifically for side-effect safety**

Verify manually from the diff:

- no code path uploads directly as public;
- no code path promotes a different video ID than the verified private upload;
- every promotion path evaluates the 9.0-per-gate publication decision;
- `pausePublishing` blocks external publishing;
- workflow artifact run ID comes only from canonical QA review;
- no manual title/video path can override the canonical package;
- publication record is persisted after the private upload ID is obtained;
- no paid service/provider or Higgsfield dependency was added.

- [ ] **Step 6: Commit any verification-only fixes, open PR, and require green checks**

Use a PR summary that explicitly says this changes real-world YouTube publishing behavior and that the user approved private-first automatic public promotion after QA.

- [ ] **Step 7: Merge only after checks pass**

The merge changes `config/autonomy.json` and publishing workflow files. Because `config/autonomy.json` is watched by Episode Factory on `main`, the merge should immediately trigger the factory as well as the publication preflight workflow; publication will no-op until the canonical QA state is truly publish-ready.

---

## Live Episode 1 Release Sequence After Phase 1 Merge

Once Phase 1 is merged, do not wait for the schedule.

1. Confirm the immediate Episode Factory push run produces a new Kokoro-backed render artifact and persists a new canonical state revision/render manifest.
2. Download that exact artifact and inspect audio/ending pacing/visuals.
3. Verify authoritative Kokoro model + voice licensing evidence is durable enough for the policy/copyright gates.
4. Run independent QA against the exact new render.
5. If any required core gate is below 9.0, make the smallest repair and immediately retrigger the factory.
6. When QA writes `QA_PASSED`/`PASS` with every required core score >= 9.0 and no blockers, the publishing workflow triggers immediately.
7. Publishing workflow downloads the exact QA-reviewed artifact, uploads it private, verifies it, promotes the same video ID public, re-reads final public status, and records the YouTube URL/video ID.
8. Only after step 7 is proven may the user be told the video is done/public.

## Phase 1 Definition of Done

- Exact QA-reviewed Actions artifact is downloaded without copying the MP4 into git.
- Artifact identity is checked against QA URI + canonical render manifest.
- Upload always starts private.
- Processing/metadata/thumbnail state is verified before public promotion.
- Public promotion is impossible if any core gate is below 9.0, QA is not PASS, the state revision mismatches QA, publishing is paused, quota is exhausted, or any publish-blocking finding exists.
- Same verified YouTube video ID is promoted public.
- Re-runs resume from a durable publication record instead of duplicate-uploading the same render.
- Final public state and real YouTube video ID are persisted before completion is claimed.
