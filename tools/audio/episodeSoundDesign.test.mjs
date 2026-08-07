import test from "node:test";
import assert from "node:assert/strict";
import { classifySfxIntent, buildCuePlan } from "./episodeSoundDesign.mjs";

test("classifies authored SFX intents into a small reusable cue palette", () => {
  assert.equal(classifySfxIntent("soft toggle click"), "click");
  assert.equal(classifySfxIntent("water-to-wind transition"), "whoosh");
  assert.equal(classifySfxIntent("number reveal hit"), "hit");
  assert.equal(classifySfxIntent("slow-wave pulse"), "pulse");
  assert.equal(classifySfxIntent(null), null);
  assert.equal(classifySfxIntent("quiet room tone"), null);
});

test("builds sparse scene-start cue plan and never invents cues for unsupported intents", () => {
  const scenes = [
    {sceneId: "s01", timing: {startSeconds: 0, endSeconds: 3}, sfxIntent: "soft toggle click"},
    {sceneId: "s02", timing: {startSeconds: 3, endSeconds: 8}, sfxIntent: "wind rush"},
    {sceneId: "s03", timing: {startSeconds: 8, endSeconds: 12}, sfxIntent: null},
    {sceneId: "s04", timing: {startSeconds: 12, endSeconds: 18}, sfxIntent: "number reveal hit"},
  ];
  assert.deepEqual(buildCuePlan(scenes), [
    {sceneId: "s01", cue: "click", offsetSeconds: 0.08},
    {sceneId: "s02", cue: "whoosh", offsetSeconds: 3.08},
    {sceneId: "s04", cue: "hit", offsetSeconds: 12.08},
  ]);
});
