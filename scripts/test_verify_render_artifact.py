import hashlib
import json
import tempfile
from pathlib import Path
from unittest import TestCase

from scripts.verify_render_artifact import parse_render_asset_uri, verify_artifact


class RenderArtifactTests(TestCase):
    def _write_fixture(self, root: Path, run_id="123", artifact_name="episode-render"):
        downloaded = root / "downloaded"
        (downloaded / "dist").mkdir(parents=True)
        (downloaded / "episodes" / "current").mkdir(parents=True)
        (downloaded / "public").mkdir(parents=True)
        narration_bytes = b"narration-bytes"
        image_asset_bytes = b"image-plate-bytes"
        image_asset_sha256 = hashlib.sha256(image_asset_bytes).hexdigest()
        image_manifest_bytes = (json.dumps({
            "assetRevision": "image-first-cinematic-v2",
            "assets": [{
                "path": "public/generated/episode1/scene-01-a.png",
                "sha256": image_asset_sha256,
            }],
        }, sort_keys=True) + "\n").encode("utf-8")
        narration_sha256 = hashlib.sha256(narration_bytes).hexdigest()
        image_manifest_sha256 = hashlib.sha256(image_manifest_bytes).hexdigest()
        manifest = {
            "episodeId": "ep-1",
            "githubRunId": run_id,
            "artifactName": artifact_name,
            "filename": "episode.mp4",
            "thumbnailFilename": "thumbnail.png",
            "title": "What If Test?",
            "description": "D",
            "chosenPackage": "A",
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
        canonical = root / "render-manifest.json"
        payload = json.dumps(manifest, indent=2) + "\n"
        canonical.write_text(payload, encoding="utf-8")
        (downloaded / "episodes" / "current" / "render-manifest.json").write_text(
            payload, encoding="utf-8"
        )
        (downloaded / "dist" / "episode.mp4").write_bytes(b"video-bytes")
        (downloaded / "dist" / "thumbnail.png").write_bytes(b"thumb-bytes")
        (downloaded / "public" / "narration.mp3").write_bytes(narration_bytes)
        (downloaded / "episodes" / "current" / "image-assets-v1.json").write_bytes(image_manifest_bytes)
        plate = downloaded / "public" / "generated" / "episode1" / "scene-01-a.png"
        plate.parent.mkdir(parents=True)
        plate.write_bytes(image_asset_bytes)
        qa = root / "qa-review.json"
        qa.write_text(
            json.dumps(
                {
                    "authority": "critic-qa-independent",
                    "reviewedExactArtifact": True,
                    "artifactDigest": "sha256:" + hashlib.sha256(b"video-bytes").hexdigest(),
                    "narratorVerification": {
                        "verified": True,
                        "provider": "kokoro",
                        "voice": "af_heart",
                        "speed": 0.95,
                        "flowVersion": "continuous-v2",
                        "audioSha256": narration_sha256,
                    },
                    "imageAssetsVerification": {
                        "verified": True,
                        "manifestSha256": image_manifest_sha256,
                        "assetRevision": "image-first-cinematic-v2",
                    },
                    "reviewedRenderAsset": (
                        f"github-actions://run/{run_id}/artifact/{artifact_name}/episode.mp4"
                    )
                }
            ),
            encoding="utf-8",
        )
        return qa, canonical, downloaded, manifest

    def test_parses_render_asset_uri(self):
        ref = parse_render_asset_uri(
            "github-actions://run/31252577314/artifact/episode-render/episode.mp4"
        )
        self.assertEqual(ref.run_id, "31252577314")
        self.assertEqual(ref.artifact_name, "episode-render")
        self.assertEqual(ref.filename, "episode.mp4")

    def test_rejects_invalid_uri(self):
        with self.assertRaises(ValueError):
            parse_render_asset_uri("https://example.com/episode.mp4")

    def test_accepts_exact_matching_artifact_and_emits_hashes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            result = verify_artifact(qa, canonical, downloaded)
            self.assertEqual(result["runId"], "123")
            self.assertEqual(result["artifactName"], "episode-render")
            self.assertTrue(result["videoPath"].endswith("dist/episode.mp4"))
            self.assertTrue(result["thumbnailPath"].endswith("dist/thumbnail.png"))
            self.assertEqual(
                result["videoSha256"], hashlib.sha256(b"video-bytes").hexdigest()
            )
            self.assertEqual(
                result["thumbnailSha256"], hashlib.sha256(b"thumb-bytes").hexdigest()
            )

    def test_rejects_downloaded_manifest_run_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, manifest = self._write_fixture(root)
            manifest["githubRunId"] = "999"
            (downloaded / "episodes" / "current" / "render-manifest.json").write_text(
                json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
            )
            with self.assertRaisesRegex(ValueError, "manifest checksum"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_canonical_manifest_difference(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, manifest = self._write_fixture(root)
            manifest["title"] = "Different"
            canonical.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "manifest checksum"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_missing_video(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            (downloaded / "dist" / "episode.mp4").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "episode.mp4"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_missing_thumbnail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            (downloaded / "dist" / "thumbnail.png").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "thumbnail.png"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_qa_digest_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            payload = json.loads(qa.read_text(encoding="utf-8"))
            payload["artifactDigest"] = "sha256:" + "0" * 64
            qa.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "artifactDigest does not match"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_missing_exact_review_attestation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            payload = json.loads(qa.read_text(encoding="utf-8"))
            payload["reviewedExactArtifact"] = False
            qa.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "exact artifact"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_narration_bytes_that_do_not_match_manifest_and_qa(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            (downloaded / "public" / "narration.mp3").write_bytes(b"tampered-narration")
            with self.assertRaisesRegex(ValueError, "narration audio"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_image_manifest_bytes_that_do_not_match_provenance(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            (downloaded / "episodes" / "current" / "image-assets-v1.json").write_text("{}\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "image asset manifest"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_a_declared_image_plate_with_missing_or_tampered_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            (downloaded / "public" / "generated" / "episode1" / "scene-01-a.png").write_bytes(b"tampered-plate")
            with self.assertRaisesRegex(ValueError, "image asset"):
                verify_artifact(qa, canonical, downloaded)
