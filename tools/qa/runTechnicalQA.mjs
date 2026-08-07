import {
  checkFileExists,
  checkNonZeroSize,
  checkExpectedResolution,
  checkExpectedFps,
  checkDurationValid,
  checkVideoStreamExists,
  checkAudioStreamExists,
  checkUnexpectedSilence,
  checkAudioClipping,
  checkBlackFrames,
  checkFrozenFrames,
  checkMissingAssets,
  checkRenderLogForErrors,
} from "./technicalChecks.mjs";

const SKIPPED_DOWNSTREAM_CHECK_NAMES = [
  "expected-resolution",
  "expected-fps",
  "duration-valid",
  "video-stream-exists",
  "audio-stream-exists",
  "audio-silence",
  "audio-clipping",
  "black-frames",
  "frozen-frames",
];

/**
 * Runs the full technical QA suite against a rendered episode and returns a
 * QAReport (see src/video/types/qa.ts). overallStatus is FAIL if any check
 * FAILed, else UNVERIFIED if any check could not run, else PASS - an
 * unperformed check is never silently counted as a pass.
 */
export const runTechnicalQA = async ({
  episodeId,
  stateRevision,
  videoPath,
  expectedWidth = 1920,
  expectedHeight = 1080,
  expectedFps = 30,
  minDurationSeconds = 1,
  maxDurationSeconds = Number.POSITIVE_INFINITY,
  requiredAssets, // no default: undefined (unknown) must stay distinct from [] (explicitly zero) - see checkMissingAssets
  renderLogPath = null,
}) => {
  const checks = [checkFileExists(videoPath, "mp4-exists"), checkNonZeroSize(videoPath, "mp4-non-zero-size")];
  const fileUsable = checks.every((c) => c.status === "PASS");

  if (fileUsable) {
    checks.push(
      await checkExpectedResolution(videoPath, expectedWidth, expectedHeight),
      await checkExpectedFps(videoPath, expectedFps),
      await checkDurationValid(videoPath, { minSeconds: minDurationSeconds, maxSeconds: maxDurationSeconds }),
      await checkVideoStreamExists(videoPath),
      await checkAudioStreamExists(videoPath),
      await checkUnexpectedSilence(videoPath),
      await checkAudioClipping(videoPath),
      await checkBlackFrames(videoPath),
      await checkFrozenFrames(videoPath),
    );
  } else {
    for (const name of SKIPPED_DOWNSTREAM_CHECK_NAMES) {
      checks.push({ name, status: "UNVERIFIED", detail: "skipped: video file missing or empty" });
    }
  }

  checks.push(checkMissingAssets(requiredAssets));
  checks.push(checkRenderLogForErrors(renderLogPath));

  const overallStatus = checks.some((c) => c.status === "FAIL")
    ? "FAIL"
    : checks.some((c) => c.status === "UNVERIFIED")
      ? "UNVERIFIED"
      : "PASS";

  return {
    episodeId,
    stateRevision,
    generatedAt: new Date().toISOString(),
    overallStatus,
    checks,
  };
};
