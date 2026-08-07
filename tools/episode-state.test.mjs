import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const tool = path.resolve("tools/episode-state.mjs");
const template = path.resolve("episodes/current/episode-state.json");
function withState(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "whatif-state-"));
  const p = path.join(dir, "episode-state.json");
  fs.copyFileSync(template, p);
  return fn(p);
}

test("starts a new selected episode with revision increment", () => withState((p) => {
  execFileSync("node", [tool, "transition", "0", "NEW", "SELECTED", "growth"], { env: { ...process.env, EPISODE_STATE_PATH: p } });
  const s = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.equal(s.state, "SELECTED");
  assert.equal(s.state_revision, 1);
  assert.ok(s.episode_id);
}));

test("rejects stale revision writes", () => withState((p) => {
  execFileSync("node", [tool, "transition", "0", "NEW", "SELECTED", "growth"], { env: { ...process.env, EPISODE_STATE_PATH: p } });
  assert.throws(() => execFileSync("node", [tool, "transition", "0", "NEW", "SELECTED", "growth"], { env: { ...process.env, EPISODE_STATE_PATH: p }, stdio: "pipe" }));
}));

test("rejects writes to another episode id", () => withState((p) => {
  execFileSync("node", [tool, "transition", "0", "NEW", "SELECTED", "growth"], { env: { ...process.env, EPISODE_STATE_PATH: p } });
  assert.throws(() => execFileSync("node", [tool, "transition", "1", "wrong-id", "RESEARCHED", "factory"], { env: { ...process.env, EPISODE_STATE_PATH: p }, stdio: "pipe" }));
}));
