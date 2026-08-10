# Episode 2 Script v1

Working title: **What If AI Uses More Power Than the Grid Can Handle?**
Target: 8–10 minutes after locked `af_heart` 0.95 synthesis.
Status: research-backed draft; must still pass synthesized-duration and retention/visual QA.

---

## HOOK

Imagine the AI boom does not run out of chips.

It runs into the power grid.

A new AI campus asks for an enormous block of electricity, day and night. The servers can arrive in months. But the substation, transmission lines and new power plants around them cannot be downloaded from the cloud.

So what actually happens if compute grows faster than the grid can handle?

Not the movie version, where half the country instantly goes dark. The real answer is stranger: projects wait, power gets rerouted, new generators appear, bills and rules get fought over, and the AI race turns into something that looks a lot like an infrastructure race.

And to understand why, we need to separate two things that sound almost identical.

## POWER IS NOT ENERGY

Electricity has a speed limit of a different kind.

**Power** is how much electricity you need right now. We measure big loads in megawatts or gigawatts.

**Energy** is how much electricity you use over time. That is where megawatt-hours and terawatt-hours come in.

Think of a bathtub. Power is how fast water has to come through the pipe. Energy is how much water ends up in the tub.

A grid can produce plenty of energy over a year and still have a problem at 6 p.m. on a hot day if too many things need power at the same moment.

That matters for AI because a giant data center is not one laptop. It is rows of servers, networking gear, cooling systems, backup equipment and transformers — all connected to the same physical grid as homes, offices, factories and hospitals.

And suddenly, those loads are getting much bigger.

## WHY THIS QUESTION IS HAPPENING NOW

Gartner expects data centers worldwide to use about **565 terawatt-hours** of electricity in 2026 — roughly a quarter more than its estimate for 2025.

But the AI part is growing much faster. In Gartner's forecast, electricity used by AI-optimized servers jumps from about **95 terawatt-hours in 2025 to 175 in 2026**.

That does not mean every ChatGPT question is draining the grid. And it does not mean AI is the only reason electricity demand is rising.

Electric vehicles, factories, air conditioning and the wider electrification of the economy matter too.

But after years when electricity demand barely moved in many rich countries, it is climbing again. In the United States, the Energy Information Administration says data centers are a major reason why.

The International Energy Agency's base case goes further: it expects data centers to account for nearly half of U.S. electricity-demand growth through 2030.

So imagine our hypothetical AI campus gets approved.

The computers are ready.

Where does the power come from?

## THE BOTTLENECK IS NOT A POWER PLANT BUTTON

A power grid is a chain.

First, electricity has to be generated.

Then high-voltage lines have to carry it across long distances.

Then substations step the voltage down.

Then local equipment delivers it to the building.

If one part of that chain is already near its limit, adding a giant new load is not as simple as plugging in another cable.

And physical infrastructure moves slowly.

The IEA says building a new transmission line can take roughly **four to eight years** in advanced economies. It also says wait times for critical equipment such as transformers and cables have lengthened sharply.

Software can scale overnight. Steel, copper, permits and substations cannot.

That mismatch is the real stress test.

So suppose the data center asks for power that the local grid cannot safely provide yet.

What happens first?

Usually, not darkness.

## THE FIRST THING TO BREAK IS THE TIMELINE

The project can wait for a connection.

It can move somewhere with more spare grid capacity.

The developer can help fund new transmission, a substation or new generation.

It can build some of its own supply.

Or the local market can change the rules around when the facility uses power and who pays for the upgrades.

This is already becoming a planning problem. A 2026 Berkeley Lab review says rapid growth from data centers and other large loads is creating connection bottlenecks in the United States, and it catalogues more than forty possible ways to deal with them.

That is important because the phrase “the grid cannot handle it” sounds like a blackout warning.

But grids are designed around limits. When a huge new load appears, planners do not normally shrug and attach it anyway. They study what has to change first.

The consequence is often time, money and location.

And this is where our little data center becomes a much bigger story.

Because one delayed project is manageable.

Dozens of enormous projects arriving in the same region can reshape the grid itself.

