#!/usr/bin/env python
"""Install the locally authorized YouTube refresh token into GitHub Actions.

The token is read from the gitignored authorization file and sent to the
GitHub CLI over stdin. It is never printed and never placed in process argv.

Usage:
    python scripts/install_youtube_refresh_secret.py
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path

DEFAULT_TOKEN_FILE = Path.home() / ".whatifs-youtube-secrets" / "youtube_token.json"
DEFAULT_REPO = "P3psiMan007/WhatIfs"


def install_refresh_secret(token_file: Path, repo: str) -> None:
    if shutil.which("gh") is None:
        raise RuntimeError(
            "GitHub CLI (gh) is required for the automatic secret install. "
            "Install/authenticate gh, or update YOUTUBE_REFRESH_TOKEN manually in GitHub Actions secrets."
        )
    if not token_file.is_file():
        raise RuntimeError(f"YouTube token file not found: {token_file}")

    data = json.loads(token_file.read_text(encoding="utf-8"))
    refresh_token = data.get("refresh_token")
    if not isinstance(refresh_token, str) or not refresh_token.strip():
        raise RuntimeError("youtube_token.json does not contain a usable refresh_token")

    auth = subprocess.run(
        ["gh", "auth", "status"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if auth.returncode != 0:
        raise RuntimeError(
            "GitHub CLI is not authenticated. Run `gh auth login` once, then retry."
        )

    result = subprocess.run(
        ["gh", "secret", "set", "YOUTUBE_REFRESH_TOKEN", "--repo", repo],
        input=refresh_token.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"GitHub secret update failed: {detail or 'unknown gh error'}")

    print(f"Updated GitHub Actions secret YOUTUBE_REFRESH_TOKEN for {repo}.")
    print("The refresh token was not printed to the terminal.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-file", default=str(DEFAULT_TOKEN_FILE))
    parser.add_argument("--repo", default=DEFAULT_REPO)
    args = parser.parse_args()
    install_refresh_secret(Path(args.token_file), args.repo)


if __name__ == "__main__":
    main()
