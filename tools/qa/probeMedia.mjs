import { ffprobePath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

/**
 * @returns {Promise<{ ok: boolean, format: object|null, streams: object[], raw: string }>}
 */
export const probeMedia = async (filePath) => {
  const args = ["-v", "error", "-show_format", "-show_streams", "-of", "json", filePath];
  const result = await runProcess(ffprobePath, args);
  if (result.code !== 0) {
    return { ok: false, format: null, streams: [], raw: result.stderr };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return { ok: true, format: parsed.format ?? null, streams: parsed.streams ?? [], raw: result.stdout };
  } catch {
    return { ok: false, format: null, streams: [], raw: result.stdout };
  }
};

export const parseFrameRate = (rateString) => {
  if (!rateString || typeof rateString !== "string") return null;
  const [num, den] = rateString.split("/").map(Number);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
};
