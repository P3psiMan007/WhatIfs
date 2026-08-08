#!/usr/bin/env python
"""Fetch and verify the approved external thumbnail for the current episode."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import struct
import tempfile
import urllib.request
from pathlib import Path

MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024


def jpeg_dimensions(data: bytes) -> tuple[int, int]:
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        raise ValueError("thumbnail is not a JPEG")
    pos = 2
    while pos + 4 <= len(data):
        if data[pos] != 0xFF:
            pos += 1
            continue
        while pos < len(data) and data[pos] == 0xFF:
            pos += 1
        if pos >= len(data):
            break
        marker = data[pos]
        pos += 1
        if marker in (0xD8, 0xD9):
            continue
        if pos + 2 > len(data):
            break
        seg_len = struct.unpack(">H", data[pos:pos + 2])[0]
        if seg_len < 2 or pos + seg_len > len(data):
            raise ValueError("invalid JPEG segment")
        if marker in {
            0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
            0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF,
        }:
            if seg_len < 7:
                raise ValueError("invalid JPEG size segment")
            height, width = struct.unpack(">HH", data[pos + 3:pos + 7])
            return width, height
        pos += seg_len
    raise ValueError("JPEG dimensions not found")


def validate_thumbnail_bytes(data: bytes, source: dict) -> None:
    expected_hash = str(source.get("sha256") or "").lower()
    actual_hash = hashlib.sha256(data).hexdigest()
    if len(expected_hash) != 64 or actual_hash != expected_hash:
        raise ValueError(
            f"thumbnail SHA-256 mismatch: expected={expected_hash!r} actual={actual_hash}"
        )
    width, height = jpeg_dimensions(data)
    expected_width = int(source.get("width") or 0)
    expected_height = int(source.get("height") or 0)
    if (width, height) != (expected_width, expected_height):
        raise ValueError(
            f"thumbnail dimensions mismatch: expected={expected_width}x{expected_height} actual={width}x{height}"
        )
    if source.get("mimeType") != "image/jpeg":
        raise ValueError("thumbnail source must declare image/jpeg")


def validate_source(source: dict, manifest: dict) -> None:
    if source.get("approvedForCurrentEpisode") is not True:
        raise ValueError("thumbnail override is not approved")
    if source.get("episodeId") != manifest.get("episodeId"):
        raise ValueError("thumbnail episodeId does not match render manifest")
    if source.get("packageId") != manifest.get("chosenPackage"):
        raise ValueError("thumbnail packageId does not match chosen package")
    url = str(source.get("url") or "")
    if not url.startswith("https://"):
        raise ValueError("thumbnail URL must use HTTPS")


def fetch_thumbnail(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "WhatIfs-Factory-V2/1.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = response.read(MAX_THUMBNAIL_BYTES + 1)
    if not data:
        raise ValueError("thumbnail download was empty")
    if len(data) > MAX_THUMBNAIL_BYTES:
        raise ValueError("thumbnail exceeds 5 MB safety limit")
    return data


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass
        raise


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--render-manifest", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    source = json.loads(Path(args.source).read_text(encoding="utf-8"))
    manifest = json.loads(Path(args.render_manifest).read_text(encoding="utf-8"))
    validate_source(source, manifest)
    data = fetch_thumbnail(source["url"])
    validate_thumbnail_bytes(data, source)
    output = Path(args.output)
    atomic_write(output, data)
    print(f"Verified thumbnail override: {output} ({source['sha256']})")


if __name__ == "__main__":
    main()
