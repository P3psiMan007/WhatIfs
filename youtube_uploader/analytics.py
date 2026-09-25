"""Post-publication YouTube Analytics reader ("Analytics Brain", Phase 4).

Reads verified metrics for the published video at the 24h / 72h / 7d
checkpoints and stores them under ``analytics.*`` in the episode state.

Rules (see docs/EPISODE_STATE_PROTOCOL.md and the Factory V2 spec):

- Only a video with a verified public publication record is read.
- Only checkpoints that are actually due and not yet recorded are fetched.
- Metrics the API does not return are recorded as unavailable, never invented.
- This module never writes KEEP/CHANGE/AVOID/TEST_NEXT decisions; those stay
  with the Critic + Analytics role, which reads the snapshots written here.
- State writes are revision-safe: abort if the on-disk revision changed.
"""
from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .auth import YT_ANALYTICS_READONLY_SCOPE, credentials_from_env
from .publication_record import load_publication_record

ACTOR = "analytics-reader"

CHECKPOINTS = (
    ("24h", timedelta(hours=24)),
    ("72h", timedelta(hours=72)),
    ("7d", timedelta(days=7)),
)

# Core per-video totals. Impressions and impression CTR are not exposed by the
# YouTube Analytics API reports.query endpoint, so they are recorded as
# unavailable rather than estimated.
CORE_METRICS = (
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "subscribersGained",
    "subscribersLost",
    "likes",
    "comments",
    "shares",
)
UNAVAILABLE_METRICS = {
    "impressions": "not exposed by YouTube Analytics reports.query",
    "impressionClickThroughRate": "not exposed by YouTube Analytics reports.query",
}

# Small samples produce noisy signals; the critic must not act on them alone.
MIN_VIEWS_FOR_SIGNAL = 100


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def published_video(record: dict | None) -> tuple[str, datetime] | None:
    """Return (videoId, publicVerifiedAt) for a verified public video, else None."""
    if not record:
        return None
    yt = record.get("youtube") or {}
    video_id = yt.get("videoId")
    public_at = yt.get("publicVerifiedAt")
    if not video_id or not public_at:
        return None
    return video_id, _parse_time(public_at)


def due_checkpoints(published_at: datetime, now: datetime, recorded: dict) -> list[str]:
    return [
        name
        for name, offset in CHECKPOINTS
        if now >= published_at + offset and name not in recorded
    ]


def _rows_to_dicts(response: dict) -> list[dict]:
    headers = [h["name"] for h in response.get("columnHeaders") or []]
    return [dict(zip(headers, row)) for row in response.get("rows") or []]


def fetch_snapshot(service, video_id: str, published_at: datetime, now: datetime) -> dict:
    """Query YouTube Analytics for one video, lifetime-to-date."""
    common = {
        "ids": "channel==MINE",
        "startDate": published_at.date().isoformat(),
        "endDate": now.date().isoformat(),
        "filters": f"video=={video_id}",
    }
    reports = service.reports()

    totals_rows = _rows_to_dicts(
        reports.query(metrics=",".join(CORE_METRICS), **common).execute()
    )
    metrics = dict(totals_rows[0]) if totals_rows else {}
    missing = [m for m in CORE_METRICS if m not in metrics]

    traffic = {
        row["insightTrafficSourceType"]: row.get("views")
        for row in _rows_to_dicts(
            reports.query(
                metrics="views",
                dimensions="insightTrafficSourceType",
                sort="-views",
                **common,
            ).execute()
        )
    }

    retention = [
        {"ratio": row["elapsedVideoTimeRatio"], "audienceWatchRatio": row.get("audienceWatchRatio")}
        for row in _rows_to_dicts(
            reports.query(
                metrics="audienceWatchRatio,relativeRetentionPerformance",
                dimensions="elapsedVideoTimeRatio",
                **common,
            ).execute()
        )
    ]

    unavailable = dict(UNAVAILABLE_METRICS)
    for name in missing:
        unavailable[name] = "no data returned yet (YouTube Analytics lags 24-72h)"
    if not traffic:
        unavailable["trafficSources"] = "no data returned yet"
    if not retention:
        unavailable["retentionCurve"] = "no data returned yet"

    return {
        "fetched_at": _iso(now),
        "window": {"start": common["startDate"], "end": common["endDate"]},
        "metrics": metrics,
        "traffic_sources": traffic,
        "retention_curve": retention,
        "unavailable": unavailable,
    }


