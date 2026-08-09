from __future__ import annotations

import hashlib
import struct
import tempfile
from pathlib import Path
from unittest import TestCase

from scripts.prepare_thumbnail_override import (
    jpeg_dimensions,
    load_verified_local_thumbnail,
    validate_source,
    validate_thumbnail_bytes,
)


def make_jpeg(width: int = 1280, height: int = 720) -> bytes:
    sof = (
        struct.pack(">H", 17)
        + b"\x08"
        + struct.pack(">HH", height, width)
        + b"\x03"
        + b"\x01\x11\x00\x02\x11\x00\x03\x11\x00"
    )
    return b"\xff\xd8" + b"\xff\xc0" + sof + b"\xff\xd9"


class ThumbnailOverrideTests(TestCase):
    def source(self, data: bytes) -> dict:
        return {
            "episodeId": "ep-1",
            "packageId": "A",
            "source": "chatgpt-images",
            "localPath": "../../public/approved/episode1-chatgpt-thumbnail.jpg",
            "immutableLocalCopy": True,
            "sha256": hashlib.sha256(data).hexdigest(),
            "width": 1280,
            "height": 720,
            "mimeType": "image/jpeg",
            "provenance": {
                "recoveredVia": "Adobe Creative Cloud",
                "assetId": "urn:aaid:sc:AP:b5785a7e-8faf-4c22-b68d-8bc48381d277",
                "assetUrl": "https://at.adobe.com/k1KQBCYxhjGdcfvw",
            },
            "approvedForCurrentEpisode": True,
        }

    def test_reads_expected_jpeg_dimensions(self):
        self.assertEqual(jpeg_dimensions(make_jpeg()), (1280, 720))

    def test_accepts_exact_hash_and_dimensions(self):
        data = make_jpeg()
        validate_thumbnail_bytes(data, self.source(data))

    def test_rejects_hash_mismatch(self):
        data = make_jpeg()
        source = self.source(data)
        source["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
            validate_thumbnail_bytes(data, source)

    def test_rejects_dimension_mismatch(self):
        data = make_jpeg(width=1279)
        source = self.source(data)
        with self.assertRaisesRegex(ValueError, "dimensions mismatch"):
            validate_thumbnail_bytes(data, source)

    def test_requires_matching_episode_and_package(self):
        data = make_jpeg()
        source = self.source(data)
        manifest = {"episodeId": "ep-1", "chosenPackage": "A"}
        validate_source(source, manifest)
        source["packageId"] = "B"
        with self.assertRaisesRegex(ValueError, "packageId"):
            validate_source(source, manifest)

    def test_requires_verified_local_bytes_and_explicit_approval(self):
        data = make_jpeg()
        source = self.source(data)
        manifest = {"episodeId": "ep-1", "chosenPackage": "A"}
        source["approvedForCurrentEpisode"] = False
        with self.assertRaisesRegex(ValueError, "not approved"):
            validate_source(source, manifest)
        source["approvedForCurrentEpisode"] = True
        source.pop("localPath")
        with self.assertRaisesRegex(ValueError, "localPath"):
            validate_source(source, manifest)
        source["localPath"] = "../../public/approved/episode1-chatgpt-thumbnail.jpg"
        source["immutableLocalCopy"] = False
        with self.assertRaisesRegex(ValueError, "immutable"):
            validate_source(source, manifest)

    def test_reads_verified_local_thumbnail_from_approved_store(self):
        data = make_jpeg()
        source = self.source(data)
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            source_path = repo / "episodes" / "current" / "thumbnail-source.json"
            approved = repo / "public" / "approved"
            source_path.parent.mkdir(parents=True)
            approved.mkdir(parents=True)
            source_path.write_text("{}", encoding="utf-8")
            thumbnail = approved / "episode1-chatgpt-thumbnail.jpg"
            thumbnail.write_bytes(data)
            self.assertEqual(load_verified_local_thumbnail(source_path, source), data)

    def test_rejects_local_thumbnail_outside_approved_store(self):
        data = make_jpeg()
        source = self.source(data)
        source["localPath"] = "../../outside.jpg"
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            source_path = repo / "episodes" / "current" / "thumbnail-source.json"
            source_path.parent.mkdir(parents=True)
            source_path.write_text("{}", encoding="utf-8")
            (repo / "outside.jpg").write_bytes(data)
            with self.assertRaisesRegex(ValueError, "public/approved"):
                load_verified_local_thumbnail(source_path, source)


if __name__ == "__main__":
    import unittest
    unittest.main()
