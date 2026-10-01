# Topics — the trends answer & the pick

Two jobs here: answer "what's actually working in explainer videos right now?" the way a sharp strategist would, and pick one topic worth a render. Both run on live research, never on memory — the whole value of the answer is that it's current.

## The trends answer (when asked what's working)

Research first (below), then answer in two stages — **niches first, topics second**. Compact is the feature.

### Stage 1 — niches (default when no niche is known yet)

Present 3–5 niche options drawn from the live research in this run — one line each, each justified by current RPM/CPM evidence **and** at least one other factor (faceless fit, evergreen shelf-life, affiliate/sponsor potential, watch-time behavior). Which niches make the list, their monetization numbers, and their ordering all come from what the research actually found — nothing is preset. Cite where each number came from. The faceless chaptered explainer format (hook-first cold open, visuals switching every ~10 seconds, one consistent illustrated style, one steady narrator) is this channel's production format — note per niche how well it fits, honestly, including poor fits.

Offline fallback only (search unavailable): education-type explainers have historically monetized at roughly $8–20 CPM with finance/tech/health adjacencies reaching higher, while broad entertainment runs lowest ($2–8) — present these as dated priors, flagged as such, never as current data.

End Stage 1 with: **"Say a niche and I'll bring 3–5 researched topics in it — or say 'pick for me'."**

Skip Stage 1 only when the niche is already known — a profile exists, or the user named/implied one — and go straight to Stage 2.

### Stage 2 — topics (niche known or just picked)

**3–5 topics inside the niche, each with a one-line why** tied to evidence you actually saw ("three sub-100k channels pulled 1M+ on this in 90 days").

Candidates and their ranking come entirely from the live research in this run — no topic is pre-ranked or pinned. Show a score line for every candidate (D/S/V/E/R per the scoring table below) and order the list strictly by total score as the evidence supports it.

**One next-step line:** "Say a number and I'll research and script it — or say 'pick for me'."

Never more than 5 options per stage, never a wall of text, never invented stats.

### RPM reference (user-provided 2026-07; sources: vidIQ, outlierkit)

Prior, not gospel — confirm with live research when it matters to the pick.

| Tier | Category | CPM range | Est. RPM | What drives it |
|---|---|---|---|---|
| 1 | Insurance | $20–50 | $7–17 | Every qualified lead is worth hundreds |
| 1 | Personal finance & investing | $15–50 | $5–17 | Banks, brokerages, fintech, credit cards |
| 1 | Legal | $15–45 | $5–15 | One client worth $10K+ to law firms |
| 1 | Health/medical specialties | $15–40 | $7–22 | Telehealth, GLP-1s; but strict ad filters |
| 1 | Real estate & mortgages | $15–40 | $5–13 | High transaction values justify spend |
| 1 | Luxury / private wealth | $15–50 | $5–17 | Affluent audiences command premiums |
| 2 | Cryptocurrency | $15–40 | — | Spikes with bull markets |
| 2 | B2B software / SaaS | $10–30 | — | One customer = $1K+ recurring revenue |
| 2 | AI & emerging tech | $10–25 | — | Huge AI ad budgets, low competition |
| 2 | Marketing / make money online | $10–25 | — | Doubles up with affiliate revenue |
| 2 | Automotive | $10–25 | — | High purchase-intent viewers |
| 2 | Education & career dev | $8–20 | — | EdTech, certifications, learners |
| 2 | Technology (consumer→enterprise) | $5–30 | — | Consumer $5–12, developer/enterprise $20–30 |
| 2 | Health & wellness (consumer) | $7–20 | — | Supplements, fitness, mental health |
| 3 | Parenting & family | $8–15 | — | Engaged niche, high trust |
| 3 | Product reviews & DIY | $4–15 | — | Strong affiliate potential |
| 3 | Travel | $4–14 | — | Spikes during booking seasons |
| 3 | Beauty & fashion | $4–12 | — | Affiliate often beats ad revenue |
| 4 | Gaming | $4–15 | $3–7 | Hardware/esports pay more than let's-plays |
| 4 | Entertainment & vlogs | $2–8 | — | Volume-dependent, low targeting |
| 4 | Music | $1–3 | — | Copyright often redirects revenue |

## Research recipe (both jobs)

Use the host's web search + fetch. You're hunting two signals:

- **Demand:** what's being searched/watched in the niche *now* — trending questions, news hooks with evergreen cores, perennial heavy hitters (search suggests, "best/most/why/what if" phrasings, topic + "explained").
- **Supply gap:** search the niche on YouTube, sort mentally by views-vs-channel-size — **small channels with massive outlier videos** are the tell that demand exceeds supply. Note 2–3 real outliers (channel size, view count, age) as evidence.

Spend ~4–8 searches, fetch the best 2–3 pages. Save everything used to `videos/NNN-slug/research.md` (or a scratch note if pre-slug): facts, numbers, dates, names, and a **Sources** list with URLs — the script stage is only allowed to use facts that appear here.

## Scoring & the pick

Score each candidate 1–5 on:

| Signal | What 5 looks like |
|---|---|
| Demand | Actively searched/trending, or a perennial with fresh angle |
| Supply gap | Outlier videos on small channels; few strong recent takes |
| Visual yield | Tells in *scenes* — objects, places, processes (not abstractions requiring talking heads) |
| Evergreen | Watchable in 2 years; news-pegged only if the core is timeless |
| RPM fit | Educational, advertiser-safe, adjacent to finance/tech/science |

Score every candidate and show every score line to the user (format: `D_/S_/V_/E_/R_ = total`). The ranking follows the scores, and the scores follow the live evidence — nothing is pre-ranked. Pick the highest-scoring candidate. If the user overrides, the override wins without argument — score it silently for the record, note it in `research.md`, move on.

Then create `videos/NNN-<slug>/` (increment NNN) and write `research.md`:

```markdown
# <topic>
- picked: <date> · score D_/S_/V_/E_/R_ · reason: <one line>
## Facts (script may only use these)
- <fact> — <source>
## Sources
- <url> — <what it supports>
```

## Guardrails

- **No invented numbers, quotes, or events** — a fact without a source doesn't go in the file, and what's not in the file doesn't go in the script. This is also the monetization defense: YouTube demonetizes *inauthentic* templated content, not AI content — researched specificity is what keeps a channel on the right side of that line.
- Skip topics that can't be visualized non-photoreal (the render is stylized/illustrated by design), medical/financial advice framings, and anything requiring real people's faces or fabricated statements.
