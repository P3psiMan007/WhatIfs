from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path


REQUIRED_TOP_LEVEL = ("publicationVersion", "episodeId", "sourceRender", "youtube")


def _validate_record(record: dict) -> dict:
    if not isinstance(record, dict):
        raise ValueError("publication record must be a JSON object")
    for key in REQUIRED_TOP_LEVEL:
        if key not in record:
            raise ValueError(f"publication record missing required field: {key}")
    if record.get("publicationVersion") != "1.0":
        raise ValueError("unsupported publicationVersion")
    if not isinstance(record.get("sourceRender"), dict):
        raise ValueError("sourceRender must be an object")
    if not isinstance(record.get("youtube"), dict):
        raise ValueError("youtube must be an object")
    return record


def load_publication_record(path: str | Path) -> dict | None:
    path = Path(path)
    if not path.is_file():
        return None
    record = json.loads(path.read_text(encoding="utf-8"))
    return _validate_record(record)


def atomic_write_publication_record(path: str | Path, record: dict) -> None:
    path = Path(path)
    _validate_record(record)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(record, indent=2, sort_keys=True) + "\n"

    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent), text=True
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass
        raise


def same_source_render(record: dict, identity: dict) -> bool:
    source = record.get("sourceRender") or {}
    return all(
        source.get(key) == identity.get(key)
        for key in ("runId", "artifactName", "videoSha256")
    )
