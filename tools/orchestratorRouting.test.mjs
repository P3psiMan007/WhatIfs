import test from "node:test";
import assert from "node:assert/strict";
import { determineNextAction, isNoopState } from "./orchestratorRouting.mjs";

test("SCRIPTED routes to voice-audition", () => {
  assert.equal(determineNextAction({ state: "SCRIPTED" }).kind, "voice-audition");
});

test("VOICE_SELECTED routes to narration", () => {
  assert.equal(determineNextAction({ state: "VOICE_SELECTED" }).kind, "narration");
});

test("VOICE_READY routes to render", () => {
  assert.equal(determineNextAction({ state: "VOICE_READY" }).kind, "render");
});

test("QA_FAILED routes to prepare-rerender", () => {
  assert.equal(determineNextAction({ state: "QA_FAILED" }).kind, "prepare-rerender");
});

const explicitNoopStates = [
  "IDLE",
  "VOICE_AUDITIONS_READY",
  "RENDERED",
  "QA_PASSED_AWAITING_USER_APPROVAL",
  "PUBLISHED",
  "ANALYZED",
  "RESEARCH_BLOCKED",
  "VOICE_BLOCKED",
  "QA_FAILED_VOICE",
  "SELECTED",
  "RESEARCHED",
];

for (const state of explicitNoopStates) {
  test(`${state} NOOPs with a specific, non-generic reason`, () => {
    const action = determineNextAction({ state });
    assert.equal(action.kind, "noop");
    assert.ok(action.reason && action.reason.length > 10, `expected a real explanation for ${state}, got "${action.reason}"`);
  });
}

test("never auto-publishes for any known state", () => {
  for (const state of [...explicitNoopStates, "SCRIPTED", "VOICE_SELECTED", "VOICE_READY", "QA_FAILED"]) {
    const action = determineNextAction({ state });
    assert.notEqual(action.kind, "publish");
  }
});

test("never selects a voice for VOICE_AUDITIONS_READY", () => {
  const action = determineNextAction({ state: "VOICE_AUDITIONS_READY" });
  assert.equal(action.kind, "noop");
  assert.match(action.reason, /human/i);
});

test("an unrecognized state NOOPs instead of throwing or guessing", () => {
  const action = determineNextAction({ state: "SOME_FUTURE_STATE_NOT_YET_DEFINED" });
  assert.equal(action.kind, "noop");
  assert.match(action.reason, /unrecognized state/);
});

test("isNoopState matches the states the protocol lists as safe to NOOP", () => {
  for (const state of ["IDLE", "VOICE_AUDITIONS_READY", "RENDERED", "QA_PASSED_AWAITING_USER_APPROVAL", "PUBLISHED", "ANALYZED"]) {
    assert.equal(isNoopState(state), true);
  }
  assert.equal(isNoopState("SCRIPTED"), false);
});
