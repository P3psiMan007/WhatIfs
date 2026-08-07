import test from "node:test";
import assert from "node:assert/strict";
import { concatenateAudioChunks } from "./concatenateAudio.mjs";

test("concatenates samples from multiple chunks in order", () => {
  const result = concatenateAudioChunks([
    { audio: new Float32Array([1, 2, 3]), samplingRate: 24000 },
    { audio: new Float32Array([4, 5]), samplingRate: 24000 },
  ]);
  assert.deepEqual(Array.from(result.audio), [1, 2, 3, 4, 5]);
  assert.equal(result.samplingRate, 24000);
});

test("returns an empty buffer for zero chunks", () => {
  const result = concatenateAudioChunks([]);
  assert.equal(result.audio.length, 0);
});

test("throws on mismatched sampling rates rather than silently corrupting audio", () => {
  assert.throws(
    () =>
      concatenateAudioChunks([
        { audio: new Float32Array([1]), samplingRate: 24000 },
        { audio: new Float32Array([2]), samplingRate: 16000 },
      ]),
    /mismatched sampling rates/,
  );
});
