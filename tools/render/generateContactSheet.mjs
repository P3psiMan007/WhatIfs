import fs from "node:fs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";
import { probeMedia } from "../qa/probeMedia.mjs";

/**
 * Samples columns*rows frames evenly across the video's duration and tiles
 * them into one JPEG grid for at-a-glance visual QA.
 * @returns {Promise<{ ok: boolean, stderr: string }>}
 */
export const generateContactSheet = async (videoPath, outputPath, { columns = 4, rows = 4 } = {}) => {
  const probe = await probeMedia(videoPath);
  if (!probe.ok || !probe.format?.duration) {
    throw new Error(`generateContactSheet: could not determine duration of ${videoPath}`);
  }
  const duration = Number.parseFloat(probe.format.duration);
  const frameCount = columns * rows;
  const samplingFps = frameCount / duration;

  const result = await runProcess(ffmpegPath, [
    "-y",
    "-i", videoPath,
    "-vf", `fps=${samplingFps},scale=320:-1,tile=${columns}x${rows}`,
    "-frames:v", "1",
    "-update", "1",
    outputPath,
  ]);

  return { ok: result.code === 0 && fs.existsSync(outputPath), stderr: result.stderr };
};
