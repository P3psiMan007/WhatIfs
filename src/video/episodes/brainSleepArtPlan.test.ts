import test from "node:test";
import assert from "node:assert/strict";
import { getBrainSleepSceneFamily } from "./brainSleepArtPlan.ts";

test("all 42 Episode 1 scenes have specialized art families", () => {
  const families = new Set<string>();
  for (let i = 1; i <= 42; i++) {
    const sceneId = `s${String(i).padStart(2, "0")}`;
    const family = getBrainSleepSceneFamily(sceneId);
    assert.notEqual(family, "fallback", `${sceneId} must not use the generic renderer`);
    families.add(family);
  }
  assert.ok(families.size >= 9, `expected strong visual variety, got only ${families.size} families`);
});

test("unknown scene ids fail closed to fallback", () => {
  assert.equal(getBrainSleepSceneFamily("s99"), "fallback");
  assert.equal(getBrainSleepSceneFamily("other"), "fallback");
});
