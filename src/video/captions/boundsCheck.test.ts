import test from "node:test";
import assert from "node:assert/strict";
import { estimateCaptionBounds, checkPhrasesWithinSafeBounds } from "./boundsCheck.ts";
import { defaultChannelStyle } from "../style/channelStyle.ts";
import type { CaptionPhrase } from "./types";

const CANVAS_WIDTH = 1920;

test("short phrase fits within safe width", () => {
  const result = estimateCaptionBounds({
    text: "What if money vanished?",
    fontSizePx: 64,
    canvasWidth: CANVAS_WIDTH,
    safeMarginLeftPx: 120,
    safeMarginRightPx: 120,
  });
  assert.equal(result.fitsWithinSafeWidth, true);
  assert.equal(result.overflowPx, 0);
});

test("very long phrase overflows the safe width", () => {
  const result = estimateCaptionBounds({
    text: "This is an unreasonably long caption phrase that nobody should ever put on screen at once",
    fontSizePx: 64,
    canvasWidth: CANVAS_WIDTH,
    safeMarginLeftPx: 120,
    safeMarginRightPx: 120,
  });
  assert.equal(result.fitsWithinSafeWidth, false);
  assert.ok(result.overflowPx > 0);
});

test("availableWidthPx subtracts both safe margins from canvas width", () => {
  const result = estimateCaptionBounds({
    text: "x",
    fontSizePx: 10,
    canvasWidth: 1000,
    safeMarginLeftPx: 100,
    safeMarginRightPx: 200,
  });
  assert.equal(result.availableWidthPx, 700);
});

const phrase = (text: string): CaptionPhrase => ({
  text,
  startSeconds: 0,
  endSeconds: 1,
  words: text.split(" ").map((w, i) => ({ text: w, startSeconds: i * 0.2, endSeconds: i * 0.2 + 0.2, isKeyWord: false })),
});

test("checkPhrasesWithinSafeBounds PASSes when every phrase fits", () => {
  const result = checkPhrasesWithinSafeBounds(
    [phrase("What if money"), phrase("vanished tomorrow?")],
    defaultChannelStyle,
    1920,
  );
  assert.equal(result.status, "PASS");
});

test("checkPhrasesWithinSafeBounds FAILs and names the offending phrase", () => {
  const longPhrase = phrase("This is an unreasonably long caption phrase nobody should ever show at once");
  const result = checkPhrasesWithinSafeBounds([phrase("fine"), longPhrase], defaultChannelStyle, 1920);
  assert.equal(result.status, "FAIL");
  assert.ok(result.detail.includes("unreasonably long"));
});

test("checkPhrasesWithinSafeBounds is UNVERIFIED for empty input, never a silent PASS", () => {
  const result = checkPhrasesWithinSafeBounds([], defaultChannelStyle, 1920);
  assert.equal(result.status, "UNVERIFIED");
});
