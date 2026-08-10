from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .publication_record import (
    atomic_write_publication_record,
    load_publication_record,
    same_source_render,
)
from .publish_gate import LOCKED_NARRATOR, evaluate_publication_gate, narrator_contract_reasons
from .uploader import (
    build_public_promotion_service,
    build_youtube_service,
    set_thumbnail,
    upload_private,
)
from .verifier import (
    fetch_video,
    promote_public,
    verify_metadata,
    verify_playback,
    verify_privacy,
    verify_synthetic_media_disclosure,
    verify_thumbnail_state,
    wait_until_processed,
)
from scripts.verify_render_artifact import parse_render_asset_uri


SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
REJECTED_PUBLICATIONS_DIR = Path(__file__).resolve().parents[1] / "episodes" / "current" / "rejected-publications"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _sha256(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_rejected_video_ids() -> frozenset[str]:
    """Load user-rejected current-episode video IDs from the versioned ledger."""
    if not REJECTED_PUBLICATIONS_DIR.is_dir():
        return frozenset()
    rejected: set[str] = set()
    for record_path in sorted(REJECTED_PUBLICATIONS_DIR.glob("*.json")):
        try:
            record = json.loads(record_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"invalid rejected publication record: {record_path}") from exc
        video_id = str(((record.get("youtube") or {}).get("videoId")) or "").strip()
        if not video_id:
            raise RuntimeError(f"rejected publication record is missing a YouTube video ID: {record_path}")
        rejected.add(video_id)
    return frozenset(rejected)


def _assert_video_not_rejected(video_id: str | None, rejected_video_ids: frozenset[str]) -> None:
    if video_id and video_id in rejected_video_ids:
        raise RuntimeError(f"refusing to reuse rejected YouTube video ID: {video_id}")


def _verify_rejected_videos_remain_private(youtube, rejected_video_ids: frozenset[str]) -> None:
    for video_id in sorted(rejected_video_ids):
        try:
            video = fetch_video(youtube, video_id)
        except RuntimeError as exc:
            # A rejected ID that no longer exists, or is no longer visible to the
            # authenticated channel, must never block a fresh upload. The denylist
            # remains authoritative below, so that exact ID still cannot be reused.
            if str(exc) == f"YouTube video not found or ambiguous: {video_id}":
                continue
            raise
        if not verify_privacy(video, "private"):
            raise RuntimeError(f"rejected YouTube video is no longer private: {video_id}")


def _require_sha256(value: object, label: str) -> str:
    normalized = str(value or "").lower()
    if not SHA256_RE.fullmatch(normalized):
        raise RuntimeError(f"{label} SHA-256 is missing or invalid")
    return normalized


def _validate_exact_release_binding(
    *,
    video_path: str,
    identity: dict,
    qa_review: dict,
    episode_state: dict,
    render_manifest: dict,
    production_input: dict,
) -> None:
    """Refuse any release whose bytes, artifact URI, narrator, or art ledger drift."""
    actual_video_sha = _sha256(video_path)
    expected_video_sha = _require_sha256(identity.get("videoSha256"), "identity video")
    if actual_video_sha != expected_video_sha:
        raise RuntimeError("video SHA-256 does not match the exact approved identity")

    qa_digest = str(qa_review.get("artifactDigest") or "").lower()
    expected_qa_digest = f"sha256:{actual_video_sha}"
    if qa_digest != expected_qa_digest:
        raise RuntimeError("QA artifactDigest does not match the exact video bytes")

    try:
        ref = parse_render_asset_uri(str(qa_review.get("reviewedRenderAsset") or ""))
    except ValueError as exc:
        raise RuntimeError("QA reviewed render asset URI is invalid") from exc
    for field, expected in (("runId", ref.run_id), ("artifactName", ref.artifact_name), ("filename", ref.filename)):
        if str(identity.get(field) or "") != expected:
            raise RuntimeError(f"identity {field} does not match the QA-reviewed render asset")
    if str(render_manifest.get("githubRunId")) != ref.run_id:
        raise RuntimeError("render manifest run does not match the QA-reviewed render asset")
    if render_manifest.get("artifactName") != ref.artifact_name or render_manifest.get("filename") != ref.filename:
        raise RuntimeError("render manifest artifact does not match the QA-reviewed render asset")

    episode_id = episode_state.get("episode_id")
    if qa_review.get("episodeId") != episode_id or render_manifest.get("episodeId") != episode_id:
        raise RuntimeError("QA/render episode does not match the current episode state")
    state_render_asset = (episode_state.get("production") or {}).get("render_asset")
    if qa_review.get("reviewedRenderAsset") != state_render_asset:
        raise RuntimeError("QA render asset does not match the current episode state")

    qa_narrator = qa_review.get("narratorVerification")
    production_narrator = production_input.get("narrator") or {}
    manifest_narrator = render_manifest.get("narrator") or {}
    for label, narrator, require_verified in (
        ("QA", qa_narrator, True),
        ("production input", production_narrator, False),
        ("render manifest", manifest_narrator, False),
    ):
        reasons = narrator_contract_reasons(narrator, require_verified=require_verified)
        if reasons:
            raise RuntimeError(f"{label} narrator binding failed: {'; '.join(reasons)}")
    for field in LOCKED_NARRATOR:
        if qa_narrator.get(field) != production_narrator.get(field) or qa_narrator.get(field) != manifest_narrator.get(field):
            raise RuntimeError(f"narrator {field} differs between QA, production input, and render manifest")
    manifest_audio_sha = _require_sha256(manifest_narrator.get("audioSha256"), "render manifest narrator audio")
    if qa_narrator.get("audioSha256", "").lower() != manifest_audio_sha:
        raise RuntimeError("QA narrator audioSha256 does not match the render manifest")

    qa_images = qa_review.get("imageAssetsVerification") or {}
    manifest_images = render_manifest.get("imageAssets") or {}
    manifest_image_sha = _require_sha256(manifest_images.get("sha256"), "render manifest image asset manifest")
    if qa_images.get("manifestSha256", "").lower() != manifest_image_sha:
        raise RuntimeError("QA image asset manifest SHA-256 does not match the render manifest")
    if qa_images.get("assetRevision") != manifest_images.get("assetRevision"):
        raise RuntimeError("QA image asset revision does not match the render manifest")


def _atomic_write_json(path: str | Path, data: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, indent=2, sort_keys=True) + "\n"
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent), text=True
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass
        raise