## NOW SCALE IT UP

The IEA says about half of the data centers currently under development in the United States are being built inside existing large clusters.

That makes sense. Clusters already have fiber, skilled workers, customers and infrastructure.

But concentrating huge new loads in the same places can also concentrate the bottleneck.

So now our map starts changing.

A region that once expected slow electricity growth suddenly needs new substations, new transmission, more generation and more backup capacity.

And somebody has to pay for all of it.

This is where the issue stops being about servers and becomes political.

Utilities have to decide how infrastructure costs are recovered. Regulators have to decide whether a giant new customer should pay directly for dedicated upgrades, whether costs are spread more widely, and what happens if the demand forecast turns out to be wrong.

There is no single answer. Electricity markets and regulations differ enormously from place to place.

But there is one uncomfortable truth: the grid has to be built for the physical load that actually shows up, not the hype surrounding it.

If developers request far more capacity than they eventually use, we can overbuild.

If planners assume too little growth, projects wait and bottlenecks get worse.

So how do you escape that trap?

## BUILD MORE — BUT NOT JUST ONE THING

The obvious answer is more electricity.

And yes, a lot more is likely to be built.

The IEA expects the growth in data-center demand to be met by a mix of sources rather than one magic technology: renewables, natural gas, the wider grid and storage, with nuclear also contributing.

But generation is only part of the puzzle.

You can build a power plant and still have nowhere to send its electricity if the transmission network is constrained.

You can build a transmission line and still have trouble if the local substation is full.

You can add batteries, but batteries do not create energy; they move it from one time to another.

So the real solution is a combination: generation, wires, substations, storage, smarter siting — and one option that sounds almost backwards.

Instead of making the grid perfectly flexible for the data center…

make the data center more flexible for the grid.

## THE TWIST: COMPUTE DOES NOT ALWAYS HAVE TO HAPPEN NOW

Some AI work is urgent.

If you ask an assistant a question, you probably do not want the answer tomorrow morning because electricity is cheaper then.

But not every computing job is like that.

Some training, batch processing and maintenance work can potentially move in time. Some workloads can move between locations. Data centers also have batteries and backup systems that may sometimes provide flexibility.

The IEA specifically points to flexible server operation, onsite generation and storage as underexplored ways to reduce grid pressure.

And researchers are testing the idea directly. One 2026 experiment on a much smaller GPU cluster showed that power use could be reduced quickly and some workloads shifted while priority services stayed online.

That is not proof that every giant AI campus can become a perfect grid battery.

But it changes the shape of the problem.

A completely inflexible one-gigawatt load is one thing.

A load that can occasionally pause non-urgent work, use storage, or move jobs to another region is easier to fit around a stressed grid.

In other words, the future data center might not just ask the grid, “How much power can you give me?”

It might also ask, “When do you want me to use it?”

## PAYOFF

So what happens if AI demand grows faster than the grid?

Probably not one dramatic moment where the lights go out and the robots win.

The bottleneck shows up earlier.

A connection gets delayed.

A data center moves.

A transmission project gets accelerated.

A new gas plant, solar farm, battery or nuclear project gets proposed.

A regulator changes who pays.

A company learns to schedule compute around the grid instead of pretending electricity is infinite.

And that may be the most surprising part of the AI boom.

We talk about it as if the race is happening inside chips: faster models, bigger clusters, more GPUs.

But every digital intelligence eventually reaches a very old-fashioned limit.

Copper.

Transformers.

Power plants.

Transmission towers.

Time.

The cloud was never really in the cloud.

And if AI keeps growing this fast, the next breakthrough might not be a smarter model.

It might be finding somewhere to plug it in.

---

## Factual review notes

- All quantitative statements map to `research/episode2-ai-grid-claim-ledger.md`.
- `one-gigawatt load` is used only as an explicit hypothetical scale example, not as a claim about a named facility.
- The script deliberately avoids deterministic claims about blackouts or universal household bill increases.
- Exact final wording remains subject to pronunciation/TTS timing and final claim-ledger audit.
