# YouTube Data API upload audit safety

Status: **UNKNOWN / fail closed** for the current Google API project until the owner confirms one of the safe states below.

## Why the publisher blocks `videos.insert` while status is unknown

YouTube's official Data API documentation states that videos uploaded through `videos.insert` from **unverified API projects created after 28 July 2020 are restricted to private viewing mode** and that the API project must pass a compliance audit to lift that restriction.

YouTube Help further states that a video locked private because it was uploaded through an unverified API service **cannot be appealed or made public normally**; the creator must re-upload through a verified API service or the YouTube app/site, or the API service must pass an audit.

Authoritative evidence checked 2026-08-09:

- https://developers.google.com/youtube/v3/docs/videos/insert
- https://developers.google.com/youtube/v3/docs/videos
- https://support.google.com/youtube/answer/7300965
- Audit form: https://support.google.com/youtube/contact/yt_api_form

## Allowed control-plane values

`config/autonomy.json -> publication.youtubeApiProjectStatus`

- `unknown` — block API upload before any irreversible `videos.insert` call.
- `audited` — allow API upload only after the owner has durable evidence that this project passed the required YouTube API compliance audit.
- `legacy-pre-2020` — allow only after the owner has durable evidence that this exact API project predates the 28 July 2020 restriction.

Do not infer `audited` from a working OAuth token, enabled YouTube Data API, quota availability, or a successful private upload. Those do not prove public-capable upload status.

## Episode fallback while status is unknown

The factory may still finish render + independent QA. Once an exact render passes all >=9/10 gates, preserve/download that artifact and its approved thumbnail. If API project status remains unknown, use a normal YouTube Studio/app upload rather than risking a locked-private API upload.
