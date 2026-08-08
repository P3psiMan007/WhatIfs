import json
import tempfile
from pathlib import Path
from unittest import TestCase

from youtube_uploader.publication_record import (
    atomic_write_publication_record,
    load_publication_record,
    same_source_render,
)


class PublicationRecordTests(TestCase):
    def record(self):
        return {
            "publicationVersion": "1.0",
            "episodeId": "20260807-episode",
            "sourceRender": {
                "runId": "123",
                "artifactName": "episode-render",
                "videoSha256": "video-sha",
                "thumbnailSha256": "thumb-sha",
                "manifestSha256": "manifest-sha",
            },
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
        }

    def test_missing_file_returns_none(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(load_publication_record(Path(tmp) / "missing.json"))

    def test_atomic_write_round_trips(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "publication.json"
            record = self.record()
            atomic_write_publication_record(path, record)
            self.assertEqual(load_publication_record(path), record)
            self.assertTrue(path.is_file())

    def test_same_source_render_requires_exact_identity(self):
        record = self.record()
        identity = {
            "runId": "123",
            "artifactName": "episode-render",
            "videoSha256": "video-sha",
        }
        self.assertTrue(same_source_render(record, identity))
        self.assertFalse(same_source_render(record, {**identity, "videoSha256": "other"}))
        self.assertFalse(same_source_render(record, {**identity, "runId": "999"}))

    def test_rejects_invalid_record_shape(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "publication.json"
            path.write_text(json.dumps({"publicationVersion": "1.0"}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "episodeId"):
                load_publication_record(path)