def _new_record(render_manifest: dict, identity: dict) -> dict:
    episode_id = render_manifest.get("episodeId")
    if not episode_id:
        raise RuntimeError("render manifest missing episodeId")
    package_id = render_manifest.get("chosenPackage")
    title = render_manifest.get("title")
    if not package_id or not title:
        raise RuntimeError("render manifest missing chosenPackage/title")
    return {
        "publicationVersion": "1.0",
        "episodeId": episode_id,
        "sourceRender": dict(identity),
        "package": {
            "id": package_id,
            "title": title,
            "experimentAssignment": render_manifest.get("experimentAssignment"),
        },
        "youtube": {
            "videoId": None,
            "url": None,
            "thumbnailSetSucceeded": False,
            "processingVerified": False,
            "metadataVerified": False,
            "syntheticMediaDisclosureVerified": False,
            "playbackVerified": False,
            "privateVerifiedAt": None,
            "publicVerifiedAt": None,
            "privacyTransitions": [],
            "lastError": None,
        },
    }


def _ensure_youtube_defaults(record: dict) -> dict:
    yt = record.setdefault("youtube", {})
    defaults = {
        "videoId": None,
        "url": None,
        "thumbnailSetSucceeded": False,
        "processingVerified": False,
        "metadataVerified": False,
        "syntheticMediaDisclosureVerified": False,
        "playbackVerified": False,
        "privateVerifiedAt": None,
        "publicVerifiedAt": None,
        "privacyTransitions": [],
        "lastError": None,
    }
    for key, value in defaults.items():
        yt.setdefault(key, value)
    return yt


def _verify_expected_video(video: dict, video_id: str, title: str, description: str) -> None:
    if video.get("id") != video_id:
        raise RuntimeError(
            f"YouTube returned a different video ID: expected={video_id} got={video.get('id')!r}"
        )
    metadata_ok, metadata_reasons = verify_metadata(
        video,
        expected_title=title,
        expected_description=description,
    )
    if not metadata_ok:
        raise RuntimeError("YouTube metadata verification failed: " + "; ".join(metadata_reasons))
    if not verify_synthetic_media_disclosure(video):
        raise RuntimeError("YouTube synthetic-media disclosure verification failed")


