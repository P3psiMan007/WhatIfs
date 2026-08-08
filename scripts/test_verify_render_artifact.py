import hashlib
import json
import tempfile
from pathlib import Path
from unittest import TestCase

from scripts.verify_render_artifact import parse_render_asset_uri, verify_artifact


class RenderArtifactTests(TestCase):
    def _write_fixture(self, root: Path, run_id="123", artifact_name="episode-render"):
        downloaded = root / "downloaded"
        downloaded.mkdir()
        manifest = {
            "episodeId": "ep-1",
            "githubRunId": run_id,
            "artifactName": artifact_name,
            "filename": "episode.mp4",
            "thumbnailFilename": "thumbnail.png",
            "title": "What If Test?",
            "description": "D",
            "chosenPackage": "A",
        }
        canonical = root / "render-manifest.json"
        payload = json.dumps(manifest, indent=2) + "\n"
        canonical.write_text(payload, encoding="utf-8")
        (downloaded / "render-manifest.json").write_text(payload, encoding="utf-8")
        (downloaded / "episode.mp4").write_bytes(b"video-bytes")
        (downloaded / "thumbnail.png").write_bytes(b"thumb-bytes")
        qa = root / "qa-review.json"
        qa.write_text(
            json.dumps(
                {
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
            (downloaded / "render-manifest.json").write_text(
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
            (downloaded / "episode.mp4").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "episode.mp4"):
                verify_artifact(qa, canonical, downloaded)

    def test_rejects_missing_thumbnail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            qa, canonical, downloaded, _ = self._write_fixture(root)
            (downloaded / "thumbnail.png").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "thumbnail.png"):
                verify_artifact(qa, canonical, downloaded)
