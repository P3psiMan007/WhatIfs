"""Shared authentication helpers for the YouTube publisher lifecycle.

The stored refresh token was authorized up front for:
- youtube.upload: upload videos, set metadata/thumbnail, control privacy;
- youtube.readonly: verify processing, metadata, and final privacy state;
- yt-analytics.readonly: future post-publication analytics.

The publisher intentionally does not request broader mutation scopes such as
``youtube`` or ``youtube.force-ssl``.
"""
from __future__ import annotations

import os

from google.oauth2.credentials import Credentials

YOUTUBE_UPLOAD_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"
YT_ANALYTICS_READONLY_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly"
AUTHORIZE_SCOPES = YOUTUBE_UPLOAD_SCOPES + [YOUTUBE_READONLY_SCOPE, YT_ANALYTICS_READONLY_SCOPE]

TOKEN_URI = "https://oauth2.googleapis.com/token"


def credentials_from_refresh_token(
    client_id: str,
    client_secret: str,
    refresh_token: str,
    scopes=None,
) -> Credentials:
    """Build credentials from a stored refresh token.

    Installed-app refresh-token grants are fixed at consent time. ``scopes``
    describes the already-granted scope set used when refreshing; it does not
    add privileges to an existing token.
    """
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri=TOKEN_URI,
        client_id=client_id,
        client_secret=client_secret,
        scopes=scopes or AUTHORIZE_SCOPES,
    )


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
