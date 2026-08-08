from __future__ import annotations

import hashlib
import struct
from unittest import TestCase

from scripts.prepare_thumbnail_override import (
    jpeg_dimensions,
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
            "url": "https://example.invalid/thumb.jpg",
            "sha256": hashlib.sha256(data).hexdigest(),
            "width": 1280,
            "height": 720,
            "mimeType": "image/jpeg",
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

    def test_requires_https_and_explicit_approval(self):
        data = make_jpeg()
        source = self.source(data)
        manifest = {"episodeId": "ep-1", "chosenPackage": "A"}
        source["approvedForCurrentEpisode"] = False
        with self.assertRaisesRegex(ValueError, "not approved"):
            validate_source(source, manifest)
        source["approvedForCurrentEpisode"] = True
        source["url"] = "http://example.invalid/thumb.jpg"
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            validate_source(source, manifest)


if __name__ == "__main__":
    import unittest
    unittest.main()
