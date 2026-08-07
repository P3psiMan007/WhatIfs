import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getChannelNarrator, setChannelNarrator, resolveNarratorVoice } from "./channelNarrator.mjs";

const tmpConfigPath = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "whatif-narrator-")), "channel-voice.json");

test("getChannelNarrator returns null when no config file exists yet", () => {
  assert.equal(getChannelNarrator(path.join(os.tmpdir(), "does-not-exist-" + Date.now(), "x.json")), null);
});

test("getChannelNarrator returns null when a narrator has not been selected", () => {
  const configPath = tmpConfigPath();
  fs.writeFileSync(configPath, JSON.stringify({ selected: false, voice: null }));
  assert.equal(getChannelNarrator(configPath), null);
});

test("setChannelNarrator persists a selection that getChannelNarrator then returns", () => {
  const configPath = tmpConfigPath();
  const voice = { provider: "kokoro", model: "onnx-community/Kokoro-82M-v1.0-ONNX", voiceId: "af_heart", speed: 1, language: "en-US", settings: {} };
  setChannelNarrator(voice, "ep-1", "chosen for warmth", configPath);

  const result = getChannelNarrator(configPath);
  assert.equal(result.selected, true);
  assert.equal(result.episodeIdSelectedFrom, "ep-1");
  assert.deepEqual(result.voice, voice);
});

test("resolveNarratorVoice prefers the episode's own production.selected_voice", () => {
  const configPath = tmpConfigPath();
  const channelVoice = { provider: "kokoro", model: "m", voiceId: "af_heart", speed: 1, language: "en-US", settings: {} };
  setChannelNarrator(channelVoice, "ep-1", "", configPath);

  const episodeVoice = { provider: "kokoro", model: "m", voiceId: "am_fenrir", speed: 1, language: "en-US", settings: {} };
  const state = { production: { selected_voice: episodeVoice } };
  assert.deepEqual(resolveNarratorVoice(state, configPath), episodeVoice);
});

test("resolveNarratorVoice falls back to the channel narrator when the episode has no override", () => {
  const configPath = tmpConfigPath();
  const channelVoice = { provider: "kokoro", model: "m", voiceId: "af_heart", speed: 1, language: "en-US", settings: {} };
  setChannelNarrator(channelVoice, "ep-1", "", configPath);

  const state = { production: { selected_voice: null } };
  assert.deepEqual(resolveNarratorVoice(state, configPath), channelVoice);
});

test("resolveNarratorVoice returns null when nothing has been decided anywhere", () => {
  const configPath = tmpConfigPath();
  fs.writeFileSync(configPath, JSON.stringify({ selected: false, voice: null }));
  const state = { production: { selected_voice: null } };
  assert.equal(resolveNarratorVoice(state, configPath), null);
});
