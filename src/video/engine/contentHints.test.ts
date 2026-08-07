import test from "node:test";
import assert from "node:assert/strict";
import { mapEnvironmentHint, mapPropHint, extractHeroNumber } from "./contentHints.ts";

test("mapEnvironmentHint recognizes city keywords", () => {
  assert.equal(mapEnvironmentHint("A busy downtown street"), "city");
});

test("mapEnvironmentHint recognizes nature keywords", () => {
  assert.equal(mapEnvironmentHint("Deep in the forest"), "nature");
});

test("mapEnvironmentHint defaults to void for unrecognized text", () => {
  assert.equal(mapEnvironmentHint("A completely abstract concept"), "void");
});

test("mapPropHint recognizes money-related props", () => {
  assert.equal(mapPropHint("piles of cash everywhere"), "coin");
});

test("mapPropHint returns null when nothing matches", () => {
  assert.equal(mapPropHint("a quiet philosophical moment"), null);
});

test("extractHeroNumber parses a plain integer", () => {
  const result = extractHeroNumber("There are 47 examples");
  assert.deepEqual(result, { value: 47, prefix: "", suffix: "" });
});

test("extractHeroNumber parses a dollar amount", () => {
  const result = extractHeroNumber("It cost $500 to build");
  assert.deepEqual(result, { value: 500, prefix: "$", suffix: "" });
});

test("extractHeroNumber applies million multiplier", () => {
  const result = extractHeroNumber("Roughly 5 million people");
  assert.deepEqual(result, { value: 5_000_000, prefix: "", suffix: "" });
});

test("extractHeroNumber applies k multiplier", () => {
  const result = extractHeroNumber("About 12k signups");
  assert.deepEqual(result, { value: 12_000, prefix: "", suffix: "" });
});

test("extractHeroNumber detects a percentage", () => {
  const result = extractHeroNumber("Up 30% year over year");
  assert.deepEqual(result, { value: 30, prefix: "", suffix: "%" });
});

test("extractHeroNumber does NOT misread 'minutes' as 'million'", () => {
  const result = extractHeroNumber("It happened 5 minutes later");
  assert.deepEqual(result, { value: 5, prefix: "", suffix: "" });
});

test("extractHeroNumber does NOT misread 'meters' as the m/million unit", () => {
  const result = extractHeroNumber("Just 10 meters away");
  assert.deepEqual(result, { value: 10, prefix: "", suffix: "" });
});

test("extractHeroNumber handles comma-formatted numbers", () => {
  const result = extractHeroNumber("Population of 1,200,000 people");
  assert.equal(result?.value, 1_200_000);
});

test("extractHeroNumber returns null when there is no number", () => {
  assert.equal(extractHeroNumber("No numbers in this sentence at all"), null);
});
