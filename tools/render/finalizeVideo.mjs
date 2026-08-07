import fs from "node:fs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

/**
 * Lossless remux (stream copy, no re-encode) that moves the MP4 moov atom
 * to the front of the file so it can start playing before it's fully
 * downloaded ("faststart") - standard finalization for web/YouTube delivery.
 * @returns {Promise<{ ok: boolean, stderr: string }>}
 */
export const finalizeVideo = async (inputPath, outputPath) => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`finalizeVideo: input not found: ${inputPath}`);
  }
  const result = await runProcess(ffmpegPath, ["-y", "-i", inputPath, "-c", "copy", "-movflags", "+faststart", outputPath]);
  return { ok: result.code === 0 && fs.existsSync(outputPath), stderr: result.stderr };
};
