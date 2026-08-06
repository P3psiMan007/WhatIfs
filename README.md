# WhatIfs

## Automated private YouTube uploads

This repo can upload videos to YouTube as **private** using the YouTube Data
API v3. Nothing is ever published publicly by this pipeline.

### One-time local setup (already done for this machine)

1. A Google OAuth "Desktop app" client was created in Google Cloud Console
   and its client JSON downloaded.
2. `python scripts/authorize.py` was run locally. It:
   - Opens a browser to Google's consent screen requesting only the
     `youtube.upload` scope (upload videos, set metadata, set thumbnails -
     nothing broader).
   - Saves the resulting refresh token to a local, gitignored file outside
     the repo (`~/.whatifs-youtube-secrets/youtube_token.json`).
3. `python scripts/verify_token.py` confirmed the refresh token works via a
   harmless, read-only API call (fetching the channel's own info).
4. The three values were pushed to this repo's GitHub Actions secrets:
   `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.
5. The local plaintext token file was deleted after the secrets were
   confirmed stored on GitHub.

To re-authorize (e.g. on a new machine, or if the refresh token is ever
revoked), re-download the OAuth client JSON from Google Cloud Console and
re-run `scripts/authorize.py`, then re-run `scripts/verify_token.py`.

### Uploading a video

**Locally**, with the three env vars exported (or a local
`~/.whatifs-youtube-secrets/youtube_token.json` loaded into your shell):

```bash
python -m youtube_uploader.uploader \
  --video path/to/video.mp4 \
  --title "My video" \
  --description "Description here" \
  --thumbnail path/to/thumb.jpg \
  --tags "tag1,tag2"
```

**From GitHub Actions**: run the "Upload video to YouTube (private)"
workflow manually (Actions tab -> workflow_dispatch), supplying the video
path (must be present in the repo checkout), title, description, and
optional thumbnail path and tags.

### Design notes

- Scope: `https://www.googleapis.com/auth/youtube.upload` only - the
  minimum scope covering upload, metadata, and `thumbnails.set`.
- `youtube_uploader/uploader.py` hard-codes `privacyStatus: "private"` -
  it is not exposed as a caller-overridable parameter, by design.
- Credentials come from `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` /
  `YOUTUBE_REFRESH_TOKEN` env vars, which map directly to the GitHub Actions
  repository secrets of the same names.
- No OAuth client JSON, tokens, or `.env` files are ever committed - see
  `.gitignore`.
