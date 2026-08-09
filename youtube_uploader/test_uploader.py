import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import Mock, patch

from youtube_uploader.uploader import upload_private


class UploaderTests(TestCase):
    @patch("youtube_uploader.uploader.MediaFileUpload")
    def test_upload_closes_the_source_stream_after_request_completion(self, media_file_upload):
        youtube = Mock()
        request = Mock()
        request.next_chunk.return_value = (None, {"id": "abc", "status": {"privacyStatus": "private"}})
        youtube.videos.return_value.insert.return_value = request
        media = media_file_upload.return_value
        stream = Mock()
        media.has_stream.return_value = True
        media.stream.return_value = stream

        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp) / "episode.mp4"
            video.write_bytes(b"fake-mp4")
            self.assertEqual(upload_private(str(video), "Title", youtube=youtube), "abc")

        stream.close.assert_called_once()

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
