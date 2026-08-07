import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mixAudio } from "./mixAudio.mjs";
import { ffmpegPath, ffprobePath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

/** Generates a synthetic sine-tone WAV (no external/copyrighted audio) for test fixtures only. */
const makeTone = async (outputPath, { seconds, freq }) => {
  const args = ["-y", "-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${seconds}`, outputPath];
  const result = await runProcess(ffmpegPath, args);
  assert.equal(result.code, 0, `failed to generate fixture tone: ${result.stderr}`);
};

const probeDurationSeconds = async (filePath) => {
  const args = ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath];
  const result = await runProcess(ffprobePath, args);
  return Number.parseFloat(result.stdout.trim());
};

test("mixAudio combines narration + music into one WAV matching narration duration", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-audio-"));
  const narrationPath = path.join(dir, "narration.wav");
  const musicPath = path.join(dir, "music.wav");
  const outputPath = path.join(dir, "mixed.wav");

  await makeTone(narrationPath, { seconds: 3, freq: 440 });
  await makeTone(musicPath, { seconds: 10, freq: 220 }); // deliberately longer than narration

  const result = await mixAudio({ narrationPath, musicPath, outputPath });

  assert.equal(result.ok, true, result.stderr);
  assert.ok(fs.existsSync(outputPath));

  const duration = await probeDurationSeconds(outputPath);
  assert.ok(Math.abs(duration - 3) < 0.15, `expected ~3s (narration length), got ${duration}s`);
});

test("mixAudio with narration only still produces valid audio", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-audio-"));
  const narrationPath = path.join(dir, "narration.wav");
  const outputPath = path.join(dir, "mixed.wav");

  await makeTone(narrationPath, { seconds: 2, freq: 440 });
  const result = await mixAudio({ narrationPath, outputPath });

  assert.equal(result.ok, true, result.stderr);
  const duration = await probeDurationSeconds(outputPath);
  assert.ok(Math.abs(duration - 2) < 0.15);
});

test("mixAudio rejects a missing narration file before touching ffmpeg", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-audio-"));
  await assert.rejects(
    () => mixAudio({ narrationPath: path.join(dir, "does-not-exist.wav"), outputPath: path.join(dir, "out.wav") }),
    /narration file not found/,
  );
});
