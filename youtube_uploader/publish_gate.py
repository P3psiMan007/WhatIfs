from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import re


BLOCKING_SEVERITIES = {"publish-blocking", "owner-only-blocker", "major"}
DIGEST_RE = re.compile(r"^sha256:[0-9a-f]{64}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
LOCKED_NARRATOR = {
    "provider": "kokoro",
    "voice": "af_heart",
    "speed": 0.95,
    "flowVersion": "continuous-v2",
}


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


def narrator_contract_reasons(narrator: object, *, require_verified: bool = False) -> tuple[str, ...]:
    if not isinstance(narrator, dict):
        return ("narrator attestation is missing",)
    reasons: list[str] = []
    if require_verified and narrator.get("verified") is not True:
        reasons.append("narrator attestation is not verified")
    for field, expected in LOCKED_NARRATOR.items():
        if narrator.get(field) != expected:
            reasons.append(f"narrator {field} is not locked to {expected!r}")
    if require_verified and not SHA256_RE.fullmatch(str(narrator.get("audioSha256") or "").lower()):
        reasons.append("narrator audioSha256 is missing or invalid")
    return tuple(reasons)


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
    if qa_review.get("episodeId") != episode_state.get("episode_id"):
        reasons.append("QA episode does not match the current episode state")
    state_render_asset = (episode_state.get("production") or {}).get("render_asset")
    if not isinstance(state_render_asset, str) or render_uri != state_render_asset:
        reasons.append("QA reviewed render asset does not match the current state render asset")
    if qa_review.get("reviewedExactArtifact") is not True:
        reasons.append("QA does not attest to reviewing the exact render artifact")
    if qa_review.get("authority") != "critic-qa-independent":
        reasons.append("QA authority is not independent")
    if not DIGEST_RE.fullmatch(str(qa_review.get("artifactDigest") or "").lower()):
        reasons.append("QA artifact digest is missing or invalid")
    reasons.extend(narrator_contract_reasons(qa_review.get("narratorVerification"), require_verified=True))
    image_assets = qa_review.get("imageAssetsVerification")
    if not isinstance(image_assets, dict) or image_assets.get("verified") is not True:
        reasons.append("image asset attestation is missing or not verified")
    elif not SHA256_RE.fullmatch(str(image_assets.get("manifestSha256") or "").lower()):
        reasons.append("image asset manifest SHA-256 is missing or invalid")
    elif not isinstance(image_assets.get("assetRevision"), str) or not image_assets["assetRevision"].strip():
        reasons.append("image asset revision is missing")

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

    for blocker in qa_review.get("majorBlockers") or []:
        reasons.append(f"major QA blocker: {blocker}")

    if qa_review.get("externalBlocker"):
        reasons.append("external QA blocker is present")

    verification = autonomy.get("verification") or {}
    required_verification_flags = (
        "privateFirst",
        "requireProcessingVerification",
        "requireMetadataVerification",
        "requireThumbnailVerification",
        "requirePlaybackVerification",
        "promoteSameVideoIdOnly",
    )
    for flag in required_verification_flags:
        if verification.get(flag) is not True:
            reasons.append(f"verification control not enabled: {flag}")

    publication = autonomy.get("publication") or {}
    if publication.get("failClosedOnUncertainty") is not True:
        reasons.append("failClosedOnUncertainty is not enabled")

    return GateDecision(allowed=not reasons, reasons=tuple(reasons))
