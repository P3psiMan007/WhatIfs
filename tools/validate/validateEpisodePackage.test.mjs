import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateEpisodePackage } from "./validateEpisodePackage.mjs";

const VALID_EPISODE_PACKAGE = {
  episodeId: "ep-1",
  pipelineVersion: "2.1",
  title: "What if money vanished?",
  premise: "A hypothetical about money disappearing.",
  coreParadox: "Money is both real and imaginary.",
  hookPromise: "You will understand money differently.",
  targetLengthMinutes: 8,
  opportunityScore: 80,
  whyThisWins: "Strong hook.",
  researchQuestions: [],
  factRisks: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const VALID_SCENE_MANIFEST = {
  episodeId: "ep-1",
  fps: 30,
  scenes: [
    {
      sceneId: "s1",
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
    },
  ],
};

const withEpisodeDir = (fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-validate-"));
  return fn(dir);
};

test("passes for a fully valid episode package", () => {
  withEpisodeDir((dir) => {
    fs.writeFileSync(path.join(dir, "episode.json"), JSON.stringify(VALID_EPISODE_PACKAGE));
    fs.writeFileSync(path.join(dir, "scene-manifest.json"), JSON.stringify(VALID_SCENE_MANIFEST));

    const result = validateEpisodePackage(dir);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
  });
});

test("fails when episode.json is missing", () => {
  withEpisodeDir((dir) => {
    fs.writeFileSync(path.join(dir, "scene-manifest.json"), JSON.stringify(VALID_SCENE_MANIFEST));

    const result = validateEpisodePackage(dir);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.file === "episode.json" && e.message.includes("missing")));
  });
});

test("fails when scene-manifest.json violates the schema (bad enum value)", () => {
  withEpisodeDir((dir) => {
    fs.writeFileSync(path.join(dir, "episode.json"), JSON.stringify(VALID_EPISODE_PACKAGE));
    const badManifest = structuredClone(VALID_SCENE_MANIFEST);
    badManifest.scenes[0].cameraIntent = "zoom-into-the-sun"; // not a valid enum value
    fs.writeFileSync(path.join(dir, "scene-manifest.json"), JSON.stringify(badManifest));

    const result = validateEpisodePackage(dir);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.file === "scene-manifest.json"));
  });
});

test("fails on malformed JSON with a clear message, not a crash", () => {
  withEpisodeDir((dir) => {
    fs.writeFileSync(path.join(dir, "episode.json"), "{ this is not valid json");
    fs.writeFileSync(path.join(dir, "scene-manifest.json"), JSON.stringify(VALID_SCENE_MANIFEST));

    const result = validateEpisodePackage(dir);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.file === "episode.json" && e.message.includes("invalid JSON")));
  });
});

test("facts.json is optional - its absence does not fail validation", () => {
  withEpisodeDir((dir) => {
    fs.writeFileSync(path.join(dir, "episode.json"), JSON.stringify(VALID_EPISODE_PACKAGE));
    fs.writeFileSync(path.join(dir, "scene-manifest.json"), JSON.stringify(VALID_SCENE_MANIFEST));

    const result = validateEpisodePackage(dir);
    assert.equal(result.ok, true);
  });
});
