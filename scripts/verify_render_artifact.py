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


def verify_artifact(
    qa_review_path: str | Path,
    canonical_manifest_path: str | Path,
    downloaded_dir: str | Path,
) -> dict:
    qa_review_path = Path(qa_review_path)
    canonical_manifest_path = Path(canonical_manifest_path)
    downloaded_dir = Path(downloaded_dir)

    qa_review = json.loads(qa_review_path.read_text(encoding="utf-8"))
    ref = parse_render_asset_uri(qa_review.get("reviewedRenderAsset", ""))

    downloaded_manifest_path = downloaded_dir / "render-manifest.json"
    if not downloaded_manifest_path.is_file():
        raise FileNotFoundError(f"Missing downloaded render-manifest.json: {downloaded_manifest_path}")
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

    video_path = downloaded_dir / ref.filename
    thumbnail_name = manifest.get("thumbnailFilename")
    if not isinstance(thumbnail_name, str) or not thumbnail_name:
        raise ValueError("Render manifest is missing thumbnailFilename")
    thumbnail_path = downloaded_dir / thumbnail_name

    if not video_path.is_file():
        raise FileNotFoundError(f"Missing approved video file: {video_path}")
    if not thumbnail_path.is_file():
        raise FileNotFoundError(f"Missing approved thumbnail file: {thumbnail_path}")

    return {
        "runId": ref.run_id,
        "artifactName": ref.artifact_name,
        "filename": ref.filename,
        "videoPath": str(video_path),
        "thumbnailPath": str(thumbnail_path),
        "videoSha256": _sha256(video_path),
        "thumbnailSha256": _sha256(thumbnail_path),
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
