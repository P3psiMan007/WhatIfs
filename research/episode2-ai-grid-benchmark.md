# Episode 2 — Benchmark Teardown + Pre-production Kill Gate

Working premise: **What if AI's electricity demand grows faster than the grid can handle?**
Date: 2026-08-10

## Relevant benchmark inventory

### CNBC — `How Is Generative AI Straining Our Power Grid?` (2024)
- Publicly indexed copy reports ~733.8K views.
- Strengths: opens inside the physical `cloud`, uses real server infrastructure, quickly establishes that AI is a physical electricity problem, then broadens into grid capacity and possible solutions.
- Weakness for our opportunity: news/documentary grammar, long interview/expert sections, 2024 forecasts, less of a clean counterfactual consequence chain.
- Do not copy: wording, interview structure, thumbnail, specific scene order.
- Our improvement: 2026 numbers, much simpler `rack -> substation -> regional grid -> choices` visual model, one continuous thought experiment, clear distinction between energy and power, and a non-doom payoff.

### Bloomberg — `AI Data Centers Push US Power Bills to Record Highs` (2025 video)
- Strengths: immediate personal stake (your power bill), concrete economic consequence, topical urgency.
- Weakness for our opportunity: short news segment, assumes viewer already understands how grid costs transmit to bills, little systems explanation.
- Our improvement: explain *why* a giant new load can create local constraints and why that does **not** mean AI automatically raises every household bill everywhere.

### Bloomberg interactive — `How AI Data Centers Are Sending Your Power Bill Soaring` (2025)
- Strengths: human stories + maps + data, strong localization of an abstract infrastructure issue.
- Weakness for our opportunity: article/data-journalism format rather than a concise visual narrative; strong US-market focus.
- Our improvement: keep a human-scale consequence but tell a globally understandable grid story and use current 2026 primary forecasts.

### Current 2026 news cycle
- Multiple current reports describe local political backlash, utility-cost allocation fights, and grid connection constraints around AI/data-center construction.
- This confirms topical momentum, but news reports will not be used as sole authority for technical claims.

## What the winning episode must do better

1. **Open with a clean thought experiment, not a policy headline.** A hypothetical large AI campus asks for a huge block of power; the viewer follows what the grid must do next.
2. **Explain one hard idea simply:** energy (TWh) is how much electricity is used over time; power (MW/GW) is how much must be available at a moment. Do not mix them.
3. **Make the grid visible:** server rack -> data hall -> substation -> transmission -> generators/storage -> homes/businesses.
4. **Escalate rather than list:** one facility, then a region, then global data-center growth, then the buildout race.
5. **Avoid fake apocalypse:** the first response to insufficient capacity is usually delay, new infrastructure, changed siting/pricing, or new supply — not an instant nationwide blackout.
6. **End with a genuine reversal:** compute can become more grid-aware/flexible; the problem is not simply `AI versus electricity`, but whether infrastructure and rules adapt as quickly as compute demand.
7. **Use current data without turning into a slide deck:** numbers appear only when they change the viewer's mental model.

## Packaging test

### Package A — strongest
**Title:** What If AI Uses More Power Than the Grid Can Handle?
**Thumbnail:** dark city at right, glowing data center at left, single amber cable/substation between them visibly overloaded.
**Text:** `NOT ENOUGH POWER`
**Promise:** simple physical bottleneck + immediate stakes.

### Package B
**Title:** What Happens If AI Runs Out of Electricity?
**Thumbnail:** server rack at full load, grid meter pinned at its limit.
**Text:** `POWER LIMIT`
**Promise:** higher curiosity, but must make clear in the opening that electricity itself is not globally `running out`.

### Package C
**Title:** AI Is Building a New Power Problem
**Thumbnail:** server racks expanding toward a city/grid while generation lags behind.
**Text:** `WHO GETS THE POWER?`
**Promise:** current and human, but less naturally `What If`.

Decision: **Package A** is the cleanest and least misleading starting point. Final packaging remains editable after the finished story exists.

## First-15-second hook

> Imagine the AI boom doesn't run out of chips. It runs into the power grid. A new AI campus asks for an enormous block of electricity, day and night — and the wires, substations and power plants around it cannot be expanded overnight. So what actually happens when compute grows faster than the grid?

This is intentionally a conditional stress test, not a claim that nationwide blackouts are inevitable.

## 8–10 minute story spine

1. **The request:** a hypothetical large AI campus asks for a huge, steady load.
2. **The hidden machine:** explain MW/GW versus TWh and what the grid has to match every moment.
3. **Why this question is suddenly real:** 2025–26 data-center electricity growth and AI-server share.
4. **The local bottleneck:** substations/transmission/generation cannot be added at software speed.
5. **What happens first:** delays, siting changes, expensive capacity, new infrastructure and cost-allocation fights — not automatic apocalypse.
6. **Scale it up:** advanced-economy electricity demand is growing again after years of stagnation; data centers are a major driver.
7. **The adaptation race:** new generation, transmission, batteries, on-site supply, demand response, moving flexible compute in time/place.
8. **The twist:** some AI workloads can become grid-responsive instead of behaving like an immovable load.
9. **Payoff:** the AI race becomes partly a race to build and coordinate physical infrastructure, not merely faster chips.

## Visual plan

- Hook: server rack grows into a campus; cable reaches a hard grid limit.
- Diagram: `POWER NOW` (MW/GW) vs `ENERGY OVER TIME` (MWh/TWh), minimal labels.
- Stat scene: 447 TWh -> 565 TWh data-center electricity (Gartner 2025->2026 forecast).
- Stat/process: AI-optimized server electricity 95 -> 175 TWh (Gartner forecast).
- City/world: grid line branches to homes, hospital, factory, data center; no false `AI steals your electricity` framing.
- Timeline: software-scale build request vs multi-step physical infrastructure buildout.
- Map: move flexible compute toward lower-stress regions / different times.
- Transformation: fixed load becomes flexible/grid-aware load.
- Ending: chip icon shrinks; transmission tower/substation becomes the unexpected hero.

## Kill-gate result

**PASS to research/script.**

Reasons:
- Strong current demand signal and news momentum.
- At least three credible packages exist.
- Hook is understandable without jargon.
- Primary-source depth supports an 8–10 minute story.
- Renderer proof now covers the required diagram, map, timeline, stat, transformation, people and environment classes.
- The story has a clear escalation and a non-doom payoff.

Fail later if factual review cannot support the exact wording, if synthesized narration misses 8:00–10:00 without filler, or if the low-res full draft feels like repetitive infographic cards.

## Sources used for benchmark context

- CNBC indexed video summary: https://glasp.co/youtube/MJQIQJYxey4
- Bloomberg video: https://www.bloomberg.com/news/videos/2025-09-30/ai-data-centers-push-us-power-bills-to-record-highs-video
- Bloomberg interactive: https://www.bloomberg.com/graphics/2025-ai-data-centers-electricity-prices/
- Current primary data carried into claim ledger separately (Gartner, IEA, EIA).
