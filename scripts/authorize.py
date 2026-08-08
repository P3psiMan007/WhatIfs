#!/usr/bin/env python
"""One-time local OAuth authorization for the WhatIfs YouTube publisher.

Run this on a machine with a browser to mint a refresh token. Factory V2
needs authorization to upload a video privately, verify it, and change that
same video's privacy status to public after QA. It does NOT print the client
secret or refresh token to the terminal.

Usage:
    python scripts/authorize.py [--client-secret PATH] [--out PATH]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from youtube_uploader.auth import AUTHORIZE_SCOPES  # noqa: E402

DEFAULT_CLIENT_SECRET = Path.home() / ".whatifs-youtube-secrets" / "client_secret.json"
DEFAULT_OUT = Path.home() / ".whatifs-youtube-secrets" / "youtube_token.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--client-secret", default=str(DEFAULT_CLIENT_SECRET))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    client_secret_path = Path(args.client_secret)
    if not client_secret_path.is_file():
        raise SystemExit(f"OAuth client JSON not found at {client_secret_path}")

    print(f"Using OAuth client credential: {client_secret_path.name} (contents not displayed)")
    print("Requesting scopes:")
    for scope in AUTHORIZE_SCOPES:
        print(f"  - {scope}")
    print()
    print("Factory V2 uses these scopes to upload privately, verify the exact")
    print("video, promote that same video to public after strict QA, and later")
    print("read channel analytics. It does not automatically delete videos.")
    print()
    print(">>> Your browser will open to a Google sign-in / consent screen.")
    print(">>> Select the Google account linked to your YouTube channel, then click Allow.")
    print()

    flow = InstalledAppFlow.from_client_secrets_file(str(client_secret_path), AUTHORIZE_SCOPES)
    credentials = flow.run_local_server(
        port=0,
        open_browser=True,
        success_message="Authorization complete. You can close this browser tab and return to the terminal.",
        authorization_prompt_message="Please authorize Factory V2 in your browser.",
    )

    if not credentials.refresh_token:
        raise SystemExit(
            "No refresh token was returned. Revoke prior access at "
            "https://myaccount.google.com/permissions and re-run this script "
            "so Google shows the updated consent scopes."
        )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "scopes": credentials.scopes,
    }
    out_path.write_text(json.dumps(payload, indent=2))

    try:
        import os

        os.chmod(out_path, 0o600)
    except Exception:
        pass

    print(f"Token saved to: {out_path}")
    print(f"client_id (masked): {credentials.client_id[:16]}...")
    print("client_secret and refresh_token were NOT printed to the terminal.")


if __name__ == "__main__":
    main()
