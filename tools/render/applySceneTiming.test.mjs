import test from "node:test";
import assert from "node:assert/strict";
import { alignSceneManifestToNarration } from "./applySceneTiming.mjs";

test("aligns sequential scene narration to real word timestamps", () => {
  const manifest = {
    episodeId: "ep",
    fps: 30,
    scenes: [
      {
        sceneId: "s01",
        narration: { text: "You probably think sleep is a switch.", segmentStartIndex: null, segmentEndIndex: null },
        timing: { startSeconds: null, endSeconds: null },
      },
      {
        sceneId: "s02",
        narration: { text: "But your brain does not always work that way.", segmentStartIndex: null, segmentEndIndex: null },
        timing: { startSeconds: null, endSeconds: null },
      },
    ],
  };
  const timing = {
    episodeId: "ep",
    totalDurationSeconds: 5.6,
    segments: [
      { index: 0, text: "You", startSeconds: 0, endSeconds: 0.3 },
      { index: 1, text: "probably", startSeconds: 0.3, endSeconds: 0.8 },
      { index: 2, text: "think", startSeconds: 0.8, endSeconds: 1.2 },
      { index: 3, text: "sleep", startSeconds: 1.2, endSeconds: 1.6 },
      { index: 4, text: "is", startSeconds: 1.6, endSeconds: 1.8 },
      { index: 5, text: "a", startSeconds: 1.8, endSeconds: 1.9 },
      { index: 6, text: "switch.", startSeconds: 1.9, endSeconds: 2.5 },
      { index: 7, text: "But", startSeconds: 2.5, endSeconds: 2.8 },
      { index: 8, text: "your", startSeconds: 2.8, endSeconds: 3.1 },
      { index: 9, text: "brain", startSeconds: 3.1, endSeconds: 3.5 },
      { index: 10, text: "does", startSeconds: 3.5, endSeconds: 3.8 },
      { index: 11, text: "not", startSeconds: 3.8, endSeconds: 4.1 },
      { index: 12, text: "always", startSeconds: 4.1, endSeconds: 4.6 },
      { index: 13, text: "work", startSeconds: 4.6, endSeconds: 4.9 },
      { index: 14, text: "that", startSeconds: 4.9, endSeconds: 5.2 },
      { index: 15, text: "way.", startSeconds: 5.2, endSeconds: 5.6 },
    ],
  };

  const aligned = alignSceneManifestToNarration(manifest, timing);
  assert.deepEqual(aligned.scenes[0].narration, {
    text: "You probably think sleep is a switch.",
    segmentStartIndex: 0,
    segmentEndIndex: 6,
  });
  assert.deepEqual(aligned.scenes[0].timing, { startSeconds: 0, endSeconds: 2.5 });
  assert.deepEqual(aligned.scenes[1].timing, { startSeconds: 2.5, endSeconds: 5.6 });
  assert.equal(aligned.scenes[1].narration.segmentStartIndex, 7);
  assert.equal(aligned.scenes[1].narration.segmentEndIndex, 15);
});

test("fails closed when scene words do not match narration in sequence", () => {
  const manifest = {
    episodeId: "ep",
    fps: 30,
    scenes: [{ sceneId: "s01", narration: { text: "totally different words", segmentStartIndex: null, segmentEndIndex: null }, timing: { startSeconds: null, endSeconds: null } }],
  };
  const timing = { episodeId: "ep", totalDurationSeconds: 1, segments: [{ index: 0, text: "hello", startSeconds: 0, endSeconds: 1 }] };
  assert.throws(() => alignSceneManifestToNarration(manifest, timing), /narration mismatch/);
});
