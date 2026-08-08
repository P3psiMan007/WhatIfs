from unittest import TestCase
from unittest.mock import Mock

from youtube_uploader.verifier import (
    fetch_video,
    promote_public,
    verify_metadata,
    verify_thumbnail_state,
    wait_until_processed,
)


class VerifierTests(TestCase):
    def _youtube_with_list_responses(self, responses):
        youtube = Mock()
        execute = youtube.videos.return_value.list.return_value.execute
        execute.side_effect = responses
        return youtube

    def test_fetch_video_returns_single_item(self):
        resource = {
            "id": "abc",
            "status": {"privacyStatus": "private"},
            "processingDetails": {"processingStatus": "succeeded"},
            "snippet": {"title": "T", "description": "D", "thumbnails": {"default": {}}},
        }
        youtube = self._youtube_with_list_responses([{"items": [resource]}])
        self.assertEqual(fetch_video(youtube, "abc"), resource)

    def test_fetch_video_rejects_missing_item(self):
        youtube = self._youtube_with_list_responses([{"items": []}])
        with self.assertRaisesRegex(RuntimeError, "not found"):
            fetch_video(youtube, "abc")

    def test_wait_until_processed_polls_until_succeeded(self):
        processing = {
            "id": "abc",
            "status": {"privacyStatus": "private"},
            "processingDetails": {"processingStatus": "processing"},
            "snippet": {"title": "T", "description": "D", "thumbnails": {"default": {}}},
        }
        succeeded = {
            **processing,
            "processingDetails": {"processingStatus": "succeeded"},
        }
        youtube = self._youtube_with_list_responses(
            [{"items": [processing]}, {"items": [succeeded]}]
        )
        sleeps = []
        result = wait_until_processed(
            youtube,
            "abc",
            timeout_seconds=10,
            poll_seconds=1,
            sleep_fn=lambda seconds: sleeps.append(seconds),
            monotonic_fn=iter([0, 0, 1]).__next__,
        )
        self.assertEqual(result["processingDetails"]["processingStatus"], "succeeded")
        self.assertEqual(sleeps, [1])

    def test_wait_until_processed_rejects_failed_processing(self):
        failed = {
            "id": "abc",
            "status": {"privacyStatus": "private"},
            "processingDetails": {"processingStatus": "failed", "processingFailureReason": "codec"},
            "snippet": {"title": "T", "description": "D", "thumbnails": {"default": {}}},
        }
        youtube = self._youtube_with_list_responses([{"items": [failed]}])
        with self.assertRaisesRegex(RuntimeError, "failed"):
            wait_until_processed(youtube, "abc", sleep_fn=lambda _: None)

    def test_verify_metadata_exact_match(self):
        video = {"snippet": {"title": "T", "description": "D"}}
        ok, reasons = verify_metadata(video, expected_title="T", expected_description="D")
        self.assertTrue(ok)
        self.assertEqual(reasons, ())

    def test_verify_metadata_reports_mismatch(self):
        video = {"snippet": {"title": "Wrong", "description": "D"}}
        ok, reasons = verify_metadata(video, expected_title="T", expected_description="D")
        self.assertFalse(ok)
        self.assertIn("title", " ".join(reasons))

    def test_verify_thumbnail_requires_successful_set_and_api_thumbnail_map(self):
        video = {"snippet": {"thumbnails": {"default": {"url": "x"}}}}
        self.assertTrue(verify_thumbnail_state(video, thumbnail_set_succeeded=True))
        self.assertFalse(verify_thumbnail_state(video, thumbnail_set_succeeded=False))
        self.assertFalse(
            verify_thumbnail_state({"snippet": {"thumbnails": {}}}, thumbnail_set_succeeded=True)
        )

    def test_promote_public_updates_same_video_id_and_omits_read_only_status(self):
        youtube = Mock()
        existing = {
            "id": "abc",
            "status": {
                "uploadStatus": "processed",
                "privacyStatus": "private",
                "selfDeclaredMadeForKids": False,
                "embeddable": True,
                "license": "youtube",
                "publicStatsViewable": True,
            },
            "processingDetails": {"processingStatus": "succeeded"},
            "snippet": {"title": "T", "description": "D", "thumbnails": {"default": {}}},
        }
        youtube.videos.return_value.list.return_value.execute.return_value = {"items": [existing]}
        youtube.videos.return_value.update.return_value.execute.return_value = {
            "id": "abc",
            "status": {"privacyStatus": "public"},
        }
        result = promote_public(youtube, "abc")
        self.assertEqual(result["id"], "abc")
        kwargs = youtube.videos.return_value.update.call_args.kwargs
        self.assertEqual(kwargs["body"]["id"], "abc")
        self.assertEqual(kwargs["body"]["status"]["privacyStatus"], "public")
        self.assertNotIn("uploadStatus", kwargs["body"]["status"])
        self.assertEqual(kwargs["body"]["status"]["license"], "youtube")
