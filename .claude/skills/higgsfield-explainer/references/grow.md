# Grow — packaging, translation, shorts, the 30-day plan

Everything after the render. Each section is self-contained; run the one the user asked for.

## Packaging — 3 titles + 3 thumbnails

Packaging decides whether a good video gets watched. The two rules that govern both assets: **one focal point readable at phone size**, and **the title opens a question the thumbnail deliberately doesn't answer** — that gap is the click.

**Titles.** Write three, different mechanisms (not three phrasings of one idea): curiosity gap ("The Ship That Sank an Empire"), stakes/consequence ("This Mistake Cost Rome Everything"), specific number/superlative ("The Three Minutes That Ended the Bronze Age"). ≤60 characters, front-load the hook words, no colon-stuffing, nothing the video doesn't deliver.

**Thumbnails.** Three separate `generate_image` calls (model `nano_banana_pro` — it renders text well, `aspect_ratio: "16:9"`, `medias: [{value: <style_key_job_id>, role: "image"}]` to keep channel look), one concept each:

1. Subject close-up + emotion/tension, ≤3 words of text
2. Object/diagram curiosity — the strange thing itself, no text or one word
3. Contrast — before/after, versus, scale comparison

Prompt for: single dominant focal point, high contrast against YouTube's white/dark UI, bold flat shapes readable at 120 px wide, no fine detail, no more than three words of text, channel style. `job_display` all three thumbnails and show the three titles, then **ask the pick — mandatory, in ONE interactive AskUserQuestion widget call (the host's question tool), never as plain text.** Two questions in that single call:

1. "Which title?" — the three titles as the options (trim each to a short label if needed), plus "You choose".
2. "Which thumbnail?" — options "Thumbnail 1" / "Thumbnail 2" / "Thumbnail 3" / "You choose".

(If "You choose": pick the strongest curiosity-gap pairing and say why in one line.) Record the pick + all title options in `packaging.md`, log image credits to the ledger.

**Then, immediately after the user has chosen, ask the shorts question — mandatory, in ONE interactive AskUserQuestion widget call, never as plain text:** "Create shorts from this video with Higgsfield Shorts Studio?" — options: "Yes — make shorts" / "Not now". On "Yes" → run the Shorts section below (pick the path by what exists, per its rules). On "Not now" → stop cleanly; "make shorts" works anytime later.

## Translation — the same film in another language

Default path — **dub the finished MP4**: one `dubbing` call, `video_id` = the final assembly job id, `target_language` from this set (name → code): English eng · Chinese cmn · French fra · Hindi hin · Italian ita · Japanese jpn · Korean kor · Portuguese por · Russian rus · Turkish tur · Spanish spa · German deu · Arabic ara · Polish pol · Indonesian ind · Filipino fil · Swedish swe · Finnish fin. Announce: "Dubbing into Spanish — one call, same film." Poll, `job_display`, ledger.

Upgrade path — **re-voice** (use when the user has a cloned `element` voice or asks for *their* voice in the new language): translate all N narration lines (spell numbers out *in the target language*, keep each ≤ ~9.5 s spoken), run N `generate_audio` takes with the profile voice, re-assemble with `explainer_video` reusing the **same clip job ids** — the visuals never re-render, so this costs voice only. Save as `blocks.<lang>.md` in the video folder.

If the profile lists a second language, offer the dub in one line right after every finished render — don't fire it unasked.

## Shorts — ~20 from one long video

Two paths; pick by what exists:

**Primary — the video is (or will be) on YouTube:** `personal_clipper_create` with `urls: [<YouTube URL>]`, `clips_num: 20`, `clip_aspect: "9:16"`, `subtitle_font` by niche (History → Bebas Neue · Science → Montserrat · Money → Archivo Black). These settings are profile-delegated — announce, don't ask. No URL in the conversation → one-line blocker: "Drop the YouTube link once it's live and I'll cut twenty shorts." It's a long job (30+ min): say so, poll `personal_clipper_status` when asked or when checking in, present clips via `job_display` as they land.

**Alternative — restyle a segment** (no YouTube link, or the user wants stylized AI shorts): `media_upload_widget` (type=video) for a ≤120 s segment → `shorts_studio_list_presets`, match the channel look → `shorts_studio_create` (preflight with `get_cost: true` + `duration_seconds` first) → poll `shorts_studio_status`, then each clip job.

Close the batch with the repurposing line once, briefly: same batch posts to YouTube Shorts, Reels, and TikTok — three discovery surfaces, every clip pointing back to the channel. Log the batch to the ledger.

## The 30-day plan

"Plan my first 30 days" → research first (same recipe as `topics.md`, one pass across the niche): 8 long-video topics **ranked by search demand**, each with its evidence one-liner. Then write `explainer-channel/plan.md`:

```markdown
# 30-day plan — <niche> · created <date>
Rhythm: 2 longs/week (Tue + Fri), daily short from the latest batch, same posting times.
| # | date | topic | why (evidence) | status |
|---|---|---|---|---|
| 1 | <date> | <topic> | <demand one-liner> | done → videos/001-… |
| 2 | <date> | <topic> | <one-liner> | planned |
```

Statuses: planned → scripting → rendering → packaging → done (link the video folder). Present the table itself — it *is* the deliverable — plus two lines: the rhythm (consistency is what the algorithm learns) and the feedback rule (watch average view duration; where people drop is the script note for the next video — that's whether the open loops worked).

"Start video N" / "start videos two and three" → run the full pipeline for those rows (see `produce.md` for parallel rules), update statuses as stages land.

## When asked "will this do well?"

Run `virality_predictor` (`action: create`, media id = the final video job id) and read back its hook/retention findings in two or three lines, tied to what the script did. Don't run it unasked.
