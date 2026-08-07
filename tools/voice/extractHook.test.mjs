import test from "node:test";
import assert from "node:assert/strict";
import { extractHookText } from "./extractHook.mjs";

test("extracts roughly targetSeconds worth of words at ~170wpm", () => {
  const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
  const hook = extractHookText(words, 22.5);
  const wordCount = hook.split(" ").length;
  // 22.5s * 170/60 wpm ~= 64 words
  assert.ok(wordCount >= 60 && wordCount <= 68, `expected ~64 words, got ${wordCount}`);
});

test("strips markdown headings and list markers", () => {
  const script = "# Title\n\n- Some intro text here\nMore narration follows after that.";
  const hook = extractHookText(script, 10);
  assert.ok(!hook.includes("#"));
  assert.ok(!hook.startsWith("- "));
  assert.ok(hook.includes("Some intro text here"));
});

test("returns the whole text if shorter than the target duration", () => {
  const hook = extractHookText("Just a few words.", 30);
  assert.equal(hook, "Just a few words.");
});

test("returns empty string for empty input", () => {
  assert.equal(extractHookText("", 20), "");
  assert.equal(extractHookText("   ", 20), "");
});
