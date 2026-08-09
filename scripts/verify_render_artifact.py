from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path


URI_RE = re.compile(
    r"^github-actions://run/(?P<run_id>\d+)/artifact/(?P<artifact_name>[^/]+)/(?P<filename>[^/]+)$"
)
DIGEST_RE = re.compile(r"^sha256:([0-9a-f]{64})$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


@dataclass(frozen=True)
class RenderAssetRef:
    run_id: str
    artifact_name: str
    filename: str


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_render_asset_uri(uri: str) -> RenderAssetRef:
    match = URI_RE.fullmatch(uri or "")
    if not match:
        raise ValueError(f"Invalid reviewed render asset URI: {uri!r}")
    return RenderAssetRef(**match.groupdict())


def verify_declared_image_assets(downloaded_dir: Path, image_manifest_path: Path, render_image_assets: dict) -> int:
    """Verify every source plate named by the artifact's signed image ledger."""
    try:
        image_manifest = json.loads(image_manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError("downloaded image asset manifest is unreadable") from exc
    if image_manifest.get("assetRevision") != render_image_assets.get("assetRevision"):
        raise ValueError("downloaded image asset manifest revision does not match the render manifest")
    assets = image_manifest.get("assets")
    if not isinstance(assets, list) or not assets:
        raise ValueError("downloaded image asset manifest does not declare any source plates")
    if len(assets) > 200:
        raise ValueError("downloaded image asset manifest declares too many source plates")
    root = downloaded_dir.resolve()
    seen_paths: set[str] = set()
    for index, asset in enumerate(assets, start=1):
        if not isinstance(asset, dict):
            raise ValueError(f"image asset #{index} is invalid")
        relative = str(asset.get("path") or "").replace("\\", "/")
        if not relative.startswith("public/generated/episode1/") or not relative.endswith(".png"):
            raise ValueError(f"image asset #{index} path is outside the approved generated plate store")
        if relative in seen_paths:
            raise ValueError(f"image asset #{index} duplicates a declared plate path")
        seen_paths.add(relative)
        expected_sha = str(asset.get("sha256") or "").lower()
        if not SHA256_RE.fullmatch(expected_sha):
            raise ValueError(f"image asset #{index} SHA-256 is missing or invalid")
        plate_path = (downloaded_dir / Path(relative)).resolve()
        try:
            plate_path.relative_to(root)
        except ValueError as exc:
            raise ValueError(f"image asset #{index} path escapes the downloaded artifact") from exc
        if not plate_path.is_file():
            raise ValueError(f"image asset #{index} source plate is missing")
        if _sha256(plate_path) != expected_sha:
            raise ValueError(f"image asset #{index} source plate SHA-256 does not match the ledger")
    return len(assets)


def verify_artifact(
    qa_review_path: str | Path,
    canonical_manifest_path: str | Path,
    downloaded_dir: str | Path,
) -> dict:
    qa_review_path = Path(qa_review_path)
    canonical_manifest_path = Path(canonical_manifest_path)
    downloaded_dir = Path(downloaded_dir)

    qa_review = json.loads(qa_review_path.read_text(encoding="utf-8"))
    if qa_review.get("reviewedExactArtifact") is not True:
        raise ValueError("QA review does not attest that the exact artifact was reviewed")
    if qa_review.get("authority") != "critic-qa-independent":
        raise ValueError("QA review authority is not independent")
    ref = parse_render_asset_uri(qa_review.get("reviewedRenderAsset", ""))

    downloaded_manifest_path = downloaded_dir / "episodes" / "current" / "render-manifest.json"
    if not downloaded_manifest_path.is_file():
        raise FileNotFoundError(
            f"Missing downloaded render-manifest.json: {downloaded_manifest_path}"
        )
    if not canonical_manifest_path.is_file():
        raise FileNotFoundError(f"Missing canonical render manifest: {canonical_manifest_path}")

    canonical_manifest_sha = _sha256(canonical_manifest_path)
    downloaded_manifest_sha = _sha256(downloaded_manifest_path)
    if canonical_manifest_sha != downloaded_manifest_sha:
        raise ValueError(
            "Downloaded render manifest checksum does not match canonical render manifest checksum"
        )

    manifest = json.loads(downloaded_manifest_path.read_text(encoding="utf-8"))
    if str(manifest.get("githubRunId")) != ref.run_id:
        raise ValueError(
            f"Render run mismatch: QA={ref.run_id} manifest={manifest.get('githubRunId')!r}"
        )
    if manifest.get("artifactName") != ref.artifact_name:
        raise ValueError(
            "Render artifact name mismatch: "
            f"QA={ref.artifact_name!r} manifest={manifest.get('artifactName')!r}"
        )
    if manifest.get("filename") != ref.filename:
        raise ValueError(
            f"Render filename mismatch: QA={ref.filename!r} manifest={manifest.get('filename')!r}"
        )

    dist_dir = downloaded_dir / "dist"
    video_path = dist_dir / ref.filename
    thumbnail_name = manifest.get("thumbnailFilename")
    if not isinstance(thumbnail_name, str) or not thumbnail_name:
        raise ValueError("Render manifest is missing thumbnailFilename")
    thumbnail_path = dist_dir / thumbnail_name

    if not video_path.is_file():
        raise FileNotFoundError(f"Missing approved video file: {video_path}")
    if not thumbnail_path.is_file():
        raise FileNotFoundError(f"Missing approved thumbnail file: {thumbnail_path}")

    video_sha = _sha256(video_path)
    digest_match = DIGEST_RE.fullmatch(str(qa_review.get("artifactDigest") or "").lower())
    if not digest_match:
        raise ValueError("QA review artifactDigest is missing or invalid")
    if digest_match.group(1) != video_sha:
        raise ValueError("QA review artifactDigest does not match the downloaded approved video")

    narrator = manifest.get("narrator") or {}
    expected_narrator = {
        "provider": "kokoro",
        "voice": "af_heart",
        "speed": 0.95,
        "flowVersion": "continuous-v2",
    }
    if any(narrator.get(field) != expected for field, expected in expected_narrator.items()):
        raise ValueError("render manifest narrator does not match the locked narrator contract")
    expected_audio_sha = str(narrator.get("audioSha256") or "").lower()
    if not SHA256_RE.fullmatch(expected_audio_sha):
        raise ValueError("render manifest narration audio SHA-256 is missing or invalid")
    narration_path = downloaded_dir / "public" / "narration.mp3"
    if not narration_path.is_file():
        raise FileNotFoundError(f"Missing downloaded narration audio: {narration_path}")
    if _sha256(narration_path) != expected_audio_sha:
        raise ValueError("downloaded narration audio does not match the render manifest")
    qa_narrator = qa_review.get("narratorVerification") or {}
    if qa_narrator.get("verified") is not True or str(qa_narrator.get("audioSha256") or "").lower() != expected_audio_sha:
        raise ValueError("QA narrator audio attestation does not match the downloaded narration audio")

    image_assets = manifest.get("imageAssets") or {}
    if image_assets.get("path") != "episodes/current/image-assets-v1.json":
        raise ValueError("render manifest image asset manifest path is invalid")
    expected_image_sha = str(image_assets.get("sha256") or "").lower()
    if not SHA256_RE.fullmatch(expected_image_sha):
        raise ValueError("render manifest image asset manifest SHA-256 is missing or invalid")
    image_manifest_path = downloaded_dir / "episodes" / "current" / "image-assets-v1.json"
    if not image_manifest_path.is_file():
        raise FileNotFoundError(f"Missing downloaded image asset manifest: {image_manifest_path}")
    if _sha256(image_manifest_path) != expected_image_sha:
        raise ValueError("downloaded image asset manifest does not match the render manifest")
    image_asset_count = verify_declared_image_assets(downloaded_dir, image_manifest_path, image_assets)
    qa_images = qa_review.get("imageAssetsVerification") or {}
    if (
        qa_images.get("verified") is not True
        or str(qa_images.get("manifestSha256") or "").lower() != expected_image_sha
        or qa_images.get("assetRevision") != image_assets.get("assetRevision")
    ):
        raise ValueError("QA image asset manifest attestation does not match the render manifest")

    return {
        "runId": ref.run_id,
        "artifactName": ref.artifact_name,
        "filename": ref.filename,
        "videoPath": video_path.as_posix(),
        "thumbnailPath": thumbnail_path.as_posix(),
        "videoSha256": video_sha,
        "thumbnailSha256": _sha256(thumbnail_path),
        "narrationSha256": expected_audio_sha,
        "imageAssetManifestSha256": expected_image_sha,
        "imageAssetCount": image_asset_count,
        "manifestSha256": downloaded_manifest_sha,
    }


def _main() -> None:
    parser = argparse.ArgumentParser(description="Verify exact QA-approved render artifact identity")
    parser.add_argument("--qa-review", required=True)
    parser.add_argument("--canonical-manifest", required=True)
    parser.add_argument("--downloaded-dir", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    result = verify_artifact(
        args.qa_review,
        args.canonical_manifest,
        args.downloaded_dir,
    )
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result))


if __name__ == "__main__":
    _main()
