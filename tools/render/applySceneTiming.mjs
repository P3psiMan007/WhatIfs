#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const normalizeToken = (value) =>
  String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "");

const tokenize = (text) => String(text).trim().split(/\s+/).map(normalizeToken).filter(Boolean);

export const alignSceneManifestToNarration = (manifest, timing) => {
  if (manifest.episodeId !== timing.episodeId) {
    throw new Error(`episode mismatch: manifest=${manifest.episodeId}, timing=${timing.episodeId}`);
  }
  if (!Array.isArray(timing.segments) || timing.segments.length === 0) {
    throw new Error("narration timing has no segments");
  }

  let cursor = 0;
  const scenes = manifest.scenes.map((scene) => {
    const expected = tokenize(scene.narration.text);
    if (expected.length === 0) throw new Error(`scene ${scene.sceneId} has empty narration`);
    const startCursor = cursor;

    for (let i = 0; i < expected.length; i++) {
      const actualSegment = timing.segments[cursor];
      if (!actualSegment) {
        throw new Error(`narration mismatch in ${scene.sceneId}: timing ended before scene narration`);
      }
      const actual = normalizeToken(actualSegment.text);
      if (actual !== expected[i]) {
        throw new Error(
          `narration mismatch in ${scene.sceneId} at scene word ${i}: expected "${expected[i]}", got "${actual}" from segment ${actualSegment.index}`,
        );
      }
      cursor += 1;
    }

    const first = timing.segments[startCursor];
    const last = timing.segments[cursor - 1];
    return {
      ...scene,
      narration: {
        ...scene.narration,
        segmentStartIndex: first.index,
        segmentEndIndex: last.index,
      },
      timing: {
        startSeconds: first.startSeconds,
        endSeconds: last.endSeconds,
      },
    };
  });

  if (cursor !== timing.segments.length) {
    const remaining = timing.segments.length - cursor;
    throw new Error(`narration mismatch: ${remaining} timing segment(s) were not assigned to any scene`);
  }

  return { ...manifest, scenes };
};

export const applySceneTiming = ({ episodeId, episodesRoot = "episodes" }) => {
  if (!episodeId) throw new Error("episodeId is required");
  const episodeDir = path.join(episodesRoot, episodeId);
  const manifestPath = path.join(episodeDir, "scene-manifest.json");
  const timingPath = path.join(episodeDir, "audio", "narration-timing.json");
  if (!fs.existsSync(manifestPath)) throw new Error(`scene manifest not found: ${manifestPath}`);
  if (!fs.existsSync(timingPath)) throw new Error(`narration timing not found: ${timingPath}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const timing = JSON.parse(fs.readFileSync(timingPath, "utf8"));
  const aligned = alignSceneManifestToNarration(manifest, timing);
  fs.writeFileSync(manifestPath, JSON.stringify(aligned, null, 2) + "\n");
  return aligned;
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  try {
    const episodeId = process.env.EPISODE_ID;
    const aligned = applySceneTiming({ episodeId, episodesRoot: process.env.EPISODES_ROOT || "episodes" });
    const first = aligned.scenes[0];
    const last = aligned.scenes[aligned.scenes.length - 1];
    console.log(
      `Aligned ${aligned.scenes.length} scenes for ${aligned.episodeId}: ${first.timing.startSeconds.toFixed(2)}s -> ${last.timing.endSeconds.toFixed(2)}s`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