def _sample_note(snapshots: dict) -> str:
    latest = snapshots[max(snapshots, key=lambda k: snapshots[k]["fetched_at"])]
    views = (latest.get("metrics") or {}).get("views")
    if views is None:
        return "No verified view count yet; do not draw conclusions."
    if views < MIN_VIEWS_FOR_SIGNAL:
        return f"Only {views} views; sample too small to change editorial decisions."
    return f"{views} views at latest checkpoint; enough for directional signals only."


def read_state(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_state(path: Path, state: dict, expected_revision: int, episode_id: str, analytics: dict) -> dict:
    """Revision-safe patch of the analytics section, mirroring tools/episode-state.mjs."""
    current = read_state(path)
    if current.get("state_revision") != expected_revision:
        raise RuntimeError(
            f"revision conflict: expected {expected_revision}, found {current.get('state_revision')}"
        )
    if current.get("episode_id") != episode_id:
        raise RuntimeError(f"episode mismatch: expected {episode_id}, found {current.get('episode_id')}")
    now = _iso(datetime.now(timezone.utc))
    current["analytics"] = {**(current.get("analytics") or {}), **analytics}
    current["state_revision"] += 1
    current["updated_at"] = now
    current["updated_by"] = ACTOR
    current.setdefault("history", []).append(
        {
            "revision": current["state_revision"],
            "at": now,
            "actor": ACTOR,
            "from": current.get("state"),
            "to": current.get("state"),
            "reason": "patch",
        }
    )
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent), text=True)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(current, indent=2) + "\n")
    os.replace(tmp, path)
    return current


def run(state_path: Path, publication_path: Path, service_factory, now: datetime | None = None) -> dict:
    """Fetch every due checkpoint and record it. Returns a JSON-able result."""
    now = now or datetime.now(timezone.utc)
    state = read_state(state_path)
    revision = state.get("state_revision")
    episode_id = state.get("episode_id")

    record = load_publication_record(publication_path)
    if record and record.get("episodeId") != episode_id:
        return {"status": "noop", "reason": "publication record belongs to a different episode"}
    published = published_video(record)
    if not published:
        return {"status": "noop", "reason": "no verified public publication for the current episode"}
    video_id, published_at = published

    analytics = state.get("analytics") or {}
    snapshots = dict(analytics.get("snapshots") or {})
    due = due_checkpoints(published_at, now, snapshots)
    if not due:
        return {"status": "noop", "reason": "no checkpoint due", "videoId": video_id}

    try:
        service = service_factory()
        snapshot = fetch_snapshot(service, video_id, published_at, now)
    except Exception as exc:  # fail closed: record unavailability, never invent data
        patch = {
            "last_checked_at": _iso(now),
            "last_error": f"{type(exc).__name__}: {exc}"[:500],
        }
        write_state(state_path, state, revision, episode_id, patch)
        return {"status": "unavailable", "videoId": video_id, "due": due, "error": patch["last_error"]}

    # One lifetime-to-date query satisfies every overdue checkpoint.
    for name in due:
        snapshots[name] = {**snapshot, "checkpoint": name}
    latest = snapshots[due[-1]]
    patch = {
        "video_id": video_id,
        "published_at": _iso(published_at),
        "last_checked_at": _iso(now),
        "last_error": None,
        "snapshots": snapshots,
        "metrics": latest["metrics"],
        "sample_note": _sample_note(snapshots),
    }
    write_state(state_path, state, revision, episode_id, patch)
    return {"status": "recorded", "videoId": video_id, "checkpoints": due}


def build_service():
    from googleapiclient.discovery import build

    credentials = credentials_from_env(scopes=[YT_ANALYTICS_READONLY_SCOPE])
    return build("youtubeAnalytics", "v2", credentials=credentials, cache_discovery=False)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--state", default="episodes/current/episode-state.json")
    parser.add_argument("--publication-record", default="episodes/current/publication.json")
    args = parser.parse_args(argv)
    result = run(Path(args.state), Path(args.publication_record), build_service)
    print(json.dumps(result, indent=2))
    return 1 if result["status"] == "unavailable" else 0


if __name__ == "__main__":
    raise SystemExit(main())
