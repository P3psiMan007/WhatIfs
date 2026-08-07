// Aligns the synthetic scene-manifest timings to the real narration timing,
// the way a real pipeline step would. Temp dir only.
import fs from "node:fs";
import path from "node:path";

const root = process.env.SMOKE_ROOT;
const episodeId = "smoke-ep";
const episodeDir = path.join(root, "episodes", episodeId);
const manifestPath = path.join(episodeDir, "scene-manifest.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const timing = JSON.parse(fs.readFileSync(path.join(episodeDir, "audio", "narration-timing.json"), "utf8"));

let cursor = 0;
for (const scene of manifest.scenes) {
  const wordCount = scene.narration.text.trim().split(/\s+/).filter(Boolean).length;
  const slice = timing.segments.slice(cursor, cursor + wordCount);
  if (slice.length === 0) throw new Error(`no segments left for scene ${scene.sceneId}`);
  scene.narration.segmentStartIndex = slice[0].index;
  scene.narration.segmentEndIndex = slice[slice.length - 1].index;
  scene.timing.startSeconds = slice[0].startSeconds;
  scene.timing.endSeconds = slice[slice.length - 1].endSeconds;
  cursor += wordCount;
}
// Last scene must run to the end of the audio so the video does not end on
// a dead frame after the final word.
manifest.scenes[manifest.scenes.length - 1].timing.endSeconds = timing.totalDurationSeconds;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `aligned ${manifest.scenes.length} scenes to ${timing.totalDurationSeconds.toFixed(2)}s ` +
    `(consumed ${cursor}/${timing.segments.length} word segments)`,
);
for (const s of manifest.scenes) {
  console.log(`  ${s.sceneId}: ${s.timing.startSeconds.toFixed(2)} -> ${s.timing.endSeconds.toFixed(2)}`);
}
