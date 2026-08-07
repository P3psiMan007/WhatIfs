import test from "node:test";
import assert from "node:assert/strict";
import { toKokoroGenerateOptions } from "./kokoroClient.mjs";

test("maps VoiceConfig.voiceId to Kokoro's voice option", () => {
  const options = toKokoroGenerateOptions({ voiceId: "am_fenrir", speed: 1, provider: "kokoro", model: "m", language: "en-US", settings: {} });
  assert.equal(options.voice, "am_fenrir");
});

test("distinct voiceIds map to distinct Kokoro voice options - regression guard", () => {
  const a = toKokoroGenerateOptions({ voiceId: "af_heart", speed: 1 });
  const b = toKokoroGenerateOptions({ voiceId: "am_fenrir", speed: 1 });
  assert.notEqual(a.voice, b.voice);
});

test("passes through speed, defaulting to 1 when absent", () => {
  assert.equal(toKokoroGenerateOptions({ voiceId: "af_heart", speed: 1.3 }).speed, 1.3);
  assert.equal(toKokoroGenerateOptions({ voiceId: "af_heart" }).speed, 1);
});

test("never returns voice: undefined for a valid voiceId - the exact prior bug", () => {
  const options = toKokoroGenerateOptions({ voiceId: "bf_emma", speed: 1 });
  assert.notEqual(options.voice, undefined);
});
