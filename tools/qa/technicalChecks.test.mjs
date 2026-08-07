import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkFileExists,
  checkNonZeroSize,
  checkExpectedResolution,
  checkExpectedFps,
  checkDurationValid,
  checkVideoStreamExists,
  checkAudioStreamExists,
  checkBlackFrames,
  checkMissingAssets,
  checkRenderLogForErrors,
} from "./technicalChecks.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "whatif-qa-"));

const makeVideo = async (outputPath, { width = 1920, height = 1080, fps = 30, seconds = 2, color = "blue" } = {}) => {
  const result = await runProcess(ffmpegPath, [
    "-y",
    "-f", "lavfi", "-i", `color=c=${color}:s=${width}x${height}:r=${fps}:d=${seconds}`,
    "-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
    outputPath,
  ]);
  assert.equal(result.code, 0, `fixture video generation failed: ${result.stderr}`);
};

test("checkFileExists PASSes for a real file and FAILs for a missing one", () => {
  const dir = tmpDir();
  const realFile = path.join(dir, "x.txt");
  fs.writeFileSync(realFile, "x");
  assert.equal(checkFileExists(realFile).status, "PASS");
  assert.equal(checkFileExists(path.join(dir, "missing.txt")).status, "FAIL");
});

test("checkNonZeroSize is UNVERIFIED for a missing file, not FAIL", () => {
  assert.equal(checkNonZeroSize("/does/not/exist").status, "UNVERIFIED");
});

test("checkExpectedResolution PASSes on a match and FAILs on a mismatch", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeVideo(videoPath, { width: 1920, height: 1080 });

  assert.equal((await checkExpectedResolution(videoPath, 1920, 1080)).status, "PASS");
  assert.equal((await checkExpectedResolution(videoPath, 1280, 720)).status, "FAIL");
});

test("checkExpectedFps PASSes within tolerance and FAILs outside it", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeVideo(videoPath, { fps: 30 });

  assert.equal((await checkExpectedFps(videoPath, 30)).status, "PASS");
  assert.equal((await checkExpectedFps(videoPath, 24)).status, "FAIL");
});

test("checkDurationValid respects min/max bounds", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeVideo(videoPath, { seconds: 2 });

  assert.equal((await checkDurationValid(videoPath, { minSeconds: 1, maxSeconds: 5 })).status, "PASS");
  assert.equal((await checkDurationValid(videoPath, { minSeconds: 10 })).status, "FAIL");
});

test("checkVideoStreamExists and checkAudioStreamExists both PASS for a normal render", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeVideo(videoPath);

  assert.equal((await checkVideoStreamExists(videoPath)).status, "PASS");
  assert.equal((await checkAudioStreamExists(videoPath)).status, "PASS");
});

test("checkAudioStreamExists FAILs for a video-only file", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  const result = await runProcess(ffmpegPath, [
    "-y", "-f", "lavfi", "-i", "color=c=red:s=640x360:r=30:d=1",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an",
    videoPath,
  ]);
  assert.equal(result.code, 0, result.stderr);

  assert.equal((await checkAudioStreamExists(videoPath)).status, "FAIL");
});

test("checkBlackFrames PASSes on normal footage", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeVideo(videoPath, { color: "blue", seconds: 2 });
  assert.equal((await checkBlackFrames(videoPath)).status, "PASS");
});

test("checkBlackFrames FAILs when most of the clip is black", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeVideo(videoPath, { color: "black", seconds: 3 });
  assert.equal((await checkBlackFrames(videoPath)).status, "FAIL");
});

test("checkMissingAssets reports which specific paths are missing", () => {
  const dir = tmpDir();
  const present = path.join(dir, "present.png");
  fs.writeFileSync(present, "x");
  const missing = path.join(dir, "missing.png");

  const result = checkMissingAssets([present, missing]);
  assert.equal(result.status, "FAIL");
  assert.ok(result.detail.includes("missing.png"));
});

test("checkMissingAssets PASSes when every asset is present", () => {
  const dir = tmpDir();
  const a = path.join(dir, "a.png");
  fs.writeFileSync(a, "x");
  assert.equal(checkMissingAssets([a]).status, "PASS");
});

test("checkMissingAssets is UNVERIFIED when no list was supplied at all (genuinely unknown)", () => {
  assert.equal(checkMissingAssets(undefined).status, "UNVERIFIED");
  assert.equal(checkMissingAssets(null).status, "UNVERIFIED");
});

test("checkMissingAssets PASSes on an explicitly empty list (a known zero, not an unknown)", () => {
  assert.equal(checkMissingAssets([]).status, "PASS");
});

test("checkRenderLogForErrors FAILs when the log contains error/fatal lines", () => {
  const dir = tmpDir();
  const logPath = path.join(dir, "render.log");
  fs.writeFileSync(logPath, "Bundling 50%\nError: something broke\nBundling 100%\n");
  assert.equal(checkRenderLogForErrors(logPath).status, "FAIL");
});

test("checkRenderLogForErrors PASSes on a clean log", () => {
  const dir = tmpDir();
  const logPath = path.join(dir, "render.log");
  fs.writeFileSync(logPath, "Bundling 100%\nRendered 100/100\nEncoded 100/100\n");
  assert.equal(checkRenderLogForErrors(logPath).status, "PASS");
});

test("checkRenderLogForErrors is UNVERIFIED when no log path is given", () => {
  assert.equal(checkRenderLogForErrors(null).status, "UNVERIFIED");
});
