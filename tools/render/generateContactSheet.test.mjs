import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateContactSheet } from "./generateContactSheet.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

const makeVideo = async (outputPath, seconds = 4) => {
  const result = await runProcess(ffmpegPath, [
    "-y", "-f", "lavfi", "-i", `testsrc=size=640x360:rate=30:duration=${seconds}`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    outputPath,
  ]);
  assert.equal(result.code, 0, result.stderr);
};

test("generates a single tiled JPEG contact sheet", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-contactsheet-"));
  const video = path.join(dir, "v.mp4");
  const sheet = path.join(dir, "sheet.jpg");
  await makeVideo(video);

  const result = await generateContactSheet(video, sheet, { columns: 2, rows: 2 });
  assert.equal(result.ok, true, result.stderr);
  assert.ok(fs.statSync(sheet).size > 0);
});

test("output image is wider than a single frame - confirms tiling actually happened", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-contactsheet-"));
  const video = path.join(dir, "v.mp4");
  const sheet = path.join(dir, "sheet.jpg");
  await makeVideo(video);
  await generateContactSheet(video, sheet, { columns: 3, rows: 2 });

  const result = await runProcess(ffmpegPath, ["-i", sheet]);
  // ffmpeg prints stream info (including WxH) to stderr even without -f null
  const match = result.stderr.match(/(\d{3,5})x(\d{3,5})/);
  assert.ok(match, `could not find dimensions in ffmpeg output: ${result.stderr}`);
  const width = Number.parseInt(match[1], 10);
  assert.ok(width >= 320 * 3 * 0.9, `expected a ~3-wide tile grid, got width ${width}`);
});

test("throws a clear error for a video with no readable duration", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-contactsheet-"));
  const missing = path.join(dir, "missing.mp4");
  await assert.rejects(() => generateContactSheet(missing, path.join(dir, "sheet.jpg")), /could not determine duration/);
});
