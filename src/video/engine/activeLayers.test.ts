import test from "node:test";
import assert from "node:assert/strict";
import { computeActiveLayers } from "./activeLayers.ts";
import type { SceneManifestEntry } from "../types/scene";
import type { ResolvedSceneTiming } from "./sceneTiming";

const scene = (id: string, transitionIn: SceneManifestEntry["transitionIn"]): SceneManifestEntry => ({
  sceneId: id,
  order: 0,
  narration: { text: "", segmentStartIndex: null, segmentEndIndex: null },
  timing: { startSeconds: null, endSeconds: null },
  visualPurpose: "establish-premise",
  focalSubject: "",
  environment: "",
  props: [],
  cameraIntent: "static",
  motionIntent: ["none"],
  caption: "",
  sfxIntent: null,
  transitionIn,
  requiredAssets: [],
  newInformation: "",
});

const timing = (id: string, startFrame: number, endFrame: number): ResolvedSceneTiming => ({
  sceneId: id,
  startFrame,
  endFrame,
  startSeconds: startFrame / 30,
  endSeconds: endFrame / 30,
});

test("hard-cut renders only the current scene at full opacity", () => {
  const scenes = [scene("a", "hard-cut"), scene("b", "hard-cut")];
  const timings = [timing("a", 0, 60), timing("b", 60, 120)];
  assert.deepEqual(computeActiveLayers(scenes, timings, 10), [{ sceneIndex: 0, opacity: 1 }]);
  assert.deepEqual(computeActiveLayers(scenes, timings, 65), [{ sceneIndex: 1, opacity: 1 }]);
});

test("match-cut also renders as an instant swap (no crossfade)", () => {
  const scenes = [scene("a", "hard-cut"), scene("b", "match-cut")];
  const timings = [timing("a", 0, 60), timing("b", 60, 120)];
  assert.deepEqual(computeActiveLayers(scenes, timings, 61), [{ sceneIndex: 1, opacity: 1 }]);
});

test("dissolve crossfades outgoing and incoming scenes over the dissolve window", () => {
  const scenes = [scene("a", "hard-cut"), scene("b", "dissolve")];
  const timings = [timing("a", 0, 60), timing("b", 60, 120)];

  const halfway = computeActiveLayers(scenes, timings, 60 + 7, 15); // ~7/15 into the dissolve
  assert.equal(halfway.length, 2);
  const outgoing = halfway.find((l) => l.sceneIndex === 0);
  const incoming = halfway.find((l) => l.sceneIndex === 1);
  assert.ok(outgoing && incoming);
  assert.ok(Math.abs(outgoing.opacity - (1 - incoming.opacity)) < 1e-9);
  assert.ok(incoming.opacity > 0 && incoming.opacity < 1);
});

test("dissolve settles to a single full-opacity layer after the dissolve window ends", () => {
  const scenes = [scene("a", "hard-cut"), scene("b", "dissolve")];
  const timings = [timing("a", 0, 60), timing("b", 60, 120)];
  assert.deepEqual(computeActiveLayers(scenes, timings, 100, 15), [{ sceneIndex: 1, opacity: 1 }]);
});

test("dissolve on the very first scene has no previous scene to crossfade from", () => {
  const scenes = [scene("a", "dissolve")];
  const timings = [timing("a", 0, 60)];
  assert.deepEqual(computeActiveLayers(scenes, timings, 2, 15), [{ sceneIndex: 0, opacity: 1 }]);
});

test("frame before the first scene clamps to scene 0", () => {
  const scenes = [scene("a", "hard-cut")];
  const timings = [timing("a", 10, 60)];
  assert.deepEqual(computeActiveLayers(scenes, timings, 0), [{ sceneIndex: 0, opacity: 1 }]);
});

test("frame past the last scene clamps to the final scene", () => {
  const scenes = [scene("a", "hard-cut"), scene("b", "hard-cut")];
  const timings = [timing("a", 0, 60), timing("b", 60, 120)];
  assert.deepEqual(computeActiveLayers(scenes, timings, 500), [{ sceneIndex: 1, opacity: 1 }]);
});

test("returns empty array for no scenes", () => {
  assert.deepEqual(computeActiveLayers([], [], 0), []);
});
