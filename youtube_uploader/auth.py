"""Shared authentication helpers for the YouTube publisher lifecycle.

Factory V2 needs to upload a video privately, read it back for verification,
and then change that same video's privacy status to public. YouTube's
``videos.update`` method requires the broader ``youtube`` management scope;
``youtube.upload`` alone is not enough for that final privacy transition.

Refresh-token grants are fixed at consent time. An older token that was
minted without ``youtube`` must be re-authorized once before Factory V2 can
publish automatically.
"""
from __future__ import annotations

import os

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload"
YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"
YOUTUBE_MANAGE_SCOPE = "https://www.googleapis.com/auth/youtube"
YT_ANALYTICS_READONLY_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly"

# Keep upload/readonly explicit for auditability even though the broader
# management grant overlaps them. Analytics remains a separate read-only API.
AUTHORIZE_SCOPES = [
    YOUTUBE_UPLOAD_SCOPE,
    YOUTUBE_READONLY_SCOPE,
    YOUTUBE_MANAGE_SCOPE,
    YT_ANALYTICS_READONLY_SCOPE,
]

TOKEN_URI = "https://oauth2.googleapis.com/token"


def credentials_from_refresh_token(
    client_id: str,
    client_secret: str,
    refresh_token: str,
    scopes=None,
) -> Credentials:
    """Build credentials from a stored refresh token.

    ``scopes`` must be derivable from the scopes originally granted to the
    refresh token; constructing this object does not grant new privileges.
    """
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri=TOKEN_URI,
        client_id=client_id,
        client_secret=client_secret,
        scopes=scopes or AUTHORIZE_SCOPES,
    )


def ensure_publication_credentials(credentials: Credentials, *, request=None) -> Credentials:
    """Refresh credentials and fail before upload if public promotion is impossible."""
    request = request or Request()
    try:
        credentials.refresh(request)
    except RefreshError as exc:
        raise RuntimeError(
            "YouTube OAuth token cannot satisfy Factory V2 publication scopes; "
            "re-authorize once with scripts/authorize.py and replace the GitHub refresh token."
        ) from exc

    requested = set(credentials.scopes or [])
    if YOUTUBE_MANAGE_SCOPE not in requested:
        raise RuntimeError(
            "YouTube management scope is missing; re-authorize with scripts/authorize.py."
        )

    # Google may omit granted_scopes when the granted and requested scopes are
    # identical. If it is present, treat it as authoritative and fail closed.
    granted = credentials.granted_scopes
    if granted is not None and YOUTUBE_MANAGE_SCOPE not in set(granted):
        raise RuntimeError(
            "YouTube management scope was not granted; re-authorize with scripts/authorize.py."
        )
    return credentials


def credentials_from_env(scopes=None) -> Credentials:
    """Build publisher credentials from GitHub Actions/local environment vars."""
    try:
        client_id = os.environ["YOUTUBE_CLIENT_ID"]
        client_secret = os.environ["YOUTUBE_CLIENT_SECRET"]
        refresh_token = os.environ["YOUTUBE_REFRESH_TOKEN"]
    except KeyError as missing:
        raise SystemExit(
            f"Missing required environment variable: {missing.args[0]}. "
            "Expected YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN."
        ) from missing

    return credentials_from_refresh_token(
        client_id,
        client_secret,
        refresh_token,
        scopes=scopes or AUTHORIZE_SCOPES,
    )
