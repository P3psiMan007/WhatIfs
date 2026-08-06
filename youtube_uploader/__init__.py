"""Reusable YouTube upload module for the WhatIfs project.

Public API:
    upload_video(video_path, title, description="", thumbnail_path=None, ...)

All uploads made through this module are PRIVATE. See uploader.py.
"""
from .uploader import upload_video

__all__ = ["upload_video"]