def publish_episode(
    *,
    video_path: str,
    thumbnail_path: str,
    identity: dict,
    qa_review: dict,
    episode_state: dict,
    render_manifest: dict,
    autonomy: dict,
    daily_control: dict,
    production_input: dict | None = None,
    publication_record_path: str,
    youtube=None,
    promotion_youtube=None,
    stop_after_private: bool = False,
) -> dict:
    """Publish one exact approved render, verifying private state before any promotion.

    When ``stop_after_private`` is true the function deliberately ends after the
    exact render has uploaded, processed, matched metadata/thumbnail checks, and
    been verified private. No public-promotion service is created or called.
    """
    record_path = Path(publication_record_path)
    narrator_reasons = narrator_contract_reasons((production_input or {}).get("narrator"))
    if narrator_reasons:
        raise RuntimeError("locked narrator validation failed: " + "; ".join(narrator_reasons))

    decision = evaluate_publication_gate(qa_review, episode_state, autonomy, daily_control)
    if not decision.allowed:
        raise RuntimeError("publication gate blocked: " + "; ".join(decision.reasons))
    _validate_exact_release_binding(
        video_path=video_path,
        identity=identity,
        qa_review=qa_review,
        episode_state=episode_state,
        render_manifest=render_manifest,
        production_input=production_input or {},
    )

    rejected_video_ids = _load_rejected_video_ids()
    existing = load_publication_record(record_path)
    injected_youtube = youtube is not None
    youtube = youtube or build_youtube_service()
    _verify_rejected_videos_remain_private(youtube, rejected_video_ids)
    title = render_manifest.get("title") or ""
    description = render_manifest.get("description") or ""

    if existing is not None and not same_source_render(existing, identity):
        if (existing.get("youtube") or {}).get("videoId"):
            raise RuntimeError(
                "existing publication record belongs to a different source render; refusing to reuse its YouTube video ID"
            )
        existing = None

    if existing is not None:
        yt_existing = _ensure_youtube_defaults(existing)
        existing_id = yt_existing.get("videoId")
        _assert_video_not_rejected(existing_id, rejected_video_ids)
        if existing_id and stop_after_private and yt_existing.get("privateVerifiedAt"):
            current = fetch_video(youtube, existing_id)
            _verify_expected_video(current, existing_id, title, description)
            if not verify_privacy(current, "private"):
                raise RuntimeError("previously verified staging video is no longer private")
            if not verify_playback(current):
                raise RuntimeError("previously verified staging video no longer has verified playback eligibility")
            yt_existing["syntheticMediaDisclosureVerified"] = True
            yt_existing["playbackVerified"] = True
            atomic_write_publication_record(record_path, existing)
            return existing
        if existing_id and yt_existing.get("publicVerifiedAt"):
            current = fetch_video(youtube, existing_id)
            _verify_expected_video(current, existing_id, title, description)
            if not verify_privacy(current, "public"):
                raise RuntimeError("previously published video is no longer public")
            if not verify_playback(current):
                raise RuntimeError("previously published video no longer has verified playback eligibility")
            yt_existing["syntheticMediaDisclosureVerified"] = True
            yt_existing["playbackVerified"] = True
            atomic_write_publication_record(record_path, existing)
            return existing

    record = existing or _new_record(render_manifest, identity)
    yt = _ensure_youtube_defaults(record)
    video_id = yt.get("videoId")

    if not video_id:
        video_id = upload_private(
            video_path=video_path,
            title=title,
            description=description,
            youtube=youtube,
        )
        _assert_video_not_rejected(video_id, rejected_video_ids)
        yt["videoId"] = video_id
        yt["url"] = f"https://www.youtube.com/watch?v={video_id}"
        yt["privacyTransitions"] = ["private"]
        yt["lastError"] = None
        atomic_write_publication_record(record_path, record)

    if not yt.get("thumbnailSetSucceeded"):
        try:
            set_thumbnail(video_id, thumbnail_path, youtube=youtube)
        except Exception as exc:
            yt["thumbnailSetSucceeded"] = False
            yt["lastError"] = f"thumbnail upload failed: {exc}"
            atomic_write_publication_record(record_path, record)
            raise RuntimeError(yt["lastError"]) from exc
        yt["thumbnailSetSucceeded"] = True
        yt["lastError"] = None
        atomic_write_publication_record(record_path, record)

    processed = wait_until_processed(youtube, video_id)
    _verify_expected_video(processed, video_id, title, description)
    if not verify_thumbnail_state(
        processed,
        thumbnail_set_succeeded=yt.get("thumbnailSetSucceeded") is True,
    ):
        yt["lastError"] = "thumbnail verification failed"
        atomic_write_publication_record(record_path, record)
        raise RuntimeError(yt["lastError"])

    if not verify_playback(processed):
        yt["playbackVerified"] = False
        yt["lastError"] = "playback eligibility verification failed"
        atomic_write_publication_record(record_path, record)
        raise RuntimeError(yt["lastError"])

    yt["processingVerified"] = True
    yt["metadataVerified"] = True
    yt["syntheticMediaDisclosureVerified"] = True
    yt["playbackVerified"] = True

    current_privacy = (processed.get("status") or {}).get("privacyStatus")
    if current_privacy == "private":
        yt["privateVerifiedAt"] = yt.get("privateVerifiedAt") or _now()
        if "private" not in yt["privacyTransitions"]:
            yt["privacyTransitions"].append("private")
        yt["lastError"] = None
        atomic_write_publication_record(record_path, record)

        if stop_after_private:
            return record

        if promotion_youtube is None:
            if injected_youtube:
                promotion_youtube = youtube
            else:
                try:
                    promotion_youtube = build_public_promotion_service()
                except RuntimeError as exc:
                    yt["lastError"] = str(exc)
                    atomic_write_publication_record(record_path, record)
                    raise RuntimeError(yt["lastError"]) from exc

        promote_public(promotion_youtube, video_id)
    elif current_privacy != "public":
        yt["lastError"] = f"unexpected privacy status before promotion: {current_privacy!r}"
        atomic_write_publication_record(record_path, record)
        raise RuntimeError(yt["lastError"])
    elif stop_after_private:
        raise RuntimeError("private-only mode refused a video that is already public")

    final_video = fetch_video(youtube, video_id)
    _verify_expected_video(final_video, video_id, title, description)
    if not verify_privacy(final_video, "public"):
        yt["lastError"] = "YouTube final privacy verification did not return public"
        atomic_write_publication_record(record_path, record)
        raise RuntimeError(yt["lastError"])

    published_at = yt.get("publicVerifiedAt") or _now()
    yt["publicVerifiedAt"] = published_at
    yt["lastError"] = None
    if "public" not in yt["privacyTransitions"]:
        yt["privacyTransitions"].append("public")
    atomic_write_publication_record(record_path, record)

    if daily_control.get("lastCountedVideoId") != video_id:
        daily_control["publishedToday"] = daily_control.get("publishedToday", 0) + 1
        daily_control["lastPublicationAt"] = published_at
        daily_control["lastCountedVideoId"] = video_id

    return record


