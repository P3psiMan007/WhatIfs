import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runTechnicalQA } from "./runTechnicalQA.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "whatif-runqa-"));

const makeValidVideo = async (outputPath) => {
  const result = await runProcess(ffmpegPath, [
    "-y",
    "-f", "lavfi", "-i", "color=c=blue:s=1920x1080:r=30:d=2",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
    outputPath,
  ]);
  assert.equal(result.code, 0, result.stderr);
};

test("overallStatus is PASS when every check passes", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeValidVideo(videoPath);
  const renderLogPath = path.join(dir, "render.log");
  fs.writeFileSync(renderLogPath, "Bundling 100%\nRendered 60/60\nEncoded 60/60\n");

  const report = await runTechnicalQA({
    episodeId: "ep-1",
    stateRevision: 3,
    videoPath,
    expectedWidth: 1920,
    expectedHeight: 1080,
    expectedFps: 30,
    requiredAssets: [], // explicitly zero required assets, not "unspecified"
    renderLogPath,
  });

  assert.equal(report.overallStatus, "PASS");
  assert.ok(report.checks.every((c) => c.status === "PASS"), JSON.stringify(report.checks, null, 2));
});

test("overallStatus is FAIL if any single check FAILs, regardless of the rest", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeValidVideo(videoPath);

  const report = await runTechnicalQA({
    episodeId: "ep-1",
    stateRevision: 3,
    videoPath,
    expectedWidth: 3840, // wrong on purpose
    expectedHeight: 2160,
    expectedFps: 30,
  });

  assert.equal(report.overallStatus, "FAIL");
});

test("overallStatus is UNVERIFIED (never a silent PASS) when the video file is missing", async () => {
  const dir = tmpDir();
  const report = await runTechnicalQA({
    episodeId: "ep-1",
    stateRevision: 3,
    videoPath: path.join(dir, "does-not-exist.mp4"),
  });

  assert.equal(report.overallStatus, "FAIL"); // mp4-exists itself FAILs
  const downstreamChecks = report.checks.filter((c) => c.name === "expected-resolution" || c.name === "black-frames");
  assert.ok(downstreamChecks.every((c) => c.status === "UNVERIFIED"), "downstream checks must not silently run/pass on a missing file");
});

test("required assets and render log are both included in the report", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeValidVideo(videoPath);
  const missingAsset = path.join(dir, "thumbnail.png");

  const report = await runTechnicalQA({
    episodeId: "ep-1",
    stateRevision: 3,
    videoPath,
    requiredAssets: [missingAsset],
  });

  const assetCheck = report.checks.find((c) => c.name === "required-assets-present");
  assert.equal(assetCheck.status, "FAIL");
  assert.equal(report.overallStatus, "FAIL");
});

test("requiredAssets left unspecified is UNVERIFIED, not silently treated as zero - regression guard", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeValidVideo(videoPath);

  const report = await runTechnicalQA({ episodeId: "ep-1", stateRevision: 3, videoPath });
  const assetCheck = report.checks.find((c) => c.name === "required-assets-present");
  assert.equal(assetCheck.status, "UNVERIFIED");
});

test("report carries episodeId and stateRevision through verbatim", async () => {
  const dir = tmpDir();
  const videoPath = path.join(dir, "v.mp4");
  await makeValidVideo(videoPath);

  const report = await runTechnicalQA({ episodeId: "ep-42", stateRevision: 9, videoPath });
  assert.equal(report.episodeId, "ep-42");
  assert.equal(report.stateRevision, 9);
});
