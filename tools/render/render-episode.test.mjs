import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderEpisode } from "./render-episode.mjs";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";

const STATE_TEMPLATE = path.resolve("episodes/current/episode-state.json");

const fakeBundle = async () => "file:///fake-bundle";
const fakeSelectComposition = async () => ({ width: 1920, height: 1080, fps: 30, durationInFrames: 90 });
const fakeRenderMedia = async ({ outputLocation, onProgress }) => {
  onProgress?.({ renderedFrames: 90, encodedFrames: 90 });
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });
  fs.writeFileSync(outputLocation, "fake mp4 bytes");
};

const makeNarration = async (outputPath, seconds) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const result = await runProcess(ffmpegPath, ["-y", "-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`, outputPath]);
  assert.equal(result.code, 0, result.stderr);
};

const VALID_EPISODE_PACKAGE = {
  episodeId: "ep-test",
  pipelineVersion: "2.1",
  title: "Test episode",
  premise: "A premise.",
  coreParadox: "A paradox.",
  hookPromise: "A promise.",
  targetLengthMinutes: 8,
  opportunityScore: 70,
  whyThisWins: "Reasons.",
  researchQuestions: [],
  factRisks: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const validScene = (sceneId) => ({
  sceneId,
  order: 0,
  narration: { text: "hi", segmentStartIndex: null, segmentEndIndex: null },
  timing: { startSeconds: null, endSeconds: null },
  visualPurpose: "establish-premise",
  focalSubject: "narrator",
  environment: "void",
  props: [],
  cameraIntent: "static",
  motionIntent: ["none"],
  caption: "hi",
  sfxIntent: null,
  transitionIn: "hard-cut",
  requiredAssets: [],
  newInformation: "intro",
});

function withFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-render-"));
  const statePath = path.join(dir, "episode-state.json");
  const state = JSON.parse(fs.readFileSync(STATE_TEMPLATE, "utf8"));
  state.episode_id = "ep-test";
  state.state = "VOICE_READY";
  state.state_revision = 4;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  const episodesRoot = path.join(dir, "episodes");
  const episodeDir = path.join(episodesRoot, "ep-test");
  fs.mkdirSync(episodeDir, { recursive: true });
  fs.writeFileSync(path.join(episodeDir, "episode.json"), JSON.stringify(VALID_EPISODE_PACKAGE));
  fs.writeFileSync(
    path.join(episodeDir, "scene-manifest.json"),
    JSON.stringify({ episodeId: "ep-test", fps: 30, scenes: [validScene("s1")] }),
  );

  return { dir, statePath, episodesRoot, episodeDir };
}

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

const projectRoot = process.cwd();
const stagedDirFor = (episodeId) => path.join(projectRoot, "public", "render-assets", episodeId);

test("renders, stages+cleans up public audio, writes a manifest, and transitions to RENDERED", async () => {
  const { statePath, episodesRoot, episodeDir } = withFixture(() => {});
  await makeNarration(path.join(episodeDir, "audio", "narration.wav"), 3);
  const outDir = path.join(episodeDir, "out");

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, RENDER_OUT_DIR: outDir }, async () => {
    const result = await renderEpisode({ bundleFn: fakeBundle, selectCompositionFn: fakeSelectComposition, renderMediaFn: fakeRenderMedia });
    assert.ok(fs.existsSync(result.videoPath));
    assert.ok(fs.existsSync(result.manifestPath));

    // staged public/ copy must be cleaned up after a successful render
    assert.equal(fs.existsSync(stagedDirFor("ep-test")), false);

    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.equal(state.state, "RENDERED");
    assert.equal(state.state_revision, 6); // patch (+1) then transition (+1)
    assert.equal(state.production.render_asset, result.videoPath);

    const manifestOnDisk = JSON.parse(fs.readFileSync(result.manifestPath, "utf8"));
    assert.equal(manifestOnDisk.episodeId, "ep-test");
    assert.equal(manifestOnDisk.width, 1920);
    assert.equal(manifestOnDisk.height, 1080);
    assert.equal(manifestOnDisk.fps, 30);
    assert.equal(manifestOnDisk.durationInFrames, 90);
    assert.equal(manifestOnDisk.durationSeconds, 3);
    assert.equal(manifestOnDisk.compositionId, "Episode");
    assert.equal(manifestOnDisk.videoPath, result.videoPath);
  });
});

