import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import Mock

from youtube_uploader.uploader import upload_private


class UploaderTests(TestCase):
    def test_upload_insert_is_hard_locked_private(self):
        youtube = Mock()
        request = Mock()
        request.next_chunk.return_value = (
            None,
            {"id": "abc", "status": {"privacyStatus": "private"}},
        )
        youtube.videos.return_value.insert.return_value = request

        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp) / "episode.mp4"
            video.write_bytes(b"fake-mp4")
            video_id = upload_private(
                str(video),
                "Title",
                "Description",
                youtube=youtube,
            )

        self.assertEqual(video_id, "abc")
        kwargs = youtube.videos.return_value.insert.call_args.kwargs
        self.assertEqual(kwargs["body"]["status"]["privacyStatus"], "private")
        self.assertFalse(kwargs["body"]["status"]["selfDeclaredMadeForKids"])

    def test_rejects_non_private_insert_response(self):
        youtube = Mock()
        request = Mock()
        request.next_chunk.return_value = (
            None,
            {"id": "abc", "status": {"privacyStatus": "public"}},
        )
        youtube.videos.return_value.insert.return_value = request

        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp) / "episode.mp4"
            video.write_bytes(b"fake-mp4")
            with self.assertRaisesRegex(RuntimeError, "did not remain private"):
                upload_private(str(video), "Title", youtube=youtube)
