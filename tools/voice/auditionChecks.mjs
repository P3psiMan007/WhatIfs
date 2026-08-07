import { checkFileExists, checkNonZeroSize, checkDurationValid, checkUnexpectedSilence, checkAudioClipping } from "../qa/technicalChecks.mjs";

const UNVERIFIED_QUAD = { nonZeroDuration: "UNVERIFIED", silenceDetected: "UNVERIFIED", clippingDetected: "UNVERIFIED" };

/**
 * Mechanical-only checks on a single audition WAV: file existence, size,
 * duration, silence, clipping. status fields mirror the underlying check's
 * own PASS/FAIL/UNVERIFIED - e.g. silenceDetected: "PASS" means the silence
 * check ran and found no problematic silence, not that silence was found.
 * Never claims subjective voice quality.
 */
export const runMechanicalAudioChecks = async (audioPath, generation) => {
  if (generation.failed) {
    return { fileExists: "UNVERIFIED", ...UNVERIFIED_QUAD, generationFailed: true, detail: generation.error ?? "generation failed" };
  }

  const fileExistsCheck = checkFileExists(audioPath, "audition-file-exists");
  if (fileExistsCheck.status !== "PASS") {
    return { fileExists: "FAIL", ...UNVERIFIED_QUAD, generationFailed: false, detail: fileExistsCheck.detail };
  }

  const sizeCheck = checkNonZeroSize(audioPath, "audition-non-zero-size");
  const durationCheck = await checkDurationValid(audioPath, { minSeconds: 0.5 });
  const silenceCheck = await checkUnexpectedSilence(audioPath);
  const clippingCheck = await checkAudioClipping(audioPath);

  return {
    fileExists: "PASS",
    nonZeroDuration: sizeCheck.status === "PASS" && durationCheck.status === "PASS" ? "PASS" : "FAIL",
    silenceDetected: silenceCheck.status,
    clippingDetected: clippingCheck.status,
    generationFailed: false,
    detail: [sizeCheck.detail, durationCheck.detail, silenceCheck.detail, clippingCheck.detail].join(" | "),
  };
};
