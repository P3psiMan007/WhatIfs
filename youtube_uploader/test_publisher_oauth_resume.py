import hashlib
import hashlib
import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import Mock, patch

from youtube_uploader.publication_record import load_publication_record
from youtube_uploader.publisher import publish_episode


class PublisherOAuthResumeTests(TestCase):
    def _inputs(self, root: Path):
        video = root / "episode.mp4"
        thumb = root / "thumbnail.png"
        publication = root / "publication.json"
        video_bytes = b"video"
        thumbnail_bytes = b"thumb"
        video.write_bytes(video_bytes)
        thumb.write_bytes(thumbnail_bytes)
        video_sha256 = hashlib.sha256(video_bytes).hexdigest()
        narration_sha256 = hashlib.sha256(b"narration").hexdigest()
        image_manifest_sha256 = hashlib.sha256(b"image-manifest").hexdigest()
        identity = {
            "runId": "123",
            "artifactName": "episode-render",
            "filename": "episode.mp4",
            "videoSha256": video_sha256,
            "thumbnailSha256": hashlib.sha256(thumbnail_bytes).hexdigest(),
            "manifestSha256": hashlib.sha256(b"manifest").hexdigest(),
        }
        qa = {
            "status": "QA_PASSED",
            "publishDecision": "PASS",
            "coreScores": {
                "factual": 9.2, "package": 9.1, "retention": 9.0,
                "narration": 9.0, "visual": 9.3, "technical": 9.7,
                "policy": 9.0, "copyright": 9.0,
            },
            "failures": [],
            "majorBlockers": [],
            "authority": "critic-qa-independent",
            "reviewedExactArtifact": True,
            "artifactDigest": "sha256:" + video_sha256,
            "narratorVerification": {
                "verified": True,
                "provider": "kokoro",
                "voice": "af_heart",
                "speed": 0.95,
                "flowVersion": "continuous-v2",
                "audioSha256": narration_sha256,
            },
            "episodeId": "ep-1",
            "imageAssetsVerification": {"verified": True, "manifestSha256": image_manifest_sha256, "assetRevision": "image-first-cinematic-v2"},
            "reviewedStateRevision": 56,
            "reviewedRenderAsset": "github-actions://run/123/artifact/episode-render/episode.mp4",
        }
        state = {"episode_id": "ep-1", "state": "QA_PASSED", "state_revision": 56, "production": {"render_asset": qa["reviewedRenderAsset"]}}
        manifest = {
            "episodeId": "ep-1", "title": "What If Test?",
            "description": "Description", "chosenPackage": "A",
            "experimentAssignment": "baseline",
            "githubRunId": "123", "artifactName": "episode-render", "filename": "episode.mp4",
            "narrator": {"provider": "kokoro", "voice": "af_heart", "speed": 0.95, "flowVersion": "continuous-v2", "audioSha256": narration_sha256},
            "imageAssets": {"path": "episodes/current/image-assets-v1.json", "sha256": image_manifest_sha256, "assetRevision": "image-first-cinematic-v2"},
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
        daily = {"pauseAllProduction": False, "pausePublishing": False,
                 "dailyPublishQuota": 1, "publishedToday": 0,
                 "minimumSpacingMinutes": 0, "lastPublicationAt": None}
        production_input = {
            "narrator": {
                "provider": "kokoro",
                "voice": "af_heart",
                "speed": 0.95,
                "flowVersion": "continuous-v2",
            }
        }
        return video, thumb, publication, identity, qa, state, manifest, autonomy, daily, production_input

    @patch("youtube_uploader.publisher.build_public_promotion_service")
    @patch("youtube_uploader.publisher.fetch_video")
    @patch("youtube_uploader.publisher.wait_until_processed")
    @patch("youtube_uploader.publisher.set_thumbnail")
    @patch("youtube_uploader.publisher.upload_private")
    @patch("youtube_uploader.publisher.build_youtube_service")
    def test_missing_management_scope_keeps_verified_private_video_for_resume(
        self,
        build_private_service,
        upload_private_mock,
        set_thumbnail_mock,
        wait_mock,
        fetch_mock,
        build_promotion_service,
    ):
        private_service = Mock()
        build_private_service.return_value = private_service
        upload_private_mock.return_value = "abc"
        private_video = {
            "id": "abc",
            "status": {"privacyStatus": "private", "uploadStatus": "processed", "embeddable": True, "containsSyntheticMedia": True},
            "processingDetails": {"processingStatus": "succeeded"},
            "snippet": {
                "title": "What If Test?",
                "description": "Description",
                "thumbnails": {"default": {"url": "x"}},
            },
        }
        wait_mock.return_value = private_video
        build_promotion_service.side_effect = RuntimeError("re-authorize once")
        fetch_mock.return_value = {"id": "3EGJqkrn42A", "status": {"privacyStatus": "private"}}

        with tempfile.TemporaryDirectory() as tmp:
            args = self._inputs(Path(tmp))
            with self.assertRaisesRegex(RuntimeError, "re-authorize once"):
                publish_episode(
                    video_path=str(args[0]),
                    thumbnail_path=str(args[1]),
                    publication_record_path=str(args[2]),
                    identity=args[3], qa_review=args[4], episode_state=args[5],
                    render_manifest=args[6], autonomy=args[7], daily_control=args[8],
                    production_input=args[9],
                )
            record = load_publication_record(args[2])
            self.assertEqual(record["youtube"]["videoId"], "abc")
            self.assertTrue(record["youtube"]["thumbnailSetSucceeded"])
            self.assertTrue(record["youtube"]["processingVerified"])
            self.assertTrue(record["youtube"]["metadataVerified"])
            self.assertTrue(record["youtube"]["syntheticMediaDisclosureVerified"])
            self.assertIsNotNone(record["youtube"]["privateVerifiedAt"])
            self.assertIsNone(record["youtube"]["publicVerifiedAt"])
            self.assertIn("re-authorize", record["youtube"]["lastError"])
