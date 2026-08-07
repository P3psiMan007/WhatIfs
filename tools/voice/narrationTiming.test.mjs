import test from "node:test";
import assert from "node:assert/strict";
import { interpolateWordTimingWithinChunk, buildNarrationTimingFromChunks } from "./narrationTiming.mjs";

test("interpolates word timing proportionally to word length", () => {
  const words = interpolateWordTimingWithinChunk("hi elephant", 10, 3, 0);
  assert.equal(words.length, 2);
  assert.equal(words[0].text, "hi");
  assert.equal(words[0].startSeconds, 10);
  // "hi" (2 chars) vs "elephant" (8 chars) of 10 total chars -> hi gets 20% of 3s = 0.6s
  assert.ok(Math.abs(words[0].endSeconds - 10.6) < 1e-9);
  assert.equal(words[1].text, "elephant");
});

test("last word in a chunk always ends exactly at the chunk boundary", () => {
  const words = interpolateWordTimingWithinChunk("a b c", 0, 1, 0);
  assert.equal(words.at(-1).endSeconds, 1);
});

test("continues the index counter across calls", () => {
  const words = interpolateWordTimingWithinChunk("one two", 0, 1, 5);
  assert.equal(words[0].index, 5);
  assert.equal(words[1].index, 6);
});

test("returns an empty array for whitespace-only text", () => {
  assert.deepEqual(interpolateWordTimingWithinChunk("   ", 0, 1, 0), []);
});

test("buildNarrationTimingFromChunks chains chunk start times using real measured durations", () => {
  const timing = buildNarrationTimingFromChunks(
    [
      { text: "First sentence.", durationSeconds: 2 },
      { text: "Second one.", durationSeconds: 1.5 },
    ],
    "ep-1",
    "episodes/ep-1/audio/narration.wav",
  );

  assert.equal(timing.episodeId, "ep-1");
  assert.equal(timing.totalDurationSeconds, 3.5);
  assert.equal(timing.segments[0].startSeconds, 0);
  // second chunk's first word must start exactly where the first chunk ended
  const secondChunkFirstWord = timing.segments.find((s) => s.text === "Second");
  assert.equal(secondChunkFirstWord.startSeconds, 2);
});

test("buildNarrationTimingFromChunks handles zero chunks", () => {
  const timing = buildNarrationTimingFromChunks([], "ep-1", "narration.wav");
  assert.equal(timing.totalDurationSeconds, 0);
  assert.deepEqual(timing.segments, []);
});
