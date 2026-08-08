from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .publication_record import (
    atomic_write_publication_record,
    load_publication_record,
    same_source_render,
)
from .publish_gate import evaluate_publication_gate
from .uploader import build_youtube_service, set_thumbnail, upload_private
from .verifier import (
    fetch_video,
    promote_public,
    verify_metadata,
    verify_privacy,
    verify_thumbnail_state,
    wait_until_processed,
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


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
    publication_record_path: str,
    youtube=None,
) -> dict:
    """Publish one exact approved render via private → verify → public.

    The function persists the YouTube video ID immediately after upload so a
    retry can resume without duplicate-uploading the same render.
    """
    record_path = Path(publication_record_path)
    existing = load_publication_record(record_path)
    youtube = youtube or build_youtube_service()
    title = render_manifest.get("title") or ""
    description = render_manifest.get("description") or ""

    if existing is not None and not same_source_render(existing, identity):
        if (existing.get("youtube") or {}).get("videoId"):
            raise RuntimeError(
                "existing publication record belongs to a different source render; refusing to reuse its YouTube video ID"
            )
        existing = None

    # Idempotent final-state fast path: verification only, no new publishing
    # side effect and no daily-quota re-count.
    if existing is not None:
        yt_existing = _ensure_youtube_defaults(existing)
        existing_id = yt_existing.get("videoId")
        if existing_id and yt_existing.get("publicVerifiedAt"):
            current = fetch_video(youtube, existing_id)
            _verify_expected_video(current, existing_id, title, description)
            if not verify_privacy(current, "public"):
                raise RuntimeError("previously published video is no longer public")
            return existing

    decision = evaluate_publication_gate(qa_review, episode_state, autonomy, daily_control)
    if not decision.allowed:
        raise RuntimeError("publication gate blocked: " + "; ".join(decision.reasons))

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

    yt["processingVerified"] = True
    yt["metadataVerified"] = True

    current_privacy = (processed.get("status") or {}).get("privacyStatus")
    if current_privacy == "private":
        yt["privateVerifiedAt"] = yt.get("privateVerifiedAt") or _now()
        if "private" not in yt["privacyTransitions"]:
            yt["privacyTransitions"].append("private")
        atomic_write_publication_record(record_path, record)
        promote_public(youtube, video_id)
    elif current_privacy != "public":
        yt["lastError"] = f"unexpected privacy status before promotion: {current_privacy!r}"
        atomic_write_publication_record(record_path, record)
        raise RuntimeError(yt["lastError"])

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

    # Count the real publication once. lastCountedVideoId makes retries
    # idempotent even if the workflow re-runs after committing daily-control.
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
    parser.add_argument("--publication-record", required=True)
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
        publication_record_path=args.publication_record,
    )
    _atomic_write_json(args.daily_control, daily)
    print(json.dumps(record))


if __name__ == "__main__":
    _main()
