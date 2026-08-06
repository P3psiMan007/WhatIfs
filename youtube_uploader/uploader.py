"""Reusable YouTube uploader.

Uploads created through this module are ALWAYS private. This backs an
automated pipeline and must never publish publicly on its own - promote a
video to public/unlisted manually in YouTube Studio after review, if ever.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Optional

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

from .auth import credentials_from_env

API_SERVICE_NAME = "youtube"
API_VERSION = "v3"

# Hard-locked: this module only ever uploads as private. Not exposed as a
# caller-overridable parameter on purpose.
PRIVACY_STATUS = "private"


def upload_video(
    video_path: str,
    title: str,
    description: str = "",
    thumbnail_path: Optional[str] = None,
    tags: Optional[list] = None,
    category_id: str = "22",  # YouTube category 22 = "People & Blogs"
) -> str:
    """Upload ``video_path`` to YouTube as a PRIVATE video.

    Returns the resulting video ID.
    """
    video_file = Path(video_path)
    if not video_file.is_file():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    credentials = credentials_from_env()
    youtube = build(API_SERVICE_NAME, API_VERSION, credentials=credentials)

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

    media = MediaFileUpload(str(video_file), chunksize=-1, resumable=True, mimetype="video/*")
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%")

    video_id = response["id"]
    print(f"Upload complete. Video ID: {video_id} (privacyStatus={response['status']['privacyStatus']})")

    if thumbnail_path:
        thumb_file = Path(thumbnail_path)
        if not thumb_file.is_file():
            raise FileNotFoundError(f"Thumbnail file not found: {thumbnail_path}")
        try:
            youtube.thumbnails().set(
                videoId=video_id, media_body=MediaFileUpload(str(thumb_file))
            ).execute()
            print("Thumbnail set.")
        except HttpError as e:
            # Thumbnail upload requires a phone-verified channel on Google's
            # side; surface the problem but don't fail the whole upload.
            print(f"Warning: thumbnail upload failed: {e}", file=sys.stderr)

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
