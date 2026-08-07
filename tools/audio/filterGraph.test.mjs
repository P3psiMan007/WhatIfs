import test from "node:test";
import assert from "node:assert/strict";
import { buildMixPlan, mixPlanToFfmpegArgs } from "./filterGraph.mjs";

test("narration-only plan has a single input and no amix", () => {
  const plan = buildMixPlan({ narrationPath: "narration.wav" });
  assert.deepEqual(plan.inputs, ["narration.wav"]);
  assert.match(plan.filterComplex, /\[mixed\]$/);
  assert.doesNotMatch(plan.filterComplex, /amix/);
});

test("narration is always input 0", () => {
  const plan = buildMixPlan({
    narrationPath: "narration.wav",
    musicPath: "music.wav",
    ambiencePath: "ambience.wav",
  });
  assert.equal(plan.inputs[0], "narration.wav");
});

test("amix uses duration=first so output always matches narration length", () => {
  const plan = buildMixPlan({ narrationPath: "narration.wav", musicPath: "music.wav" });
  assert.match(plan.filterComplex, /amix=inputs=2:duration=first/);
});

test("music is ducked well below narration by default", () => {
  const plan = buildMixPlan({ narrationPath: "narration.wav", musicPath: "music.wav" });
  assert.match(plan.filterComplex, /\[0:a\]volume=0dB\[a0\]/);
  assert.match(plan.filterComplex, /\[1:a\]volume=-18dB\[a1\]/);
});

test("sfx cues get adelay matching their offset in milliseconds", () => {
  const plan = buildMixPlan({
    narrationPath: "narration.wav",
    sfx: [{ path: "ding.wav", offsetSeconds: 2.5 }],
  });
  assert.match(plan.filterComplex, /adelay=2500\|2500/);
});

test("custom levels override the defaults", () => {
  const plan = buildMixPlan({
    narrationPath: "narration.wav",
    musicPath: "music.wav",
    levels: { musicDuckDb: -30 },
  });
  assert.match(plan.filterComplex, /\[1:a\]volume=-30dB\[a1\]/);
});

test("all four source types combine into one amix with 4 inputs", () => {
  const plan = buildMixPlan({
    narrationPath: "narration.wav",
    musicPath: "music.wav",
    ambiencePath: "ambience.wav",
    sfx: [{ path: "ding.wav", offsetSeconds: 1 }],
  });
  assert.equal(plan.inputs.length, 4);
  assert.match(plan.filterComplex, /amix=inputs=4:duration=first/);
});

test("mixPlanToFfmpegArgs produces one -i per input, in order, ending with the output path", () => {
  const plan = buildMixPlan({ narrationPath: "narration.wav", musicPath: "music.wav" });
  const args = mixPlanToFfmpegArgs(plan, "out.wav");
  assert.deepEqual(
    args.filter((a) => a === "-i").length,
    2,
  );
  assert.equal(args.at(-1), "out.wav");
  assert.equal(args[0], "-y");
});

test("buildMixPlan throws without narrationPath", () => {
  assert.throws(() => buildMixPlan({}), /narrationPath/);
});
