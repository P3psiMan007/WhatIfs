import fs from "node:fs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";
import { probeMedia, parseFrameRate } from "./probeMedia.mjs";

const check = (name, status, detail) => ({ name, status, detail });

export const checkFileExists = (filePath, name = "file-exists") => {
  const exists = fs.existsSync(filePath);
  return check(name, exists ? "PASS" : "FAIL", exists ? `${filePath} exists` : `${filePath} does not exist`);
};

export const checkNonZeroSize = (filePath, name = "non-zero-size") => {
  if (!fs.existsSync(filePath)) return check(name, "UNVERIFIED", `${filePath} does not exist, cannot check size`);
  const size = fs.statSync(filePath).size;
  return check(name, size > 0 ? "PASS" : "FAIL", `${filePath} is ${size} bytes`);
};

export const checkExpectedResolution = async (filePath, expectedWidth, expectedHeight) => {
  const name = "expected-resolution";
  const probe = await probeMedia(filePath);
  if (!probe.ok) return check(name, "UNVERIFIED", `ffprobe failed: ${probe.raw}`);
  const video = probe.streams.find((s) => s.codec_type === "video");
  if (!video) return check(name, "FAIL", "no video stream found");
  const match = video.width === expectedWidth && video.height === expectedHeight;
  return check(
    name,
    match ? "PASS" : "FAIL",
    `expected ${expectedWidth}x${expectedHeight}, got ${video.width}x${video.height}`,
  );
};

export const checkExpectedFps = async (filePath, expectedFps, toleranceFps = 0.1) => {
  const name = "expected-fps";
  const probe = await probeMedia(filePath);
  if (!probe.ok) return check(name, "UNVERIFIED", `ffprobe failed: ${probe.raw}`);
  const video = probe.streams.find((s) => s.codec_type === "video");
  if (!video) return check(name, "FAIL", "no video stream found");
  const fps = parseFrameRate(video.r_frame_rate) ?? parseFrameRate(video.avg_frame_rate);
  if (fps === null) return check(name, "UNVERIFIED", "could not parse frame rate from ffprobe output");
  const within = Math.abs(fps - expectedFps) <= toleranceFps;
  return check(name, within ? "PASS" : "FAIL", `expected ${expectedFps}fps, got ${fps.toFixed(3)}fps`);
};

export const checkDurationValid = async (filePath, { minSeconds = 0.1, maxSeconds = Infinity } = {}) => {
  const name = "duration-valid";
  const probe = await probeMedia(filePath);
  if (!probe.ok || !probe.format?.duration) return check(name, "UNVERIFIED", `ffprobe failed: ${probe.raw}`);
  const duration = Number.parseFloat(probe.format.duration);
  const within = duration >= minSeconds && duration <= maxSeconds;
  return check(name, within ? "PASS" : "FAIL", `duration ${duration.toFixed(2)}s (expected ${minSeconds}-${maxSeconds}s)`);
};

export const checkVideoStreamExists = async (filePath) => {
  const name = "video-stream-exists";
  const probe = await probeMedia(filePath);
  if (!probe.ok) return check(name, "UNVERIFIED", `ffprobe failed: ${probe.raw}`);
  const hasVideo = probe.streams.some((s) => s.codec_type === "video");
  return check(name, hasVideo ? "PASS" : "FAIL", hasVideo ? "video stream present" : "no video stream");
};

export const checkAudioStreamExists = async (filePath) => {
  const name = "audio-stream-exists";
  const probe = await probeMedia(filePath);
  if (!probe.ok) return check(name, "UNVERIFIED", `ffprobe failed: ${probe.raw}`);
  const hasAudio = probe.streams.some((s) => s.codec_type === "audio");
  return check(name, hasAudio ? "PASS" : "FAIL", hasAudio ? "audio stream present" : "no audio stream");
};

const SILENCE_THRESHOLD_DB = "-30dB";
const SILENCE_MIN_DURATION_S = 2;
const SILENCE_FRACTION_FAIL = 0.3;

export const checkUnexpectedSilence = async (filePath) => {
  const name = "audio-silence";
  const durationProbe = await probeMedia(filePath);
  if (!durationProbe.ok || !durationProbe.format?.duration) {
    return check(name, "UNVERIFIED", "could not determine total duration for silence ratio");
  }
  const totalDuration = Number.parseFloat(durationProbe.format.duration);

  const result = await runProcess(ffmpegPath, [
    "-i", filePath,
    "-af", `silencedetect=noise=${SILENCE_THRESHOLD_DB}:d=${SILENCE_MIN_DURATION_S}`,
    "-f", "null", "-",
  ]);

  const silenceDurations = [...result.stderr.matchAll(/silence_duration:\s*([\d.]+)/g)].map((m) => Number.parseFloat(m[1]));
  if (silenceDurations.length === 0) {
    return check(name, "PASS", "no silence >= threshold detected");
  }
  const totalSilence = silenceDurations.reduce((a, b) => a + b, 0);
  const fraction = totalSilence / totalDuration;
  const status = fraction >= SILENCE_FRACTION_FAIL ? "FAIL" : "PASS";
  return check(name, status, `${totalSilence.toFixed(1)}s silent of ${totalDuration.toFixed(1)}s (${(fraction * 100).toFixed(0)}%)`);
};

