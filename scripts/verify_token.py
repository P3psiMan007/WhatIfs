#!/usr/bin/env python
"""Verify a stored YouTube refresh token is ready for Factory V2.

Refreshes the token using the full approved Factory V2 scope set, then makes
one harmless read-only channel call. If the old refresh token cannot satisfy
the new YouTube management scope, verification fails before any upload.

Usage:
    python scripts/verify_token.py [--token-file PATH]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from googleapiclient.discovery import build

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from youtube_uploader.auth import (  # noqa: E402
    AUTHORIZE_SCOPES,
    credentials_from_refresh_token,
    ensure_publication_credentials,
)

DEFAULT_TOKEN_FILE = Path.home() / ".whatifs-youtube-secrets" / "youtube_token.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-file", default=str(DEFAULT_TOKEN_FILE))
    args = parser.parse_args()

    token_path = Path(args.token_file)
    if not token_path.is_file():
        raise SystemExit(f"Token file not found: {token_path}")

    data = json.loads(token_path.read_text())
    credentials = credentials_from_refresh_token(
        client_id=data["client_id"],
        client_secret=data["client_secret"],
        refresh_token=data["refresh_token"],
        scopes=AUTHORIZE_SCOPES,
    )
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
    print("Refresh token is VALID for Factory V2 private → verify → public publishing.")
    print(f"Authorized channel: {channel['title']}")
    print(f"Channel ID: {items[0]['id']}")


if __name__ == "__main__":
    main()
