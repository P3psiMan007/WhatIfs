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
            "reviewedStateRevision": 56,
            "reviewedRenderAsset": "github-actions://run/123/artifact/episode-render/episode.mp4",
        }
        state = {"state": "QA_PASSED", "state_revision": 56}
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
                "promoteSameVideoIdOnly": True,
            },
            "publication": {"failClosedOnUncertainty": True},
        }
        daily = {
            "pausePublishing": False,
            "dailyPublishQuota": 1,
            "publishedToday": 0,
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
