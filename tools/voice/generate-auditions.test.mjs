import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runVoiceAuditions } from "./generate-auditions.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

const STATE_TEMPLATE = path.resolve("episodes/current/episode-state.json");

/** Real ffmpeg-generated tone standing in for Kokoro output - fast, no network, exercises the same downstream mechanical checks. */
const fakeSynthesizeSuccess = async (_text, _voice, outputPath) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const result = await runProcess(ffmpegPath, ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", outputPath]);
  return { ok: result.code === 0, error: result.code === 0 ? null : result.stderr };
};

const fakeSynthesizeAlwaysFails = async () => ({ ok: false, error: "synthetic failure for testing" });

function withFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-voice-"));
  const statePath = path.join(dir, "episode-state.json");
  const state = JSON.parse(fs.readFileSync(STATE_TEMPLATE, "utf8"));
  state.episode_id = "ep-test";
  state.state = "SCRIPTED";
  state.state_revision = 3;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  const episodesRoot = path.join(dir, "episodes");
  fs.mkdirSync(path.join(episodesRoot, "ep-test"), { recursive: true });
  fs.writeFileSync(path.join(episodesRoot, "ep-test", "script.md"), "This is the opening hook of the episode script, used for voice auditions.");

  return fn({ dir, statePath, episodesRoot });
}

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

test("generates auditions, writes a manifest, and transitions to VOICE_AUDITIONS_READY", () =>
  withFixture(({ statePath, episodesRoot }) =>
    withEnv(
      { EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, AUDITION_VOICES: "af_heart,am_fenrir" },
      async () => {
        const manifest = await runVoiceAuditions({ synthesize: fakeSynthesizeSuccess });
        assert.equal(manifest.candidates.length, 2);
        assert.ok(manifest.candidates.every((c) => c.mechanicalChecks.fileExists === "PASS"));

        const newState = JSON.parse(fs.readFileSync(statePath, "utf8"));
        assert.equal(newState.state, "VOICE_AUDITIONS_READY");
        assert.equal(newState.state_revision, 4);

        const manifestOnDisk = JSON.parse(
          fs.readFileSync(path.join(episodesRoot, "ep-test", "audio", "voice-audition-manifest.json"), "utf8"),
        );
        assert.equal(manifestOnDisk.candidates.length, 2);
      },
    ),
  ));

test("refuses to run when state is not SCRIPTED or VOICE_BLOCKED", () =>
  withFixture(({ statePath, episodesRoot }) => {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.state = "IDLE";
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    return withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot }, async () => {
      await assert.rejects(() => runVoiceAuditions({ synthesize: fakeSynthesizeSuccess }), /refusing to run voice auditions/);
    });
  }));

test("refuses to run for the wrong episode id", () =>
  withFixture(({ statePath, episodesRoot }) =>
    withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "some-other-episode", EPISODES_ROOT: episodesRoot }, async () => {
      await assert.rejects(() => runVoiceAuditions({ synthesize: fakeSynthesizeSuccess }), /episode mismatch/);
    }),
  ));

test("aborts without advancing state when every candidate fails to generate", () =>
  withFixture(({ statePath, episodesRoot }) =>
    withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, AUDITION_VOICES: "af_heart,am_fenrir" }, async () => {
      await assert.rejects(() => runVoiceAuditions({ synthesize: fakeSynthesizeAlwaysFails }), /all voice audition candidates failed/);

      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      assert.equal(state.state, "SCRIPTED", "state must not advance when nothing usable was produced");
    }),
  ));

test("partial failure still succeeds as long as one candidate generates", () =>
  withFixture(({ statePath, episodesRoot }) =>
    withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, AUDITION_VOICES: "af_heart,am_fenrir" }, async () => {
      let call = 0;
      const flakySynthesize = async (...args) => {
        call += 1;
        return call === 1 ? fakeSynthesizeAlwaysFails() : fakeSynthesizeSuccess(...args);
      };

      const manifest = await runVoiceAuditions({ synthesize: flakySynthesize });
      assert.equal(manifest.candidates[0].mechanicalChecks.generationFailed, true);
      assert.equal(manifest.candidates[1].mechanicalChecks.fileExists, "PASS");

      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      assert.equal(state.state, "VOICE_AUDITIONS_READY");
    }),
  ));
