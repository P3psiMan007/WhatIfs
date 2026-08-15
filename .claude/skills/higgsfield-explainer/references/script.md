# Script — the retention layer

The script carries the meaning; the prompts carry the visuals. The script is what separates a video people finish from beautiful nonsense — and finishing is the metric YouTube pays for. Write it like a professional retention scriptwriter, because that's the promise this skill makes.

Everything factual must come from `research.md`. If the script needs a fact that isn't there, research it and add it first.

## Length math (fixed by the render)

The render is N blocks × 10 seconds, `N = minutes × 6`. Each block carries one narration line of **~20–24 words** (~8–9 s spoken, hard cap ~9.5 s). So a 10-minute video = 60 blocks ≈ 1,300 words. Write to this grid from the start — retrofitting prose to blocks produces choppy audio.

## Retention architecture

Structure the script as chapters, engineered so leaving feels expensive:

- **Cold open on the payoff (blocks 1–2, ~15 s).** Open on the most arresting concrete image or claim in the research — the *result*, not the backstory. Never "today we'll explore…"; the viewer should learn something startling before they've decided to stay.
- **Chapters of ~9–12 blocks (~90–120 s).** Each chapter answers one question and ends by *raising the next one* — the last line of a chapter is a doorway, not a summary.
- **An open loop roughly every 6 blocks (~1/min).** Plant a specific question and defer it ("that decision killed the whole fleet — but not for the reason you'd guess"), pay it off 1–2 chapters later. Track them: every loop planted must close before the final chapter. This is the technique professional scriptwriters are paid for; it's the skill's signature.
- **Concrete over abstract, always.** Named people, dated events, physical detail, numbers with stakes. One idea per block — a block that needs two sentences of setup is two blocks.
- **Ending (last 3–4 blocks):** close the largest loop, one resonant takeaway line, and a single quiet next-video hook. No "like and subscribe" essays — one short line at most.

**Narration line rules** (the voice engine is literal): plain spoken text only — no parentheticals, no stage directions, no emphasis markup. Spell numbers out ("twenty percent", "nineteen fifty-eight"). No "in this video". Each line must stand alone when heard once, at speed.

## Files to write

**1. `script.md` — for the human to read.** Chaptered, with loop annotations so the craft is visible:

```markdown
# <Title working draft>
## Chapter 1 — <question it answers>  [blocks 1–10]
<narration lines as flowing paragraphs>
[loop planted: <the question>] … [loop closed: <ref>]
```

**2. `blocks.md` — for the machine.** All N blocks, numbered, narration + visual prompt pairs:

```markdown
Block 1
NARRATION: <20–24 words, numbers spelled out>
VISUAL: <one scene: subject + action + setting, matching this narration beat>
```

The VISUAL line is the *scene idea* (what's on screen and what moves); `produce.md` expands it into the workflow's full labeled prompt format (STYLE REFERENCE / SCENE / MOTION / AUDIO / NEGATIVE) at render time. Vary shot types across consecutive blocks — wide, detail, diagram, map — the visual switch every 10 s is itself a retention device. Keep every scene stylized/illustrated (never photoreal), consistent with the channel's one style, and free of on-screen text.

## Quality gate (self-check before declaring the script done)

Fail any → fix before moving on: hook states a payoff, not a promise to explain · every loop closes · no block over 24 words · every stat traces to `research.md` · chapters end on doorways · a bored 14-year-old and a sharp 40-year-old both stay.

## Presenting the script (the gate)

When the script is done, present it in chat — the chaptered narration itself plus one stats line ("Script's done — 60 blocks, 6 chapters, 9 open loops."). After the script, add a short craft note (2–4 sentences) written fresh for *this* script: point at the retention engineering where it actually lives in this draft — quote or reference the specific hook, name one or two of the actual open loops and where they close, note a chapter handoff that works. Never reuse the note from a previous script; if it could be pasted under a different script unchanged, it's too generic — rewrite it.

Then **STOP**. End with one line: "Say 'proceed' and I'll render it." Do not run pre-flight, do not submit any paid generation, do not assemble — nothing fires until the user's explicit go ("proceed" / "go" / "render it"). The user reads first; the render waits.
