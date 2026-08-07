import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { finalizeVideo } from "./finalizeVideo.mjs";
import { probeMedia } from "../qa/probeMedia.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

const makeVideo = async (outputPath) => {
  const result = await runProcess(ffmpegPath, [
    "-y", "-f", "lavfi", "-i", "color=c=blue:s=640x360:r=30:d=1",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    outputPath,
  ]);
  assert.equal(result.code, 0, result.stderr);
};

test("finalizeVideo produces a playable output preserving resolution/duration", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-finalize-"));
  const input = path.join(dir, "in.mp4");
  const output = path.join(dir, "out.mp4");
  await makeVideo(input);

  const result = await finalizeVideo(input, output);
  assert.equal(result.ok, true, result.stderr);

  const probe = await probeMedia(output);
  assert.equal(probe.ok, true);
  const video = probe.streams.find((s) => s.codec_type === "video");
  assert.equal(video.width, 640);
  assert.equal(video.height, 360);
});

test("throws clearly when the input file does not exist", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-finalize-"));
  await assert.rejects(() => finalizeVideo(path.join(dir, "missing.mp4"), path.join(dir, "out.mp4")), /input not found/);
});