const CLIPPING_MAX_VOLUME_THRESHOLD_DB = -0.3;

export const checkAudioClipping = async (filePath) => {
  const name = "audio-clipping";
  const result = await runProcess(ffmpegPath, ["-i", filePath, "-af", "volumedetect", "-f", "null", "-"]);
  const match = result.stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
  if (!match) return check(name, "UNVERIFIED", "volumedetect did not report max_volume");
  const maxVolume = Number.parseFloat(match[1]);
  const status = maxVolume >= CLIPPING_MAX_VOLUME_THRESHOLD_DB ? "FAIL" : "PASS";
  return check(name, status, `peak volume ${maxVolume}dB (fail threshold ${CLIPPING_MAX_VOLUME_THRESHOLD_DB}dB)`);
};

export const checkMissingAssets = (requiredAssetPaths) => {
  const name = "required-assets-present";
  // null/undefined: caller never told us what's required - genuinely unknown.
  // []: caller explicitly declared zero required assets - a known, vacuous PASS.
  if (!requiredAssetPaths) {
    return check(name, "UNVERIFIED", "no required asset list supplied");
  }
  if (requiredAssetPaths.length === 0) {
    return check(name, "PASS", "no assets were required");
  }
  const missing = requiredAssetPaths.filter((p) => !fs.existsSync(p));
  return check(
    name,
    missing.length === 0 ? "PASS" : "FAIL",
    missing.length === 0 ? `all ${requiredAssetPaths.length} required assets present` : `missing: ${missing.join(", ")}`,
  );
};

const BLACK_FRAME_FRACTION_FAIL = 0.05;

export const checkBlackFrames = async (filePath) => {
  const name = "black-frames";
  const durationProbe = await probeMedia(filePath);
  if (!durationProbe.ok || !durationProbe.format?.duration) {
    return check(name, "UNVERIFIED", "could not determine total duration for black-frame ratio");
  }
  const totalDuration = Number.parseFloat(durationProbe.format.duration);

  const result = await runProcess(ffmpegPath, ["-i", filePath, "-vf", "blackdetect=d=0.5:pic_th=0.98", "-f", "null", "-"]);
  const durations = [...result.stderr.matchAll(/black_duration:\s*([\d.]+)/g)].map((m) => Number.parseFloat(m[1]));
  if (durations.length === 0) return check(name, "PASS", "no black segments >= 0.5s detected");
  const totalBlack = durations.reduce((a, b) => a + b, 0);
  const fraction = totalBlack / totalDuration;
  const status = fraction >= BLACK_FRAME_FRACTION_FAIL ? "FAIL" : "PASS";
  return check(name, status, `${totalBlack.toFixed(1)}s black of ${totalDuration.toFixed(1)}s (${(fraction * 100).toFixed(0)}%)`);
};

const FROZEN_FRAME_FRACTION_FAIL = 0.1;

export const checkFrozenFrames = async (filePath) => {
  const name = "frozen-frames";
  const durationProbe = await probeMedia(filePath);
  if (!durationProbe.ok || !durationProbe.format?.duration) {
    return check(name, "UNVERIFIED", "could not determine total duration for frozen-frame ratio");
  }
  const totalDuration = Number.parseFloat(durationProbe.format.duration);

  const result = await runProcess(ffmpegPath, ["-i", filePath, "-vf", "freezedetect=n=-60dB:d=1", "-f", "null", "-"]);
  const durations = [...result.stderr.matchAll(/freeze_duration:\s*([\d.]+)/g)].map((m) => Number.parseFloat(m[1]));
  if (durations.length === 0) return check(name, "PASS", "no frozen segments >= 1s detected");
  const totalFrozen = durations.reduce((a, b) => a + b, 0);
  const fraction = totalFrozen / totalDuration;
  const status = fraction >= FROZEN_FRAME_FRACTION_FAIL ? "FAIL" : "PASS";
  return check(name, status, `${totalFrozen.toFixed(1)}s frozen of ${totalDuration.toFixed(1)}s (${(fraction * 100).toFixed(0)}%)`);
};

export const checkRenderLogForErrors = (renderLogPath) => {
  const name = "render-log-errors";
  if (!renderLogPath || !fs.existsSync(renderLogPath)) {
    return check(name, "UNVERIFIED", "no render log available to inspect");
  }
  const text = fs.readFileSync(renderLogPath, "utf8");
  const errorLines = text.split("\n").filter((line) => /\b(error|fatal|exception)\b/i.test(line));
  return check(
    name,
    errorLines.length === 0 ? "PASS" : "FAIL",
    errorLines.length === 0 ? "no error/fatal/exception lines in render log" : errorLines.slice(0, 5).join(" | "),
  );
};
