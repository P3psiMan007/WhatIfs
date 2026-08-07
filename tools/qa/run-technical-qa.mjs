#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runTechnicalQA } from "./runTechnicalQA.mjs";

/**
 * Writes episodes/<id>/qa/qa-report.json - a mechanical-only technical
 * verdict. Deliberately never writes episode-state.json: qa.* and the
 * RENDERED->QA_PASSED_AWAITING_USER_APPROVAL transition belong to the
 * Critic/Analytics role (see docs/EPISODE_STATE_PROTOCOL.md), which also
 * weighs subjective/creative review this script cannot perform. This is
 * mechanical input to that decision, not the decision itself.
 */
export const runTechnicalQaCli = async () => {
  const statePath = process.env.EPISODE_STATE_PATH || "episodes/current/episode-state.json";
  const episodeId = process.env.EPISODE_ID;
  const episodesRoot = process.env.EPISODES_ROOT || "episodes";
  const videoPathOverride = process.env.VIDEO_PATH || null;
  const renderLogPath = process.env.RENDER_LOG_PATH || null;

  if (!episodeId) throw new Error("EPISODE_ID env var is required");

  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (state.episode_id !== episodeId) {
    throw new Error(`episode mismatch: state has "${state.episode_id}", requested "${episodeId}"`);
  }

  const episodeDir = path.join(episodesRoot, episodeId);
  const videoPath = videoPathOverride || path.join(episodeDir, "renders", `${episodeId}-final.mp4`);

  let requiredAssets;
  const sceneManifestPath = path.join(episodeDir, "scene-manifest.json");
  if (fs.existsSync(sceneManifestPath)) {
    const sceneManifest = JSON.parse(fs.readFileSync(sceneManifestPath, "utf8"));
    requiredAssets = [...new Set(sceneManifest.scenes.flatMap((s) => s.requiredAssets))];
  }

  const report = await runTechnicalQA({
    episodeId,
    stateRevision: state.state_revision,
    videoPath,
    requiredAssets,
    renderLogPath,
  });

  const qaDir = path.join(episodeDir, "qa");
  fs.mkdirSync(qaDir, { recursive: true });
  const reportPath = path.join(qaDir, "qa-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");

  console.log(`Technical QA: ${report.overallStatus} (${reportPath})`);
  for (const check of report.checks) console.log(`  [${check.status}] ${check.name}: ${check.detail}`);

  return report;
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  runTechnicalQaCli()
    .then((report) => {
      if (report.overallStatus === "FAIL") process.exit(1);
      if (report.overallStatus === "UNVERIFIED") process.exit(2);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
