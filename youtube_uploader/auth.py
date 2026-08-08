"""Shared authentication helpers for the YouTube publisher lifecycle.

Factory V2 has two permission stages:

1. Private upload + read-back verification. The existing token can do this
   with ``youtube.upload`` + ``youtube.readonly``.
2. Promote that same verified video to public. YouTube's ``videos.update``
   requires the broader ``youtube`` management scope.

An older refresh token can therefore still produce a safe verified PRIVATE
upload. It only needs one re-authorization before automatic public promotion.
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

# These are the scopes the existing uploader token was originally authorized
# for and are enough to create + verify a PRIVATE upload.
PRIVATE_VERIFY_SCOPES = [
    YOUTUBE_UPLOAD_SCOPE,
    YOUTUBE_READONLY_SCOPE,
    YT_ANALYTICS_READONLY_SCOPE,
]

# New authorizations request the additional management permission needed by
# videos.update to promote the already-verified private video to public.
AUTHORIZE_SCOPES = [
    *PRIVATE_VERIFY_SCOPES,
    YOUTUBE_MANAGE_SCOPE,
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
    """Prove the refresh token can mint credentials for public promotion."""
    request = request or Request()
    try:
        credentials.refresh(request)
    except RefreshError as exc:
        raise RuntimeError(
            "YouTube OAuth token cannot promote the verified private video to public; "
            "re-authorize once with scripts/authorize.py and replace the GitHub refresh token."
        ) from exc

    requested = set(credentials.scopes or [])
    if YOUTUBE_MANAGE_SCOPE not in requested:
        raise RuntimeError(
            "YouTube management scope is missing; re-authorize with scripts/authorize.py."
        )

    # Google may omit granted_scopes when granted=requested. If present, treat
    # it as authoritative and fail closed when the management permission is absent.
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
