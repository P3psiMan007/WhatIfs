import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runGenerateNarration } from "./generate-narration.mjs";
import { probeMedia } from "../qa/probeMedia.mjs";

const STATE_TEMPLATE = path.resolve("episodes/current/episode-state.json");
const SAMPLE_RATE = 24000;

/** Synthetic sine-derived chunks standing in for real Kokoro output - fast, no network. */
async function* fakeStream(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  for (const sentence of sentences) {
    const durationSeconds = 0.5;
    const length = Math.round(SAMPLE_RATE * durationSeconds);
    const audio = new Float32Array(length);
    for (let i = 0; i < length; i++) audio[i] = 0.2 * Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE);
    yield { text: sentence, durationSeconds, audio, samplingRate: SAMPLE_RATE };
  }
}

function withFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-narration-"));
  const statePath = path.join(dir, "episode-state.json");
  const state = JSON.parse(fs.readFileSync(STATE_TEMPLATE, "utf8"));
  state.episode_id = "ep-test";
  state.state = "VOICE_SELECTED";
  state.state_revision = 5;
  state.production.selected_voice = { provider: "kokoro", model: "m", voiceId: "af_heart", speed: 1, language: "en-US", settings: {} };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  const episodesRoot = path.join(dir, "episodes");
  fs.mkdirSync(path.join(episodesRoot, "ep-test"), { recursive: true });
  fs.writeFileSync(
    path.join(episodesRoot, "ep-test", "script.md"),
    "# Episode script\n\nWhat if money vanished overnight? That would change everything we know about the economy.",
  );

  const channelVoicePath = path.join(dir, "channel-voice.json");
  fs.writeFileSync(channelVoicePath, JSON.stringify({ selected: false, voice: null }));

  return fn({ dir, statePath, episodesRoot, channelVoicePath });
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

test("generates narration, writes timing, and advances to VOICE_READY", () =>
  withFixture(({ statePath, episodesRoot, channelVoicePath }) =>
    withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, CHANNEL_VOICE_PATH: channelVoicePath }, async () => {
      const result = await runGenerateNarration({ stream: fakeStream });
      assert.ok(fs.existsSync(result.audioPath));
      assert.ok(fs.existsSync(result.timingPath));
      assert.ok(result.timing.segments.length > 0);

      const probe = await probeMedia(result.audioPath);
      assert.equal(probe.ok, true);

      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      assert.equal(state.state, "VOICE_READY");
      assert.equal(state.state_revision, 7); // patch (+1) then transition (+1)
      assert.equal(state.production.voice_asset, result.audioPath);
      assert.equal(state.production.qa_inputs_ready, true);
    }),
  ));

test("refuses to run outside VOICE_SELECTED/VOICE_BLOCKED", () =>
  withFixture(({ statePath, episodesRoot, channelVoicePath }) => {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.state = "SCRIPTED";
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    return withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, CHANNEL_VOICE_PATH: channelVoicePath }, async () => {
      await assert.rejects(() => runGenerateNarration({ stream: fakeStream }), /refusing to generate narration/);
    });
  }));

test("throws when no narrator voice can be resolved from either the episode or the channel config", () =>
  withFixture(({ statePath, episodesRoot, channelVoicePath }) => {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.production.selected_voice = null;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    return withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, CHANNEL_VOICE_PATH: channelVoicePath }, async () => {
      await assert.rejects(() => runGenerateNarration({ stream: fakeStream }), /no narrator voice resolved/);

      const finalState = JSON.parse(fs.readFileSync(statePath, "utf8"));
      assert.equal(finalState.state, "VOICE_SELECTED", "must not advance state on failure");
    });
  }));

test("falls back to the permanent channel narrator when the episode has no voice override", () =>
  withFixture(({ statePath, episodesRoot, channelVoicePath }) => {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.production.selected_voice = null;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    fs.writeFileSync(
      channelVoicePath,
      JSON.stringify({ selected: true, episodeIdSelectedFrom: "ep-0", selectedAt: "2026-01-01T00:00:00.000Z", voice: { provider: "kokoro", model: "m", voiceId: "am_fenrir", speed: 1, language: "en-US", settings: {} }, notes: "" }),
    );

    return withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, CHANNEL_VOICE_PATH: channelVoicePath }, async () => {
      const result = await runGenerateNarration({ stream: fakeStream });
      assert.ok(fs.existsSync(result.audioPath));
    });
  }));

test("does not advance state when narration generation produces zero chunks", () =>
  withFixture(({ statePath, episodesRoot, channelVoicePath }) =>
    withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, CHANNEL_VOICE_PATH: channelVoicePath }, async () => {
      // eslint-disable-next-line require-yield
      async function* emptyStream() {}
      await assert.rejects(() => runGenerateNarration({ stream: emptyStream }), /zero audio chunks/);

      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      assert.equal(state.state, "VOICE_SELECTED");
    }),
  ));