def _load_json(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _main() -> None:
    parser = argparse.ArgumentParser(description="Publish the exact QA-approved episode")
    parser.add_argument("--video", required=True)
    parser.add_argument("--thumbnail", required=True)
    parser.add_argument("--identity", required=True)
    parser.add_argument("--qa-review", required=True)
    parser.add_argument("--episode-state", required=True)
    parser.add_argument("--render-manifest", required=True)
    parser.add_argument("--autonomy", required=True)
    parser.add_argument("--daily-control", required=True)
    parser.add_argument("--production-input", required=True)
    parser.add_argument("--publication-record", required=True)
    parser.add_argument("--stop-after-private", action="store_true")
    args = parser.parse_args()

    daily = _load_json(args.daily_control)
    record = publish_episode(
        video_path=args.video,
        thumbnail_path=args.thumbnail,
        identity=_load_json(args.identity),
        qa_review=_load_json(args.qa_review),
        episode_state=_load_json(args.episode_state),
        render_manifest=_load_json(args.render_manifest),
        autonomy=_load_json(args.autonomy),
        daily_control=daily,
        production_input=_load_json(args.production_input),
        publication_record_path=args.publication_record,
        stop_after_private=args.stop_after_private,
    )
    _atomic_write_json(args.daily_control, daily)
    print(json.dumps(record))


if __name__ == "__main__":
    _main()
