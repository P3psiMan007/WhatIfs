from datetime import datetime, timedelta, timezone
from unittest import TestCase

from youtube_uploader.publish_gate import evaluate_publication_gate


class PublishGateTests(TestCase):
    def base(self):
        qa = {
            "status": "QA_PASSED",
            "publishDecision": "PASS",
            "coreScores": {
                "factual": 9.2,
                "package": 9.1,
                "retention": 9.0,
                "narration": 9.0,
                "visual": 9.3,
                "technical": 9.7,
                "policy": 9.0,
                "copyright": 9.0,
            },
            "failures": [],
            "majorBlockers": [],
            "authority": "critic-qa-independent",
            "reviewedExactArtifact": True,
            "artifactDigest": "sha256:" + "a" * 64,
            "narratorVerification": {
                "verified": True,
                "provider": "kokoro",
                "voice": "af_heart",
                "speed": 0.95,
                "flowVersion": "continuous-v2",
                "audioSha256": "a" * 64,
            },
            "episodeId": "ep-1",
            "imageAssetsVerification": {
                "verified": True,
                "manifestSha256": "b" * 64,
                "assetRevision": "image-first-cinematic-v2",
            },
            "reviewedStateRevision": 56,
            "reviewedRenderAsset": "github-actions://run/123/artifact/episode-render/episode.mp4",
        }
        state = {
            "episode_id": "ep-1",
            "state": "QA_PASSED",
            "state_revision": 56,
            "production": {"render_asset": qa["reviewedRenderAsset"]},
        }
        autonomy = {
            "autoPublishEnabled": True,
            "requiredCoreScore": 9,
            "publishReadyStates": ["QA_PASSED", "AUTO_PUBLISH_READY"],
            "requiredGates": list(qa["coreScores"]),
            "verification": {
                "privateFirst": True,
                "requireProcessingVerification": True,
                "requireMetadataVerification": True,
                "requireThumbnailVerification": True,
                "requirePlaybackVerification": True,
                "promoteSameVideoIdOnly": True,
            },
            "publication": {"failClosedOnUncertainty": True},
        }
        daily = {
            "pauseAllProduction": False,
            "pausePublishing": False,
            "dailyPublishQuota": 1,
            "publishedToday": 0,
            "minimumSpacingMinutes": 360,
            "lastPublicationAt": None,
        }
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

    def test_blocks_declared_major_blocker_even_without_failures_array(self):
        qa, state, autonomy, daily = self.base()
        qa["majorBlockers"] = ["visual repetition"]
        result = evaluate_publication_gate(qa, state, autonomy, daily)
        self.assertFalse(result.allowed)
        self.assertIn("major QA blocker", " ".join(result.reasons))

    def test_blocks_missing_exact_artifact_attestation_or_digest(self):
        qa, state, autonomy, daily = self.base()
        qa["reviewedExactArtifact"] = False
        qa["artifactDigest"] = ""
        result = evaluate_publication_gate(qa, state, autonomy, daily)
        self.assertFalse(result.allowed)
        self.assertIn("exact render artifact", " ".join(result.reasons))
        self.assertIn("artifact digest", " ".join(result.reasons))

    def test_blocks_wrong_or_missing_narrator_attestation(self):
        qa, state, autonomy, daily = self.base()
        qa["narratorVerification"]["voice"] = "other"
        result = evaluate_publication_gate(qa, state, autonomy, daily)
        self.assertFalse(result.allowed)
        self.assertIn("narrator", " ".join(result.reasons))

    def test_blocks_missing_image_asset_attestation(self):
        qa, state, autonomy, daily = self.base()
        qa["imageAssetsVerification"]["verified"] = False
        result = evaluate_publication_gate(qa, state, autonomy, daily)
        self.assertFalse(result.allowed)
        self.assertIn("image asset", " ".join(result.reasons))

    def test_blocks_when_playback_verification_is_not_required(self):
        qa, state, autonomy, daily = self.base()
        autonomy["verification"]["requirePlaybackVerification"] = False
        result = evaluate_publication_gate(qa, state, autonomy, daily)
        self.assertFalse(result.allowed)
        self.assertIn("requirePlaybackVerification", " ".join(result.reasons))

    def test_blocks_owner_only_blocker(self):
        qa, state, autonomy, daily = self.base()
        qa["failures"] = [{"severity": "owner-only-blocker", "finding": "rights unclear"}]
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_state_revision_mismatch(self):
        qa, state, autonomy, daily = self.base()
        state["state_revision"] = 57
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_paused_publishing(self):
        qa, state, autonomy, daily = self.base()
        daily["pausePublishing"] = True
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_paused_production(self):
        qa, state, autonomy, daily = self.base()
        daily["pauseAllProduction"] = True
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_when_auto_publish_disabled(self):
        qa, state, autonomy, daily = self.base()
        autonomy["autoPublishEnabled"] = False
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_missing_required_score(self):
        qa, state, autonomy, daily = self.base()
        del qa["coreScores"]["policy"]
        result = evaluate_publication_gate(qa, state, autonomy, daily)
        self.assertFalse(result.allowed)
        self.assertIn("policy", " ".join(result.reasons))

    def test_blocks_non_pass_qa_decision(self):
        qa, state, autonomy, daily = self.base()
        qa["publishDecision"] = "BLOCK"
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_quota_reached(self):
        qa, state, autonomy, daily = self.base()
        daily["publishedToday"] = 1
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_missing_reviewed_render_uri(self):
        qa, state, autonomy, daily = self.base()
        qa["reviewedRenderAsset"] = ""
        self.assertFalse(evaluate_publication_gate(qa, state, autonomy, daily).allowed)

    def test_blocks_qa_for_another_episode_or_render_asset(self):
        qa, state, autonomy, daily = self.base()
        qa["episodeId"] = "another-episode"
        qa["reviewedRenderAsset"] = "github-actions://run/999/artifact/episode-render/episode.mp4"
        result = evaluate_publication_gate(qa, state, autonomy, daily)
        self.assertFalse(result.allowed)
        self.assertIn("episode", " ".join(result.reasons))
        self.assertIn("render asset", " ".join(result.reasons))

    def test_blocks_before_minimum_spacing_elapsed(self):
        qa, state, autonomy, daily = self.base()
        now = datetime(2026, 8, 8, 20, 0, tzinfo=timezone.utc)
        daily["lastPublicationAt"] = (now - timedelta(minutes=120)).isoformat().replace("+00:00", "Z")
        result = evaluate_publication_gate(qa, state, autonomy, daily, now=now)
        self.assertFalse(result.allowed)
        self.assertIn("minimum spacing", " ".join(result.reasons))

    def test_allows_after_minimum_spacing_elapsed(self):
        qa, state, autonomy, daily = self.base()
        now = datetime(2026, 8, 8, 20, 0, tzinfo=timezone.utc)
        daily["lastPublicationAt"] = (now - timedelta(minutes=361)).isoformat().replace("+00:00", "Z")
        self.assertTrue(evaluate_publication_gate(qa, state, autonomy, daily, now=now).allowed)
