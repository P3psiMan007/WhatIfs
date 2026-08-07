import fs from "node:fs";
import path from "node:path";
import { buildMixPlan, mixPlanToFfmpegArgs } from "./filterGraph.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

/**
 * Mixes narration (always dominant) with optional music/ambience/SFX into a
 * single output WAV. Output duration always matches narration - the timing
 * source of truth - via amix duration=first in the underlying filter graph.
 *
 * @returns {Promise<{ ok: boolean, outputPath: string, ffmpegArgs: string[], stderr: string }>}
 */
export const mixAudio = async ({ narrationPath, musicPath = null, ambiencePath = null, sfx = [], levels = {}, outputPath }) => {
  if (!fs.existsSync(narrationPath)) {
    throw new Error(`mixAudio: narration file not found: ${narrationPath}`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const plan = buildMixPlan({ narrationPath, musicPath, ambiencePath, sfx, levels });
  const args = mixPlanToFfmpegArgs(plan, outputPath);
  const result = await runProcess(ffmpegPath, args);

  return {
    ok: result.code === 0 && fs.existsSync(outputPath),
    outputPath,
    ffmpegArgs: args,
    stderr: result.stderr,
  };
};
