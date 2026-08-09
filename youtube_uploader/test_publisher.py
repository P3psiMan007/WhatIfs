import hashlib
import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import Mock, patch

from youtube_uploader.publication_record import load_publication_record
from youtube_uploader.publisher import publish_episode


class PublisherTests(TestCase):
    @staticmethod
    def rejected_private_video():
        return {"id": "3EGJqkrn42A", "status": {"privacyStatus": "private"}}

    def fixture(self, root: Path):
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
            "imageAssetsVerification": {
                "verified": True,
                "manifestSha256": image_manifest_sha256,
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
        manifest = {
            "episodeId": "ep-1",
            "title": "What If Test?",
            "description": "Description",
            "chosenPackage": "A",
            "experimentAssignment": "baseline",
            "packages": [{"id": "A", "title": "What If Test?"}],
            "githubRunId": "123",
            "artifactName": "episode-render",
            "filename": "episode.mp4",
            "narrator": {
                "provider": "kokoro",
                "voice": "af_heart",
                "speed": 0.95,
                "flowVersion": "continuous-v2",
                "audioSha256": narration_sha256,
            },
            "imageAssets": {
                "path": "episodes/current/image-assets-v1.json",
                "sha256": image_manifest_sha256,
                "assetRevision": "image-first-cinematic-v2",
            },
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
            "pausePublishing": False,
            "dailyPublishQuota": 1,
            "publishedToday": 0,
            "lastPublicationAt": None,
            "lastCountedVideoId": None,
        }
        production_input = {
            "narrator": {
                "provider": "kokoro",
                "voice": "af_heart",
                "speed": 0.95,
                "flowVersion": "continuous-v2",
            }
        }
        return video, thumb, publication, identity, qa, state, manifest, autonomy, daily, production_input

    @patch("youtube_uploader.publisher.upload_private")
    def test_refuses_video_bytes_that_do_not_match_the_qa_bound_identity(self, upload_private_mock):
        upload_private_mock.side_effect = AssertionError("upload must not start")
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(Path(tmp))
            args[0].write_bytes(b"tampered-video")
            with self.assertRaisesRegex(RuntimeError, "video SHA-256"):
                publish_episode(
                    video_path=str(args[0]),
                    thumbnail_path=str(args[1]),
                    publication_record_path=str(args[2]),
                    identity=args[3],
                    qa_review=args[4],
                    episode_state=args[5],
                    render_manifest=args[6],
                    autonomy=args[7],
                    daily_control=args[8],
                    production_input=args[9],
                    youtube=Mock(),
                    stop_after_private=True,
                )
        upload_private_mock.assert_not_called()

    @patch("youtube_uploader.publisher.fetch_video")
    @patch("youtube_uploader.publisher.upload_private")
    def test_refuses_to_reuse_a_user_rejected_private_video(self, upload_private_mock, fetch_video_mock):
        fetch_video_mock.return_value = self.rejected_private_video()
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(Path(tmp))
            from youtube_uploader.publication_record import atomic_write_publication_record
            atomic_write_publication_record(
                args[2],
                {
                    "publicationVersion": "1.0",
                    "episodeId": "ep-1",
                    "sourceRender": args[3],
                    "package": {"id": "A", "title": "What If Test?"},
                    "youtube": {"videoId": "3EGJqkrn42A", "privateVerifiedAt": "2026-08-09T00:00:00Z"},
                },
            )
            with self.assertRaisesRegex(RuntimeError, "rejected YouTube video ID"):
                publish_episode(
                    video_path=str(args[0]),
                    thumbnail_path=str(args[1]),
                    publication_record_path=str(args[2]),
                    identity=args[3],
                    qa_review=args[4],
                    episode_state=args[5],
                    render_manifest=args[6],
                    autonomy=args[7],
                    daily_control=args[8],
                    production_input=args[9],
                    youtube=Mock(),
                    stop_after_private=True,
                )
        upload_private_mock.assert_not_called()
        fetch_video_mock.assert_called_once()

    @patch("youtube_uploader.publisher.fetch_video")
    @patch("youtube_uploader.publisher.upload_private")
    def test_blocks_a_new_release_if_the_rejected_video_is_not_private(self, upload_private_mock, fetch_video_mock):
        fetch_video_mock.return_value = {"id": "3EGJqkrn42A", "status": {"privacyStatus": "public"}}
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(Path(tmp))
            with self.assertRaisesRegex(RuntimeError, "no longer private"):
                publish_episode(
                    video_path=str(args[0]),
                    thumbnail_path=str(args[1]),
                    publication_record_path=str(args[2]),
                    identity=args[3],
                    qa_review=args[4],
                    episode_state=args[5],
                    render_manifest=args[6],
                    autonomy=args[7],
                    daily_control=args[8],
                    production_input=args[9],
                    youtube=Mock(),
                    stop_after_private=True,
                )
        upload_private_mock.assert_not_called()

    @patch("youtube_uploader.publisher.upload_private")
    def test_gate_blocked_causes_no_upload(self, upload_private_mock):
        with tempfile.TemporaryDirectory() as tmp:
            args = list(self.fixture(Path(tmp)))
            args[4]["coreScores"]["narration"] = 8.9
            with self.assertRaisesRegex(RuntimeError, "publication gate blocked"):
                publish_episode(
                    video_path=str(args[0]),
                    thumbnail_path=str(args[1]),
                    publication_record_path=str(args[2]),
                    identity=args[3],
                    qa_review=args[4],
                    episode_state=args[5],
                    render_manifest=args[6],
                    autonomy=args[7],
                    daily_control=args[8],
                    production_input=args[9],
                    youtube=Mock(),
                )
            upload_private_mock.assert_not_called()

    @patch("youtube_uploader.publisher.fetch_video")
    @patch("youtube_uploader.publisher.promote_public")
    @patch("youtube_uploader.publisher.wait_until_processed")
    @patch("youtube_uploader.publisher.set_thumbnail")
    @patch("youtube_uploader.publisher.upload_private")
    def test_first_run_uploads_private_verifies_and_promotes_same_id(
        self,
        upload_private_mock,
        set_thumbnail_mock,
        wait_mock,
        promote_mock,
        fetch_mock,
    ):
        upload_private_mock.return_value = "abc"
        private_video = {
            "id": "abc",
            "status": {"privacyStatus": "private", "uploadStatus": "processed", "embeddable": True},
            "processingDetails": {"processingStatus": "succeeded"},
            "snippet": {
                "title": "What If Test?",
                "description": "Description",
                "thumbnails": {"default": {"url": "x"}},
            },
        }
        public_video = {
            **private_video,
            "status": {"privacyStatus": "public", "uploadStatus": "processed", "embeddable": True},
        }
        wait_mock.return_value = private_video
        promote_mock.return_value = {"id": "abc", "status": {"privacyStatus": "public"}}
        fetch_mock.side_effect = [self.rejected_private_video(), public_video]

        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(Path(tmp))
            record = publish_episode(
                video_path=str(args[0]),
                thumbnail_path=str(args[1]),
                publication_record_path=str(args[2]),
                identity=args[3],
                qa_review=args[4],
                episode_state=args[5],
                render_manifest=args[6],
                autonomy=args[7],
                daily_control=args[8],
                production_input=args[9],
                youtube=Mock(),
            )
            self.assertEqual(record["youtube"]["videoId"], "abc")
            self.assertIsNotNone(record["youtube"]["privateVerifiedAt"])
            self.assertIsNotNone(record["youtube"]["publicVerifiedAt"])
            self.assertEqual(record["youtube"]["privacyTransitions"], ["private", "public"])
            self.assertTrue(record["youtube"]["playbackVerified"])
            promote_mock.assert_called_once()
            self.assertEqual(promote_mock.call_args.args[1], "abc")
            self.assertEqual(load_publication_record(args[2])["youtube"]["videoId"], "abc")
            self.assertEqual(args[8]["publishedToday"], 1)
            self.assertEqual(args[8]["lastCountedVideoId"], "abc")

    @patch("youtube_uploader.publisher.fetch_video")
    @patch("youtube_uploader.publisher.promote_public")
    @patch("youtube_uploader.publisher.wait_until_processed")
    @patch("youtube_uploader.publisher.set_thumbnail")
    @patch("youtube_uploader.publisher.upload_private")
    def test_resume_same_render_does_not_duplicate_upload(
        self,
        upload_private_mock,
        set_thumbnail_mock,
        wait_mock,
        promote_mock,
        fetch_mock,
    ):
        private_video = {
            "id": "abc",
            "status": {"privacyStatus": "private", "uploadStatus": "processed", "embeddable": True},
            "processingDetails": {"processingStatus": "succeeded"},
            "snippet": {
                "title": "What If Test?",
                "description": "Description",
                "thumbnails": {"default": {"url": "x"}},
            },
        }
        public_video = {**private_video, "status": {"privacyStatus": "public", "uploadStatus": "processed", "embeddable": True}}
        wait_mock.return_value = private_video
        fetch_mock.side_effect = [self.rejected_private_video(), public_video]
        promote_mock.return_value = {"id": "abc", "status": {"privacyStatus": "public"}}

        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(Path(tmp))
            from youtube_uploader.publication_record import atomic_write_publication_record
            atomic_write_publication_record(
                args[2],
                {
                    "publicationVersion": "1.0",
                    "episodeId": "ep-1",
                    "sourceRender": args[3],
                    "package": {"id": "A", "title": "What If Test?"},
                    "youtube": {
                        "videoId": "abc",
                        "url": "https://www.youtube.com/watch?v=abc",
                        "thumbnailSetSucceeded": True,
                        "processingVerified": False,
                        "metadataVerified": False,
                        "privateVerifiedAt": None,
                        "publicVerifiedAt": None,
                        "privacyTransitions": ["private"],
                    },
                },
            )
            publish_episode(
                video_path=str(args[0]),
                thumbnail_path=str(args[1]),
                publication_record_path=str(args[2]),
                identity=args[3],
                qa_review=args[4],
                episode_state=args[5],
                render_manifest=args[6],
                autonomy=args[7],
                daily_control=args[8],
                production_input=args[9],
                youtube=Mock(),
            )
            upload_private_mock.assert_not_called()
            set_thumbnail_mock.assert_not_called()

    @patch("youtube_uploader.publisher.fetch_video")
    def test_existing_record_for_different_render_fails_closed(self, fetch_video_mock):
        fetch_video_mock.return_value = self.rejected_private_video()
        from youtube_uploader.publication_record import atomic_write_publication_record
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(Path(tmp))
            record = {
                "publicationVersion": "1.0",
                "episodeId": "ep-1",
                "sourceRender": {**args[3], "videoSha256": "old"},
                "package": {"id": "A", "title": "What If Test?"},
                "youtube": {"videoId": "old-video"},
            }
            atomic_write_publication_record(args[2], record)
            with self.assertRaisesRegex(RuntimeError, "different source render"):
                publish_episode(
                    video_path=str(args[0]),
                    thumbnail_path=str(args[1]),
                    publication_record_path=str(args[2]),
                    identity=args[3],
                    qa_review=args[4],
                    episode_state=args[5],
                    render_manifest=args[6],
                    autonomy=args[7],
                    daily_control=args[8],
                    production_input=args[9],
                    youtube=Mock(),
                )

    @patch("youtube_uploader.publisher.upload_private")
    def test_unlocked_production_narrator_refuses_upload(self, upload_private_mock):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(Path(tmp))
            with self.assertRaisesRegex(RuntimeError, "locked narrator"):
                publish_episode(
                    video_path=str(args[0]),
                    thumbnail_path=str(args[1]),
                    publication_record_path=str(args[2]),
                    identity=args[3],
                    qa_review=args[4],
                    episode_state=args[5],
                    render_manifest=args[6],
                    autonomy=args[7],
                    daily_control=args[8],
                    production_input={"narrator": {"provider": "kokoro", "voice": "other", "speed": 0.95, "flowVersion": "continuous-v2"}},
                    youtube=Mock(),
                )
            upload_private_mock.assert_not_called()
