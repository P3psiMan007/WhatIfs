import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { saveFloat32Wav } from "./wavWriter.mjs";

test("writes a valid mono PCM16 WAV from Float32 samples", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-wav-writer-"));
  const outputPath = path.join(dir, "sample.wav");
  const samples = new Float32Array([-1, -0.5, 0, 0.5, 1]);

  saveFloat32Wav(outputPath, samples, 24000);

  const wav = fs.readFileSync(outputPath);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.toString("ascii", 12, 16), "fmt ");
  assert.equal(wav.readUInt16LE(20), 1, "PCM format");
  assert.equal(wav.readUInt16LE(22), 1, "mono");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt16LE(34), 16, "16 bits per sample");
  assert.equal(wav.toString("ascii", 36, 40), "data");
  assert.equal(wav.readUInt32LE(40), samples.length * 2);
  assert.equal(wav.length, 44 + samples.length * 2);

  assert.equal(wav.readInt16LE(44), -32768);
  assert.ok(Math.abs(wav.readInt16LE(46) + 16384) <= 1);
  assert.equal(wav.readInt16LE(48), 0);
  assert.ok(Math.abs(wav.readInt16LE(50) - 16384) <= 1);
  assert.equal(wav.readInt16LE(52), 32767);
});
