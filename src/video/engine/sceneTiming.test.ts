import test from "node:test";
import assert from "node:assert/strict";
import { resolveSceneTimings, totalDurationInFrames } from "./sceneTiming.ts";
import type { SceneManifestEntry } from "../types/scene";

const baseScene = (overrides: Partial<SceneManifestEntry>): SceneManifestEntry => ({
  sceneId: "s1",
  order: 0,
  narration: { text: "text", segmentStartIndex: null, segmentEndIndex: null },
  timing: { startSeconds: null, endSeconds: null },
  visualPurpose: "establish-premise",
  focalSubject: "narrator",
  environment: "void",
  props: [],
  cameraIntent: "static",
  motionIntent: ["none"],
  caption: "text",
  sfxIntent: null,
  transitionIn: "hard-cut",
  requiredAssets: [],
  newInformation: "",
  ...overrides,
});

test("uses real narration timing when every scene has it", () => {
  const scenes = [
    baseScene({ sceneId: "a", timing: { startSeconds: 0, endSeconds: 2.5 } }),
    baseScene({ sceneId: "b", timing: { startSeconds: 2.5, endSeconds: 6 } }),
  ];
  const timings = resolveSceneTimings(scenes, 30, 999);
  assert.equal(timings[0].startFrame, 0);
  assert.equal(timings[0].endFrame, 75);
  assert.equal(timings[1].startFrame, 75);
  assert.equal(timings[1].endFrame, 180);
});

test("falls back to an even split when narration timing is missing", () => {
  const scenes = [baseScene({ sceneId: "a" }), baseScene({ sceneId: "b" }), baseScene({ sceneId: "c" })];
  const timings = resolveSceneTimings(scenes, 30, 9);
  assert.equal(timings[0].startSeconds, 0);
  assert.equal(timings[0].endSeconds, 3);
  assert.equal(timings[2].endSeconds, 9);
});

test("falls back to even split if even ONE scene is missing real timing", () => {
  const scenes = [
    baseScene({ sceneId: "a", timing: { startSeconds: 0, endSeconds: 2 } }),
    baseScene({ sceneId: "b" }), // no real timing
  ];
  const timings = resolveSceneTimings(scenes, 30, 10);
  // partial real timing is not trustworthy on its own - even split applies to all
  assert.equal(timings[0].startSeconds, 0);
  assert.equal(timings[0].endSeconds, 5);
});

test("returns empty array for no scenes", () => {
  assert.deepEqual(resolveSceneTimings([], 30, 10), []);
});

test("totalDurationInFrames is the max endFrame across all scenes", () => {
  const timings = resolveSceneTimings(
    [baseScene({ sceneId: "a", timing: { startSeconds: 0, endSeconds: 3 } })],
    30,
    999,
  );
  assert.equal(totalDurationInFrames(timings), 90);
});

test("totalDurationInFrames is 0 for no scenes", () => {
  assert.equal(totalDurationInFrames([]), 0);
});
