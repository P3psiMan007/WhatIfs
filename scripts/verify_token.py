#!/usr/bin/env python
"""Verify a stored YouTube refresh token for private staging or full publishing.

By default this checks the full Factory V2 scope set, including the management
scope required to promote an already-verified private video to public.

Use --private-only to verify the older upload + read-only scopes used for
PRIVATE upload and read-back verification. This mode never proves public
promotion permission.

Usage:
    python scripts/verify_token.py [--token-file PATH] [--private-only]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from youtube_uploader.auth import (  # noqa: E402
    AUTHORIZE_SCOPES,
    PRIVATE_VERIFY_SCOPES,
    credentials_from_refresh_token,
    ensure_publication_credentials,
)

DEFAULT_TOKEN_FILE = Path.home() / ".whatifs-youtube-secrets" / "youtube_token.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-file", default=str(DEFAULT_TOKEN_FILE))
    parser.add_argument(
        "--private-only",
        action="store_true",
        help="Verify only the scopes needed for private upload + read-back.",
    )
    args = parser.parse_args()

    token_path = Path(args.token_file)
    if not token_path.is_file():
        raise SystemExit(f"Token file not found: {token_path}")

    data = json.loads(token_path.read_text())
    scopes = PRIVATE_VERIFY_SCOPES if args.private_only else AUTHORIZE_SCOPES
    credentials = credentials_from_refresh_token(
        client_id=data["client_id"],
        client_secret=data["client_secret"],
        refresh_token=data["refresh_token"],
        scopes=scopes,
    )

    if args.private_only:
        try:
            credentials.refresh(Request())
        except RefreshError as exc:
            raise SystemExit(
                "YouTube OAuth token cannot perform private upload/read-back verification."
            ) from exc
    else:
        try:
            ensure_publication_credentials(credentials)
        except RuntimeError as exc:
            raise SystemExit(str(exc)) from exc

    youtube = build("youtube", "v3", credentials=credentials)
    response = youtube.channels().list(part="snippet,status", mine=True).execute()

    items = response.get("items", [])
    if not items:
        raise SystemExit(
            "The refresh token works but no YouTube channel is associated with this Google account."
        )

    channel = items[0]["snippet"]
    mode = "private upload + verification" if args.private_only else "private → verify → public publishing"
    print(f"Refresh token is VALID for Factory V2 {mode}.")
    print(f"Authorized channel: {channel['title']}")
    print(f"Channel ID: {items[0]['id']}")


if __name__ == "__main__":
    main()
