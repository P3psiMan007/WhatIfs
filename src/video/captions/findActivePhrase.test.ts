import test from "node:test";
import assert from "node:assert/strict";
import { findActivePhrase } from "./findActivePhrase.ts";
import type { CaptionPhrase } from "./types";

const phrases: CaptionPhrase[] = [
  { text: "first phrase", startSeconds: 0, endSeconds: 2, words: [] },
  { text: "second phrase", startSeconds: 2, endSeconds: 4, words: [] },
];

test("finds the phrase containing nowSeconds", () => {
  assert.equal(findActivePhrase(phrases, 1)?.text, "first phrase");
  assert.equal(findActivePhrase(phrases, 2)?.text, "second phrase");
});

test("returns null between/outside phrase ranges", () => {
  assert.equal(findActivePhrase(phrases, 10), null);
  assert.equal(findActivePhrase(phrases, -1), null);
});

test("returns null for an empty phrase list", () => {
  assert.equal(findActivePhrase([], 0), null);
});
