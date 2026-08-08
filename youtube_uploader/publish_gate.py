from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


BLOCKING_SEVERITIES = {"publish-blocking", "owner-only-blocker", "major"}
YOUTUBE_API_PUBLICATION_SAFE_STATUSES = {"audited", "legacy-pre-2020"}


@dataclass(frozen=True)
class GateDecision:
    allowed: bool
    reasons: tuple[str, ...]


def _parse_timestamp(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def evaluate_publication_gate(
    qa_review: dict,
    episode_state: dict,
    autonomy: dict,
    daily: dict,
    *,
    now: datetime | None = None,
) -> GateDecision:
    reasons: list[str] = []
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)

    required_score = autonomy.get("requiredCoreScore", 9)
    required_gates = autonomy.get("requiredGates") or []
    publish_ready_states = autonomy.get("publishReadyStates") or []

    if autonomy.get("autoPublishEnabled") is not True:
        reasons.append("autoPublishEnabled is not true")
    if daily.get("pauseAllProduction") is True:
        reasons.append("all production is paused")
    if daily.get("pausePublishing") is True:
        reasons.append("publishing is paused")
    if daily.get("publishedToday", 0) >= daily.get("dailyPublishQuota", 0):
        reasons.append("daily publish quota reached")

    spacing = daily.get("minimumSpacingMinutes", 0)
    last_publication = daily.get("lastPublicationAt")
    if isinstance(spacing, int) and spacing > 0 and last_publication:
        try:
            elapsed_minutes = (now - _parse_timestamp(last_publication)).total_seconds() / 60
            if elapsed_minutes < spacing:
                reasons.append(
                    f"minimum spacing not elapsed: {elapsed_minutes:.1f} < {spacing} minutes"
                )
        except (TypeError, ValueError):
            reasons.append("lastPublicationAt is invalid")

    if qa_review.get("status") != "QA_PASSED":
        reasons.append("QA status is not QA_PASSED")
    if qa_review.get("publishDecision") != "PASS":
        reasons.append("QA publishDecision is not PASS")

    state_name = episode_state.get("state")
    if state_name not in publish_ready_states:
        reasons.append(f"episode state is not publish-ready: {state_name!r}")

    reviewed_revision = qa_review.get("reviewedStateRevision")
    current_revision = episode_state.get("state_revision")
    if reviewed_revision != current_revision:
        reasons.append(
            f"QA state revision mismatch: reviewed={reviewed_revision!r} current={current_revision!r}"
        )

    render_uri = qa_review.get("reviewedRenderAsset")
    if not isinstance(render_uri, str) or not render_uri.startswith("github-actions://run/"):
        reasons.append("reviewed render asset URI is missing or invalid")

    scores = qa_review.get("coreScores") or {}
    for gate in required_gates:
        score = scores.get(gate)
        if not isinstance(score, (int, float)):
            reasons.append(f"required gate score missing: {gate}")
        elif score < required_score:
            reasons.append(
                f"required gate below threshold: {gate}={score} < {required_score}"
            )

    for failure in qa_review.get("failures") or []:
        severity = failure.get("severity")
        if severity in BLOCKING_SEVERITIES:
            finding = failure.get("finding") or "unspecified finding"
            reasons.append(f"blocking QA failure ({severity}): {finding}")

    if qa_review.get("externalBlocker"):
        reasons.append("external QA blocker is present")

    verification = autonomy.get("verification") or {}
    required_verification_flags = (
        "privateFirst",
        "requireProcessingVerification",
        "requireMetadataVerification",
        "requireThumbnailVerification",
        "promoteSameVideoIdOnly",
    )
    for flag in required_verification_flags:
        if verification.get(flag) is not True:
            reasons.append(f"verification control not enabled: {flag}")

    publication = autonomy.get("publication") or {}
    if publication.get("failClosedOnUncertainty") is not True:
        reasons.append("failClosedOnUncertainty is not enabled")

    # Factory V2.1 safety: YouTube officially locks uploads from newer,
    # unaudited Data API projects to private viewing mode. The current project
    # has not yet been proven audited or legacy/pre-2020, so videos.insert must
    # fail BEFORE upload while status is missing/unknown. Older test fixtures
    # without the version field remain compatible; real v1.1 config is strict.
    if autonomy.get("autonomy_version") == "1.1":
        api_project_status = publication.get("youtubeApiProjectStatus")
        if api_project_status not in YOUTUBE_API_PUBLICATION_SAFE_STATUSES:
            reasons.append(
                "YouTube API project is not cleared for public-capable uploads: "
                f"status={api_project_status!r}; require 'audited' or 'legacy-pre-2020'"
            )

    return GateDecision(allowed=not reasons, reasons=tuple(reasons))
