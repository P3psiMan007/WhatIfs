"""Reusable YouTube upload primitives.

Safety invariant: video insertion always starts PRIVATE. Public promotion is
implemented separately in ``youtube_uploader.verifier`` and is only called by
the fail-closed publisher after processing/metadata/thumbnail verification.
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional

from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from .auth import credentials_from_env, ensure_publication_credentials

API_SERVICE_NAME = "youtube"
API_VERSION = "v3"
PRIVACY_STATUS = "private"


def build_youtube_service(*, require_publication_scope: bool = False):
    credentials = credentials_from_env()
    if require_publication_scope:
        ensure_publication_credentials(credentials)
    return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)


def upload_private(
    video_path: str,
    title: str,
    description: str = "",
    tags: Optional[list] = None,
    category_id: str = "22",
    *,
    youtube=None,
) -> str:
    """Upload a video as PRIVATE and return the resulting YouTube video ID."""
    video_file = Path(video_path)
    if not video_file.is_file():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    youtube = youtube or build_youtube_service()
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags or [],
            "categoryId": category_id,
        },
        "status": {
            "privacyStatus": PRIVACY_STATUS,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(
        str(video_file), chunksize=-1, resumable=True, mimetype="video/*"
    )
    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media,
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%")

    video_id = response.get("id")
    if not video_id:
        raise RuntimeError("YouTube upload completed without a video ID")
    returned_privacy = (response.get("status") or {}).get("privacyStatus")
    if returned_privacy and returned_privacy != PRIVACY_STATUS:
        raise RuntimeError(
            f"YouTube upload did not remain private: privacyStatus={returned_privacy!r}"
        )
    print(f"Private upload complete. Video ID: {video_id}")
    return video_id


def set_thumbnail(video_id: str, thumbnail_path: str, *, youtube=None) -> None:
    """Set the custom thumbnail, raising on any failure."""
    thumb_file = Path(thumbnail_path)
    if not thumb_file.is_file():
        raise FileNotFoundError(f"Thumbnail file not found: {thumbnail_path}")
    youtube = youtube or build_youtube_service()
    youtube.thumbnails().set(
        videoId=video_id,
        media_body=MediaFileUpload(str(thumb_file)),
    ).execute()
    print("Thumbnail set.")


def upload_video(
    video_path: str,
    title: str,
    description: str = "",
    thumbnail_path: Optional[str] = None,
    tags: Optional[list] = None,
    category_id: str = "22",
) -> str:
    """Backward-compatible private upload wrapper used by the legacy CLI."""
    youtube = build_youtube_service()
    video_id = upload_private(
        video_path=video_path,
        title=title,
        description=description,
        tags=tags,
        category_id=category_id,
        youtube=youtube,
    )
    if thumbnail_path:
        set_thumbnail(video_id, thumbnail_path, youtube=youtube)
    return video_id


def _main() -> None:
    parser = argparse.ArgumentParser(description="Upload a video to YouTube as PRIVATE.")
    parser.add_argument("--video", required=True, help="Path to the .mp4 file")
    parser.add_argument("--title", required=True)
    parser.add_argument("--description", default="")
    parser.add_argument("--thumbnail", default=None)
    parser.add_argument("--tags", default=None, help="Comma-separated tags")
    parser.add_argument("--category-id", default="22")
    args = parser.parse_args()

    tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else None
    upload_video(
        video_path=args.video,
        title=args.title,
        description=args.description,
        thumbnail_path=args.thumbnail,
        tags=tags,
        category_id=args.category_id,
    )


if __name__ == "__main__":
    _main()
