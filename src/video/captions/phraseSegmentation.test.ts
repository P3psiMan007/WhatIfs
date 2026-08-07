import test from "node:test";
import assert from "node:assert/strict";
import { segmentIntoPhrases } from "./phraseSegmentation.ts";
import type { NarrationSegment } from "../types/narration";

const word = (
  index: number,
  text: string,
  startSeconds: number,
  endSeconds: number,
  isKeyWord = false,
): NarrationSegment => ({ index, text, startSeconds, endSeconds, isKeyWord });

test("breaks on sentence-ending punctuation once minimum length is met", () => {
  const segments = [
    word(0, "What", 0.0, 0.2),
    word(1, "if", 0.2, 0.3),
    word(2, "money", 0.3, 0.6),
    word(3, "vanished?", 0.6, 1.0),
    word(4, "Let's", 1.1, 1.3),
    word(5, "find", 1.3, 1.5),
    word(6, "out.", 1.5, 1.8),
  ];
  const phrases = segmentIntoPhrases(segments);
  assert.equal(phrases.length, 2);
  assert.equal(phrases[0].text, "What if money vanished?");
  assert.equal(phrases[1].text, "Let's find out.");
});

test("forces a break at the maximum phrase length even with no punctuation", () => {
  const segments = Array.from({ length: 10 }, (_, i) => word(i, `w${i}`, i * 0.3, i * 0.3 + 0.25));
  const phrases = segmentIntoPhrases(segments);
  assert.ok(phrases.every((p) => p.words.length <= 7));
  assert.equal(phrases.reduce((sum, p) => sum + p.words.length, 0), 10);
});

test("breaks on a natural pause once minimum length is met", () => {
  const segments = [
    word(0, "Imagine", 0.0, 0.3),
    word(1, "this", 0.3, 0.5),
    word(2, "scenario", 0.5, 0.8),
    // 0.6s gap here, well over the 0.5s pause threshold
    word(3, "suddenly", 1.4, 1.7),
    word(4, "everything", 1.7, 2.0),
    word(5, "changes", 2.0, 2.3),
  ];
  const phrases = segmentIntoPhrases(segments);
  assert.equal(phrases.length, 2);
  assert.equal(phrases[0].words.length, 3);
});

test("never produces a phrase below the minimum unless it is the final leftover", () => {
  const segments = [word(0, "One", 0, 0.2), word(1, "word.", 0.2, 0.4)];
  const phrases = segmentIntoPhrases(segments);
  assert.equal(phrases.length, 1);
  assert.equal(phrases[0].words.length, 2);
});

test("preserves word-level timing inside each phrase", () => {
  const segments = [
    word(0, "Hook", 0.0, 0.4, true),
    word(1, "line", 0.4, 0.7),
    word(2, "here.", 0.7, 1.1),
  ];
  const phrases = segmentIntoPhrases(segments);
  assert.equal(phrases[0].startSeconds, 0.0);
  assert.equal(phrases[0].endSeconds, 1.1);
  assert.equal(phrases[0].words[0].isKeyWord, true);
});

test("returns no phrases for empty input", () => {
  assert.deepEqual(segmentIntoPhrases([]), []);
});
