import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import Mock, patch

from youtube_uploader.publication_record import load_publication_record
from youtube_uploader.publisher import publish_episode


class PublisherTests(TestCase):
    def fixture(self, root: Path):
        video = root / "episode.mp4"
        thumb = root / "thumbnail.png"
        publication = root / "publication.json"
        video.write_bytes(b"video")
        thumb.write_bytes(b"thumb")
        identity = {
            "runId": "123",
            "artifactName": "episode-render",
            "videoSha256": "video-sha",
            "thumbnailSha256": "thumb-sha",
            "manifestSha256": "manifest-sha",
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
            "reviewedStateRevision": 56,
            "reviewedRenderAsset": "github-actions://run/123/artifact/episode-render/episode.mp4",
        }
        state = {"episode_id": "ep-1", "state": "QA_PASSED", "state_revision": 56}
        manifest = {
            "episodeId": "ep-1",
            "title": "What If Test?",
            "description": "Description",
            "chosenPackage": "A",
            "experimentAssignment": "baseline",
            "packages": [{"id": "A", "title": "What If Test?"}],
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
        return video, thumb, publication, identity, qa, state, manifest, autonomy, daily

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
            "status": {"privacyStatus": "private"},
            "processingDetails": {"processingStatus": "succeeded"},
            "snippet": {
                "title": "What If Test?",
                "description": "Description",
                "thumbnails": {"default": {"url": "x"}},
            },
        }
        public_video = {
            **private_video,
            "status": {"privacyStatus": "public"},
        }
        wait_mock.return_value = private_video
        promote_mock.return_value = {"id": "abc", "status": {"privacyStatus": "public"}}
        fetch_mock.return_value = public_video

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
                youtube=Mock(),
            )
            self.assertEqual(record["youtube"]["videoId"], "abc")
            self.assertIsNotNone(record["youtube"]["privateVerifiedAt"])
            self.assertIsNotNone(record["youtube"]["publicVerifiedAt"])
            self.assertEqual(record["youtube"]["privacyTransitions"], ["private", "public"])
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
            "status": {"privacyStatus": "private"},
            "processingDetails": {"processingStatus": "succeeded"},
            "snippet": {
                "title": "What If Test?",
                "description": "Description",
                "thumbnails": {"default": {"url": "x"}},
            },
        }
        public_video = {**private_video, "status": {"privacyStatus": "public"}}
        wait_mock.return_value = private_video
        fetch_mock.return_value = public_video
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
                youtube=Mock(),
            )
            upload_private_mock.assert_not_called()
            set_thumbnail_mock.assert_not_called()

    def test_existing_record_for_different_render_fails_closed(self):
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
                    youtube=Mock(),
                )