test("cleans up the staged public/ audio copy even when rendering throws", async () => {
  const { statePath, episodesRoot, episodeDir } = withFixture(() => {});
  await makeNarration(path.join(episodeDir, "audio", "narration.wav"), 2);

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot }, async () => {
    const throwingRender = async () => {
      throw new Error("simulated render crash");
    };
    await assert.rejects(
      () => renderEpisode({ bundleFn: fakeBundle, selectCompositionFn: fakeSelectComposition, renderMediaFn: throwingRender }),
      /simulated render crash/,
    );
    assert.equal(fs.existsSync(stagedDirFor("ep-test")), false);

    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.equal(state.state, "VOICE_READY", "must not advance state on a failed render");
  });
});

test("refuses to render outside VOICE_READY/QA_FAILED", async () => {
  const { statePath, episodesRoot, episodeDir } = withFixture(() => {});
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  state.state = "SCRIPTED";
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  await makeNarration(path.join(episodeDir, "audio", "narration.wav"), 1);

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot }, async () => {
    await assert.rejects(
      () => renderEpisode({ bundleFn: fakeBundle, selectCompositionFn: fakeSelectComposition, renderMediaFn: fakeRenderMedia }),
      /refusing to render/,
    );
  });
});

test("refuses to render when the scene manifest has zero scenes (caught by schema validation)", async () => {
  const { statePath, episodesRoot, episodeDir } = withFixture(() => {});
  fs.writeFileSync(path.join(episodeDir, "scene-manifest.json"), JSON.stringify({ episodeId: "ep-test", fps: 30, scenes: [] }));
  await makeNarration(path.join(episodeDir, "audio", "narration.wav"), 1);

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot }, async () => {
    await assert.rejects(
      () => renderEpisode({ bundleFn: fakeBundle, selectCompositionFn: fakeSelectComposition, renderMediaFn: fakeRenderMedia }),
      /failed validation/,
    );
  });
});

test("refuses to render when episode.json is missing", async () => {
  const { statePath, episodesRoot, episodeDir } = withFixture(() => {});
  fs.rmSync(path.join(episodeDir, "episode.json"));
  await makeNarration(path.join(episodeDir, "audio", "narration.wav"), 1);

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot }, async () => {
    await assert.rejects(
      () => renderEpisode({ bundleFn: fakeBundle, selectCompositionFn: fakeSelectComposition, renderMediaFn: fakeRenderMedia }),
      /failed validation/,
    );
  });
});

test("refuses to render when narration.wav does not exist yet", async () => {
  const { statePath, episodesRoot } = withFixture(() => {});

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot }, async () => {
    await assert.rejects(
      () => renderEpisode({ bundleFn: fakeBundle, selectCompositionFn: fakeSelectComposition, renderMediaFn: fakeRenderMedia }),
      /narration\.wav not found/,
    );
  });
});

test("passes a public-relative narrationAudioSrc (not an absolute path) to the composition", async () => {
  const { statePath, episodesRoot, episodeDir } = withFixture(() => {});
  await makeNarration(path.join(episodeDir, "audio", "narration.wav"), 1.5);

  let capturedProps = null;
  const capturingSelectComposition = async (opts) => {
    capturedProps = opts.inputProps;
    return fakeSelectComposition();
  };

  await withEnv({ EPISODE_STATE_PATH: statePath, EPISODE_ID: "ep-test", EPISODES_ROOT: episodesRoot, RENDER_OUT_DIR: path.join(episodeDir, "out") }, async () => {
    await renderEpisode({ bundleFn: fakeBundle, selectCompositionFn: capturingSelectComposition, renderMediaFn: fakeRenderMedia });
  });

  assert.ok(capturedProps.narrationAudioSrc);
  assert.ok(!path.isAbsolute(capturedProps.narrationAudioSrc), `expected a relative path, got "${capturedProps.narrationAudioSrc}"`);
  assert.ok(Math.abs(capturedProps.fallbackTotalSeconds - 1.5) < 0.2, "fallbackTotalSeconds should come from narration.wav's real duration");
});
