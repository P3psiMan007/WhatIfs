# First-run setup — two questions, then decisions

Goal: a complete channel profile in under a minute. The user answers two things; you decide the rest and write it all down. This is the only time the skill asks questions.

## Step 1 — ask (at most) two questions

Use the host's question tool, one call, both questions together. **Skip any question the conversation already answered** — if the user said "make a video about the Bronze Age collapse", the niche is obviously history: skip Q1. If they wrote in Spanish or named a language, skip Q2.

**Q1 — Niche.** One lane, because the algorithm rewards channels that stay in one lane (recommendation targeting sharpens with every upload; mixing resets it):

- **History & Disasters** — empires, collapses, catastrophes, mysteries
- **Science & How-Things-Work** — space, biology, engineering, "what if"
- **Money & Psychology** — economics, scams, business rises/falls, human behavior
- **Pick for me** — you choose after research (default to the lane with the best current supply-gap; announce why)

**Q2 — Language.** Primary narration language (default English — biggest RPM pool), plus an optional second language for auto-dubbing. Offer the second-language idea in the option descriptions; most of the internet doesn't speak English natively, and a dub is one extra prompt.

While asking, state the delegation plainly in the same message, one line: "I'll pick the visual style and narrator voice for you — swap either anytime by saying so."

## Step 2 — decide everything else, one line each (no MCP calls)

**Setup makes NO Higgsfield MCP calls.** No `get_youtube_explainer_presets`, no `resolve_explainer_preset`, no `generate_image`, no `list_voices` — nothing that touches the connector or spends a credit. Setup, research, and scriptwriting are all paper-only; every MCP call waits until the user has approved the script (see "Deferred provisioning" below, executed from `produce.md`). Step 2 is decisions written down, one line each:

**Visual style.** Pick the preset by **title** from this matrix and record the title in the profile (the catalog is CMS-managed; ids rotate, titles are stable-ish — the id gets resolved at first render, and if a title is gone by then, pick the nearest by keyword):

| Niche | First pick | Fallback |
|---|---|---|
| History & Disasters | Mixed Media | 2D Illustrator |
| Science & How-Things-Work | Isometric Flat Vector | Low Poly |
| Money & Psychology | 2D Illustrator | Whiteboard Doodle |

Announce: "Style: Mixed Media — documentary collage, the look the big history channels run." Do not show the gallery; the user delegated this. If the user ever asks to choose, show the gallery and wait (that browse is the one sanctioned pre-render MCP call, because the user explicitly requested it).

**Narrator voice.** Record the intent only: "documentary/narrator preset, calm and deep over bright and salesy" — the actual pick from `list_voices` happens at first render. Announce: "Voice: a steady documentary read — I'll lock the exact voice at render time." Offer the upgrade in the same line, once, not as a question that blocks: "Want it to be literally *your* voice? Say 'clone my voice' anytime." (That runs the `create_voice` widget — record ~1 minute, done; store the returned voice as `voice_type: "element"` and switch the profile to it.)

**Fixed defaults** (record; user can override any):

- `aspect: 16:9` (long-form YouTube), `character: faceless` (no mascot), `subtitles: off` in the main render (shorts get their own captions)
- `length_policy: auto` — see `produce.md` (roughly: flagship/deep topics 10 min, single-story 8, never under 6)
- `clips_per_block: 10s`, `narration_wpm: ~150` (fixed by the render workflow)

## Deferred provisioning — runs at first render pre-flight, never at setup

Executed from `produce.md` step 0, after the script gate and the duration question, only if the profile still has `(pending first render)` fields:

1. `get_youtube_explainer_presets` → match the profile's style title (nearest by keyword if gone) → record the preset id.
2. `resolve_explainer_preset` with the preset id → `preset_media_id`.
3. **The 16:9 style key.** Preset images ship 9:16 (vertical), but the channel's long-form videos are 16:9 — and in the render workflow the style key's aspect sets the video framing. Derive a landscape key once: `generate_image`, model `nano_banana_pro`, `aspect_ratio: "16:9"`, `medias: [{value: <preset_media_id>, role: "image"}]`, prompt = an **abstract style swatch** using the style-only rule: "Adopt ONLY the render style, line/finish and color grading of the reference — do not copy its content, characters or text. Abstract style swatch: textures, shapes and palette only, no objects, no letters. Non-photorealistic, no live-action, no realism." Poll `job_status` → store the **job id** as `style_key_job_id`. This one image is the whole channel's visual consistency: it gets attached to every clip of every video. Cost is one image, once — and it lands on the ledger like everything else.
4. `list_voices` → pick a preset voice matching the recorded intent (documentary/narrator-type name or description). Store `voice_id`, `voice_type`, name. Announce in one line: "Voice: <name> — steady documentary read."
5. Write all resolved values back into `profile.md`, replacing the `(pending first render)` markers.

## Step 3 — write the profile

Create `explainer-channel/profile.md`:

```markdown
# Channel profile
- niche: <lane>
- language: <primary>            # + second: <language> (optional)
- style_preset: <title> (preset id: pending first render)
- preset_media_id: (pending first render)
- style_key_job_id: (pending first render)   # 16:9 — derived at first render, then attached to every clip
- voice: documentary/narrator intent (pending first render)
- aspect: 16:9 · character: faceless · subtitles: off
- length_policy: auto
- delegated_at_setup: style, voice, length, shorts settings — skill decides, user overrides anytime
- created: <date>
```

The `delegated_at_setup` line matters: the Higgsfield render workflow insists the *user* picks style and voice unless they explicitly delegated — this line is that delegation, made once at setup. The `(pending first render)` fields are resolved by "Deferred provisioning" above at the first render's pre-flight and written back here. Downstream, carry the preset id (the workflow honors a carried "explainer preset id: <uuid>" and skips its gallery) and the stored voice, and never re-open those choices.

Close setup with one line: "Channel's set. Say a topic — or 'pick for me'."

## Changes & repair

- "Change the style/voice/language/niche" → make the new pick (show the gallery / voice list only if the user wants to choose themselves), update `profile.md`, regenerate the style key if the preset changed. One line: what changed.
- Profile exists but missing a field (older version, hand-edited): fill the gap silently using the rules above; don't re-ask what's already there.
- `style_key_job_id` rejected by a generation (expired/foreign workspace): re-run the Step-2 derivation from `preset_media_id` (re-resolve the preset if that's also stale), update the profile, continue. Don't surface this unless it fails twice.
