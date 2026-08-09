from __future__ import annotations

import time


WRITABLE_STATUS_FIELDS = (
    "license",
    "embeddable",
    "publicStatsViewable",
    "selfDeclaredMadeForKids",
    "containsSyntheticMedia",
)


def fetch_video(youtube, video_id: str) -> dict:
    response = (
        youtube.videos()
        .list(part="snippet,status,processingDetails", id=video_id)
        .execute()
    )
    items = response.get("items") or []
    if len(items) != 1:
        raise RuntimeError(f"YouTube video not found or ambiguous: {video_id}")
    return items[0]


def wait_until_processed(
    youtube,
    video_id: str,
    *,
    timeout_seconds: int = 900,
    poll_seconds: int = 10,
    sleep_fn=time.sleep,
    monotonic_fn=time.monotonic,
) -> dict:
    started = monotonic_fn()
    while True:
        video = fetch_video(youtube, video_id)
        processing = video.get("processingDetails") or {}
        status = processing.get("processingStatus")
        if status == "succeeded":
            return video
        if status in {"failed", "terminated"}:
            reason = processing.get("processingFailureReason") or "unknown"
            raise RuntimeError(
                f"YouTube processing {status} for {video_id}: {reason}"
            )
        if monotonic_fn() - started >= timeout_seconds:
            raise TimeoutError(f"Timed out waiting for YouTube processing: {video_id}")
        sleep_fn(poll_seconds)


def verify_metadata(
    video: dict,
    *,
    expected_title: str,
    expected_description: str,
) -> tuple[bool, tuple[str, ...]]:
    snippet = video.get("snippet") or {}
    reasons: list[str] = []
    if snippet.get("title") != expected_title:
        reasons.append("title mismatch")
    if snippet.get("description", "") != expected_description:
        reasons.append("description mismatch")
    return (not reasons, tuple(reasons))


def verify_thumbnail_state(video: dict, *, thumbnail_set_succeeded: bool) -> bool:
    thumbnails = (video.get("snippet") or {}).get("thumbnails") or {}
    return thumbnail_set_succeeded is True and bool(thumbnails)


def verify_playback(video: dict) -> bool:
    """Confirm the API reports that the private upload can be played when authorized."""
    status = video.get("status") or {}
    processing = video.get("processingDetails") or {}
    return (
        status.get("uploadStatus") == "processed"
        and status.get("embeddable") is True
        and processing.get("processingStatus") == "succeeded"
    )


def verify_privacy(video: dict, expected: str) -> bool:
    return (video.get("status") or {}).get("privacyStatus") == expected


def promote_public(youtube, video_id: str) -> dict:
    current = fetch_video(youtube, video_id)
    current_status = current.get("status") or {}
    if not current_status:
        raise RuntimeError(f"YouTube status missing for {video_id}")

    writable_status = {
        key: current_status[key]
        for key in WRITABLE_STATUS_FIELDS
        if key in current_status
    }
    writable_status["privacyStatus"] = "public"

    return (
        youtube.videos()
        .update(part="status", body={"id": video_id, "status": writable_status})
        .execute()
    )
