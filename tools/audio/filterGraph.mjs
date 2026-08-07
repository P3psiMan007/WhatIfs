/**
 * Pure ffmpeg filter_complex graph construction for the audio factory.
 * No process spawning here so the graph logic is unit-testable without ffmpeg.
 *
 * Narration is always input 0 and always drives amix's `duration=first`, so
 * the mixed output is exactly as long as narration - the timing source of
 * truth - regardless of how long music/ambience/sfx tracks are.
 */

export const DEFAULT_MIX_LEVELS = {
  narrationGainDb: 0,
  musicDuckDb: -18,
  ambienceDuckDb: -14,
  sfxGainDb: -4,
};

/**
 * @param {{
 *   narrationPath: string,
 *   musicPath?: string | null,
 *   ambiencePath?: string | null,
 *   sfx?: Array<{ path: string, offsetSeconds: number, gainDb?: number }>,
 *   levels?: Partial<typeof DEFAULT_MIX_LEVELS>,
 * }} options
 */
export const buildMixPlan = ({ narrationPath, musicPath = null, ambiencePath = null, sfx = [], levels = {} }) => {
  if (!narrationPath) throw new Error("buildMixPlan requires narrationPath");
  const gain = { ...DEFAULT_MIX_LEVELS, ...levels };

  const inputs = [narrationPath];
  const filterParts = [];
  const mixLabels = [];

  filterParts.push(`[0:a]volume=${gain.narrationGainDb}dB[a0]`);
  mixLabels.push("[a0]");

  let nextIndex = 1;
  if (musicPath) {
    inputs.push(musicPath);
    filterParts.push(`[${nextIndex}:a]volume=${gain.musicDuckDb}dB[a${nextIndex}]`);
    mixLabels.push(`[a${nextIndex}]`);
    nextIndex += 1;
  }
  if (ambiencePath) {
    inputs.push(ambiencePath);
    filterParts.push(`[${nextIndex}:a]volume=${gain.ambienceDuckDb}dB[a${nextIndex}]`);
    mixLabels.push(`[a${nextIndex}]`);
    nextIndex += 1;
  }
  for (const cue of sfx) {
    inputs.push(cue.path);
    const gainDb = cue.gainDb ?? gain.sfxGainDb;
    const delayMs = Math.max(0, Math.round(cue.offsetSeconds * 1000));
    filterParts.push(`[${nextIndex}:a]adelay=${delayMs}|${delayMs},volume=${gainDb}dB[a${nextIndex}]`);
    mixLabels.push(`[a${nextIndex}]`);
    nextIndex += 1;
  }

  const filterComplex =
    inputs.length === 1
      ? filterParts[0].replace("[a0]", "[mixed]")
      : `${filterParts.join(";")};${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0:normalize=0[mixed]`;

  return { inputs, filterComplex, outputLabel: "[mixed]" };
};

export const mixPlanToFfmpegArgs = (plan, outputPath, { overwrite = true } = {}) => {
  const args = [];
  if (overwrite) args.push("-y");
  for (const input of plan.inputs) args.push("-i", input);
  args.push("-filter_complex", plan.filterComplex);
  args.push("-map", plan.outputLabel);
  args.push(outputPath);
  return args;
};
