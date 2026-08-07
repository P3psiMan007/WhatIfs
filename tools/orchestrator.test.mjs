import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runOrchestrator, parseEpisodeArg } from "./orchestrator.mjs";

const STATE_TEMPLATE = path.resolve("episodes/current/episode-state.json");

const makeStatePath = (overrides) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-orch-"));
  const statePath = path.join(dir, "episode-state.json");
  const state = { ...JSON.parse(fs.readFileSync(STATE_TEMPLATE, "utf8")), ...overrides };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return statePath;
};

const withEnv = async (vars, fn) => {
  const prior = {};
  for (const key of Object.keys(vars)) prior[key] = process.env[key];
  Object.assign(process.env, vars);
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
};

test("parseEpisodeArg reads --episode <id> from argv", () => {
  assert.equal(parseEpisodeArg(["--episode", "ep-42"]), "ep-42");
  assert.equal(parseEpisodeArg(["node", "script.mjs", "--episode", "ep-7"]), "ep-7");
  assert.equal(parseEpisodeArg(["--episode"]), null);
  assert.equal(parseEpisodeArg([]), null);
});

test("dispatches SCRIPTED to the voice-audition tool", async () => {
  const statePath = makeStatePath({ episode_id: "ep-1", state: "SCRIPTED" });
  let called = false;

  await withEnv({ EPISODE_STATE_PATH: statePath }, async () => {
    const result = await runOrchestrator({ runVoiceAuditions: async () => { called = true; return "auditions-ran"; } });
    assert.equal(result.action, "voice-audition");
    assert.equal(result.result, "auditions-ran");
  });
  assert.equal(called, true);
});

test("dispatches VOICE_SELECTED to the narration tool", async () => {
  const statePath = makeStatePath({ episode_id: "ep-1", state: "VOICE_SELECTED" });

  await withEnv({ EPISODE_STATE_PATH: statePath }, async () => {
    const result = await runOrchestrator({ runGenerateNarration: async () => "narration-ran" });
    assert.equal(result.action, "narration");
    assert.equal(result.result, "narration-ran");
  });
});

test("dispatches VOICE_READY to the render tool", async () => {
  const statePath = makeStatePath({ episode_id: "ep-1", state: "VOICE_READY" });

  await withEnv({ EPISODE_STATE_PATH: statePath }, async () => {
    const result = await runOrchestrator({ renderEpisode: async () => "render-ran" });
    assert.equal(result.action, "render");
    assert.equal(result.result, "render-ran");
  });
});

test("NOOPs on IDLE without calling any dispatched tool", async () => {
  const statePath = makeStatePath({ episode_id: null, state: "IDLE" });
  const spies = { calls: 0 };
  const spy = async () => {
    spies.calls += 1;
  };

  await withEnv({ EPISODE_STATE_PATH: statePath }, async () => {
    const result = await runOrchestrator({ runVoiceAuditions: spy, runGenerateNarration: spy, renderEpisode: spy });
    assert.equal(result.action, "noop");
    assert.match(result.reason, /Growth/);
  });
  assert.equal(spies.calls, 0, "no tool should be invoked for a NOOP state");
});

test("QA_FAILED summarizes required fixes without calling render again automatically", async () => {
  const statePath = makeStatePath({
    episode_id: "ep-1",
    state: "QA_FAILED",
    qa: { status: "FAIL", scores: {}, top_issues: ["black frames at scene 3"], required_fixes: ["fix scene 3 asset"], user_action_required: null },
  });
  let renderCalled = false;

  await withEnv({ EPISODE_STATE_PATH: statePath }, async () => {
    const result = await runOrchestrator({ renderEpisode: async () => { renderCalled = true; } });
    assert.equal(result.action, "prepare-rerender");
    assert.deepEqual(result.result.requiredFixes, ["fix scene 3 asset"]);
  });
  assert.equal(renderCalled, false);
});

test("rejects a --episode argument that does not match the state file's episode", async () => {
  const statePath = makeStatePath({ episode_id: "ep-1", state: "SCRIPTED" });

  await withEnv({ EPISODE_STATE_PATH: statePath }, async () => {
    const originalArgv = process.argv;
    process.argv = [...originalArgv.slice(0, 2), "--episode", "some-other-episode"];
    try {
      await assert.rejects(() => runOrchestrator({ runVoiceAuditions: async () => {} }), /episode mismatch/);
    } finally {
      process.argv = originalArgv;
    }
  });
});

test("propagates the current episode id to EPISODE_ID for downstream tools", async () => {
  const statePath = makeStatePath({ episode_id: "ep-propagate", state: "SCRIPTED" });
  delete process.env.EPISODE_ID;

  let seenEpisodeId = null;
  await withEnv({ EPISODE_STATE_PATH: statePath }, async () => {
    await runOrchestrator({
      runVoiceAuditions: async () => {
        seenEpisodeId = process.env.EPISODE_ID;
      },
    });
  });
  assert.equal(seenEpisodeId, "ep-propagate");
  delete process.env.EPISODE_ID;
});
