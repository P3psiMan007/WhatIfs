import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runTechnicalQaCli } from "./run-technical-qa.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

const STATE_TEMPLATE = path.resolve("episodes/current/episode-state.json");

const withEnv = async (vars, fn) => {
  const prior = {};
  for (const key of Object.keys(vars)) prior[key] = process.env[key];
  Object.assign(process.env, vars);
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
};

test("writes a qa-report.json aggregating requiredAssets from the scene manifest", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-qacli-"));
  const statePath = path.join(dir, "episode-state.json");
  const state = JSON.parse(fs.readFileSync(STATE_TEMPLATE, "utf8"));
  state.episode_id = "ep-1";
  state.state_revision = 7;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  const episodesRoot = path.join(dir, "episodes");
  const episodeDir = path.join(episodesRoot, "ep-1");
  fs.mkdirSync(path.join(episodeDir, "renders"), { recursive: true });
  fs.mkdirSync(path.join(episodeDir, "assets"), { recursive: true });

  const videoPath = path.join(episodeDir, "renders", "ep-1-final.mp4");
  const result = await runProcess(ffmpegPath, [
    "-y",
    "-f", "lavfi", "-i", "color=c=blue:s=1920x1080:r=30:d=1",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
    videoPath,
  ]);
  assert.equal(result.code, 0, result.stderr);

  const presentAsset = path.join(episodeDir, "assets", "present.png");
  fs.writeFileSync(presentAsset, "x");
  fs.writeFileSync(
    path.join(episodeDir, "scene-manifest.json"),
    JSON.stringify({
      episodeId: "ep-1",
      fps: 30,
      scenes: [{ sceneId: "s1", requiredAssets: [presentAsset] }, { sceneId: "s2", requiredAssets: [presentAsset] }],
    }),
  );

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-1", EPISODES_ROOT: episodesRoot }, async () => {
    const report = await runTechnicalQaCli();
    assert.equal(report.episodeId, "ep-1");
    assert.equal(report.stateRevision, 7);

    const assetCheck = report.checks.find((c) => c.name === "required-assets-present");
    assert.equal(assetCheck.status, "PASS");

    const reportOnDisk = JSON.parse(fs.readFileSync(path.join(episodeDir, "qa", "qa-report.json"), "utf8"));
    assert.equal(reportOnDisk.overallStatus, report.overallStatus);
  });
});

test("does not modify episode-state.json - qa.* belongs to Critic/Analytics", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-qacli-"));
  const statePath = path.join(dir, "episode-state.json");
  const state = JSON.parse(fs.readFileSync(STATE_TEMPLATE, "utf8"));
  state.episode_id = "ep-1";
  state.state_revision = 2;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  const before = fs.readFileSync(statePath, "utf8");

  const episodesRoot = path.join(dir, "episodes");
  fs.mkdirSync(path.join(episodesRoot, "ep-1", "renders"), { recursive: true });

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-1", EPISODES_ROOT: episodesRoot }, async () => {
    await runTechnicalQaCli();
  });

  assert.equal(fs.readFileSync(statePath, "utf8"), before);
});
