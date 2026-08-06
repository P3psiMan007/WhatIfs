"""Shared authentication helpers for the YouTube uploader.

Scope note: ``youtube.upload`` is the minimum YouTube Data API v3 scope that
covers everything the automated pipeline needs: uploading videos, setting
title/description/tags/category, controlling privacyStatus (private), and
calling thumbnails.set. We deliberately do NOT request the broader
``youtube`` or ``youtube.force-ssl`` scopes, which would also grant deleting
videos, managing playlists, comments, etc.

``youtube.upload`` alone cannot call any read endpoint (channels.list,
videos.list, etc. all return 403 insufficient_scope) - confirmed empirically
against the live API, not assumed. Since a one-time harmless verification
call is required after authorizing (see scripts/verify_token.py), the local
authorization flow additionally requests ``youtube.readonly``, purely so
that verification step is possible. The uploader pipeline itself
(uploader.py) never calls any read-only endpoint and would work fine on a
token that only had ``youtube.upload``.
"""
from __future__ import annotations

import os

from google.oauth2.credentials import Credentials

YOUTUBE_UPLOAD_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"

# Scopes requested during the one-time local authorization flow. Includes
# youtube.readonly on top of the functional upload scope so the post-auth
# verification step can make a real (harmless) read call.
AUTHORIZE_SCOPES = YOUTUBE_UPLOAD_SCOPES + [YOUTUBE_READONLY_SCOPE]

TOKEN_URI = "https://oauth2.googleapis.com/token"


def credentials_from_refresh_token(
    client_id: str, client_secret: str, refresh_token: str, scopes=None
) -> Credentials:
    """Build a Credentials object from a stored refresh token.

    No access token is embedded; google-auth silently mints a fresh access
    token from the refresh token the first time it's needed. `scopes` is
    informational here (the actual grant is fixed to whatever the refresh
    token was issued with); defaults to the functional upload-only scope.
    """
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri=TOKEN_URI,
        client_id=client_id,
        client_secret=client_secret,
        scopes=scopes or YOUTUBE_UPLOAD_SCOPES,
    )


def credentials_from_env() -> Credentials:
    """Build credentials from environment variables.

    Expects YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
    - the same names used for the GitHub Actions repository secrets, so this
    works unchanged in CI and in a local shell with those vars exported.
    """
    try:
        client_id = os.environ["YOUTUBE_CLIENT_ID"]
        client_secret = os.environ["YOUTUBE_CLIENT_SECRET"]
        refresh_token = os.environ["YOUTUBE_REFRESH_TOKEN"]
    except KeyError as missing:
        raise SystemExit(
            f"Missing required environment variable: {missing.args[0]}. "
            "Expected YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN."
        ) from missing

    return credentials_from_refresh_token(client_id, client_secret, refresh_token)
