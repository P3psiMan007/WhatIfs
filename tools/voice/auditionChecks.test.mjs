import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runMechanicalAudioChecks } from "./auditionChecks.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

const makeAudio = async (outputPath, ffmpegArgs) => {
  const result = await runProcess(ffmpegPath, ["-y", ...ffmpegArgs, outputPath]);
  assert.equal(result.code, 0, `fixture generation failed: ${result.stderr}`);
};

test("a normal synthetic tone passes every mechanical check", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-audition-"));
  const audioPath = path.join(dir, "candidate.wav");
  await makeAudio(audioPath, ["-f", "lavfi", "-i", "sine=frequency=440:duration=3"]);

  const result = await runMechanicalAudioChecks(audioPath, { failed: false });
  assert.equal(result.fileExists, "PASS");
  assert.equal(result.nonZeroDuration, "PASS");
  assert.equal(result.silenceDetected, "PASS");
  assert.equal(result.generationFailed, false);
});

test("a silent recording FAILs the silence check", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-audition-"));
  const audioPath = path.join(dir, "silent.wav");
  await makeAudio(audioPath, ["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "3"]);

  const result = await runMechanicalAudioChecks(audioPath, { failed: false });
  assert.equal(result.silenceDetected, "FAIL");
});

test("a deliberately failed generation is reported as UNVERIFIED, not a silent pass", async () => {
  const result = await runMechanicalAudioChecks("/does/not/matter.wav", { failed: true, error: "kokoro threw an error" });
  assert.equal(result.fileExists, "UNVERIFIED");
  assert.equal(result.nonZeroDuration, "UNVERIFIED");
  assert.equal(result.generationFailed, true);
  assert.equal(result.detail, "kokoro threw an error");
});

test("a missing output file is a FAIL, not UNVERIFIED - generation claimed success but produced nothing", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-audition-"));
  const result = await runMechanicalAudioChecks(path.join(dir, "never-written.wav"), { failed: false });
  assert.equal(result.fileExists, "FAIL");
});
