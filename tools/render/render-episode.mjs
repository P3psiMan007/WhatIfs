#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { probeMedia } from "../qa/probeMedia.mjs";
import { runTechnicalQA } from "../qa/runTechnicalQA.mjs";
import { validateEpisodePackage } from "../validate/validateEpisodePackage.mjs";
import { finalizeVideo } from "./finalizeVideo.mjs";
import { generateContactSheet } from "./generateContactSheet.mjs";

/** Render owns VOICE_READY->RENDERED; QA_FAILED allows a targeted rerender after a fix. */
const ALLOWED_STATES = ["VOICE_READY", "QA_FAILED"];
const COMPOSITION_ID = "Episode";

const readState = (statePath) => JSON.parse(fs.readFileSync(statePath, "utf8"));
const readJsonIfExists = (filePath) => (fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : null);

const runStateCli = (args, statePath) => {
  const stdout = execFileSync("node", ["tools/episode-state.mjs", ...args], { env: { ...process.env, EPISODE_STATE_PATH: statePath } });
  return JSON.parse(stdout.toString());
};

/**
 * @param {{ bundleFn?: typeof bundle, selectCompositionFn?: typeof selectComposition, renderMediaFn?: typeof renderMedia }} deps
 */
export const renderEpisode = async (deps = {}) => {
  const bundleFn = deps.bundleFn ?? bundle;
  const selectCompositionFn = deps.selectCompositionFn ?? selectComposition;
  const renderMediaFn = deps.renderMediaFn ?? renderMedia;

  const statePath = process.env.EPISODE_STATE_PATH || "episodes/current/episode-state.json";
  const episodeId = process.env.EPISODE_ID;
  const episodesRoot = process.env.EPISODES_ROOT || "episodes";
  const outDir = process.env.RENDER_OUT_DIR || "out";

  if (!episodeId) throw new Error("EPISODE_ID env var is required");

  const state = readState(statePath);
  if (state.episode_id !== episodeId) {
    throw new Error(`episode mismatch: state has "${state.episode_id}", requested "${episodeId}"`);
  }
  if (!ALLOWED_STATES.includes(state.state)) {
    throw new Error(`refusing to render: state is "${state.state}", must be one of ${ALLOWED_STATES.join(", ")}`);
  }

  const episodeDir = path.join(episodesRoot, episodeId);

  // Schema requires scene-manifest.json to exist with at least one scene
  // (minItems: 1) and episode.json to exist and be well-formed - this gate
  // covers both a missing manifest and an empty scenes array, so no
  // separate manual check is needed after it passes.
  const packageValidation = validateEpisodePackage(episodeDir);
  if (!packageValidation.ok) {
    const summary = packageValidation.errors.map((e) => `${e.file}: ${e.message}`).join("; ");
    throw new Error(`refusing to render: episode package failed validation - ${summary}`);
  }

  const sceneManifest = readJsonIfExists(path.join(episodeDir, "scene-manifest.json"));

  const narrationAudioPath = path.join(episodeDir, "audio", "narration.wav");
  if (!fs.existsSync(narrationAudioPath)) {
    throw new Error(`refusing to render: narration.wav not found at ${narrationAudioPath} (state claims VOICE_READY)`);
  }
  const narrationTiming = readJsonIfExists(path.join(episodeDir, "audio", "narration-timing.json"));

  // Remotion's <Audio> can only load http(s) URLs or paths under the
  // project's public/ dir (via staticFile()) - never an arbitrary absolute
  // filesystem path. Stage the real narration file into public/ for this
  // render and clean it up afterwards regardless of outcome.
  const publicRelativePath = path.posix.join("render-assets", episodeId, "narration.wav");
  const stagedAudioPath = path.join(process.cwd(), "public", publicRelativePath);
  fs.mkdirSync(path.dirname(stagedAudioPath), { recursive: true });
  fs.copyFileSync(narrationAudioPath, stagedAudioPath);

  // narration-timing.json (word-level) is best-effort and may not exist yet;
  // narration.wav's own measured duration is always the authoritative
  // fallback length - never the generic episode.json target-length guess.
  let fallbackTotalSeconds = 8 * 60;
  const narrationProbe = await probeMedia(narrationAudioPath);
  if (narrationProbe.ok && narrationProbe.format?.duration) {
    fallbackTotalSeconds = Number.parseFloat(narrationProbe.format.duration);
  }

  const inputProps = {
    episodeId,
    sceneManifest,
    narrationTiming,
    narrationAudioSrc: publicRelativePath,
    fallbackTotalSeconds,
  };

  const videoPath = path.join(outDir, `${episodeId}-final.mp4`);
  const renderLogPath = path.join(outDir, `${episodeId}-render-log.txt`);
  const logLines = [];
  const log = (line) => {
    logLines.push(line);
    console.log(line);
  };

  let composition;
  try {
    console.log("Bundling Remotion project...");
    const bundleLocation = await bundleFn({ entryPoint: path.join(process.cwd(), "src/index.ts") });

    console.log(`Selecting composition "${COMPOSITION_ID}"...`);
    composition = await selectCompositionFn({ serveUrl: bundleLocation, id: COMPOSITION_ID, inputProps });

    fs.mkdirSync(outDir, { recursive: true });
    log(`Rendering ${composition.durationInFrames} frames at ${composition.fps}fps, ${composition.width}x${composition.height}...`);
    await renderMediaFn({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: videoPath,
      inputProps,
      licenseKey: null,
      onProgress: ({ renderedFrames, encodedFrames }) => {
        if (renderedFrames % 30 === 0) log(`  rendered ${renderedFrames}/${composition.durationInFrames}, encoded ${encodedFrames}`);
      },
    });
    log(`Render complete: ${videoPath}`);
  } finally {
    fs.rmSync(path.dirname(stagedAudioPath), { recursive: true, force: true });
  }

  log("Finalizing video (faststart remux)...");
  const finalizedTmpPath = `${videoPath}.faststart.mp4`;
  const finalizeResult = await finalizeVideo(videoPath, finalizedTmpPath);
  if (finalizeResult.ok) {
    fs.renameSync(finalizedTmpPath, videoPath);
  } else {
    log(`  finalize failed, keeping unfinalized render: ${finalizeResult.stderr}`);
    fs.rmSync(finalizedTmpPath, { force: true });
  }

  const contactSheetPath = path.join(outDir, `${episodeId}-contact-sheet.jpg`);
  log("Generating contact sheet...");
  try {
    await generateContactSheet(videoPath, contactSheetPath);
  } catch (error) {
    log(`  contact sheet generation failed: ${error.message}`);
  }

  fs.writeFileSync(renderLogPath, logLines.join("\n") + "\n");

  const requiredAssets = [...new Set(sceneManifest.scenes.flatMap((s) => s.requiredAssets))];
  const qaReportPath = path.join(episodeDir, "qa", `${episodeId}-qa-report.json`);
  log("Running technical QA...");
  const qaReport = await runTechnicalQA({
    episodeId,
    stateRevision: state.state_revision,
    videoPath,
    requiredAssets,
    renderLogPath,
  });
  fs.mkdirSync(path.dirname(qaReportPath), { recursive: true });
  fs.writeFileSync(qaReportPath, JSON.stringify(qaReport, null, 2) + "\n");
  log(`Technical QA: ${qaReport.overallStatus} (${qaReportPath})`);

  const renderManifest = {
    episodeId,
    stateRevision: state.state_revision,
    renderedAt: new Date().toISOString(),
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    durationInFrames: composition.durationInFrames,
    durationSeconds: composition.durationInFrames / composition.fps,
    videoPath,
    narrationPath: narrationAudioPath,
    contactSheetPath: fs.existsSync(contactSheetPath) ? contactSheetPath : null,
    compositionId: COMPOSITION_ID,
    remotionVersion: process.env.npm_package_dependencies_remotion || "4.0.506",
    gitCommit: process.env.GITHUB_SHA || null,
  };
  const rendersDir = path.join(episodeDir, "renders");
  fs.mkdirSync(rendersDir, { recursive: true });
  const manifestPath = path.join(rendersDir, "render-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(renderManifest, null, 2) + "\n");

  const afterPatch = runStateCli(
    ["patch", String(state.state_revision), episodeId, "factory", JSON.stringify({ production: { render_asset: videoPath } })],
    statePath,
  );
  runStateCli(["transition", String(afterPatch.state_revision), episodeId, "RENDERED", "factory", "render completed"], statePath);

  return { videoPath, renderLogPath, manifestPath, renderManifest, qaReportPath, qaReport };
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  renderEpisode().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
