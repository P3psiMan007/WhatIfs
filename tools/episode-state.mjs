#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const STATE_PATH = process.env.EPISODE_STATE_PATH || "episodes/current/episode-state.json";
const readState = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
const atomicWrite = (obj) => {
  const dir = path.dirname(STATE_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${STATE_PATH}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  fs.renameSync(tmp, STATE_PATH);
};
const usage = () => {
  console.error("Usage:\n  node tools/episode-state.mjs show\n  node tools/episode-state.mjs transition <expectedRevision> <episodeId|NEW> <newState> <actor> [reason]\n  node tools/episode-state.mjs patch <expectedRevision> <episodeId> <actor> '<jsonPatchObject>'");
  process.exit(2);
};

const [, , cmd, ...args] = process.argv;
if (!cmd) usage();
if (cmd === "show") {
  console.log(JSON.stringify(readState(), null, 2));
  process.exit(0);
}
if (cmd === "transition") {
  if (args.length < 4) usage();
  const [expectedRevisionRaw, requestedEpisodeId, newState, actor, reason = ""] = args;
  const expectedRevision = Number(expectedRevisionRaw);
  const s = readState();
  if (s.state_revision !== expectedRevision) throw new Error(`revision conflict: expected ${expectedRevision}, found ${s.state_revision}`);
  let episodeId = requestedEpisodeId;
  if (requestedEpisodeId === "NEW") {
    if (!["IDLE", "ANALYZED"].includes(s.state)) throw new Error(`cannot start NEW episode from state ${s.state}`);
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    episodeId = `${stamp}-episode`;
  } else if (s.episode_id !== requestedEpisodeId) {
    throw new Error(`episode mismatch: expected ${requestedEpisodeId}, found ${s.episode_id}`);
  }
  const now = new Date().toISOString();
  const oldState = s.state;
  s.episode_id = episodeId;
  s.state = newState;
  s.state_revision += 1;
  s.updated_at = now;
  s.updated_by = actor;
  s.history.push({ revision: s.state_revision, at: now, actor, from: oldState, to: newState, reason: reason || null });
  atomicWrite(s);
  console.log(JSON.stringify({ episode_id: s.episode_id, state: s.state, state_revision: s.state_revision }, null, 2));
  process.exit(0);
}
if (cmd === "patch") {
  if (args.length < 4) usage();
  const [expectedRevisionRaw, episodeId, actor, patchJson] = args;
  const expectedRevision = Number(expectedRevisionRaw);
  const s = readState();
  if (s.state_revision !== expectedRevision) throw new Error(`revision conflict: expected ${expectedRevision}, found ${s.state_revision}`);
  if (s.episode_id !== episodeId) throw new Error(`episode mismatch: expected ${episodeId}, found ${s.episode_id}`);
  const patch = JSON.parse(patchJson);
  for (const [section, values] of Object.entries(patch)) {
    if (!["growth", "production", "qa", "analytics", "lock"].includes(section)) throw new Error(`patch section not allowed: ${section}`);
    if (typeof values !== "object" || values === null || Array.isArray(values)) throw new Error(`patch section must be an object: ${section}`);
    s[section] = { ...s[section], ...values };
  }
  const now = new Date().toISOString();
  s.state_revision += 1;
  s.updated_at = now;
  s.updated_by = actor;
  s.history.push({ revision: s.state_revision, at: now, actor, from: s.state, to: s.state, reason: "patch" });
  atomicWrite(s);
  console.log(JSON.stringify({ episode_id: s.episode_id, state: s.state, state_revision: s.state_revision }, null, 2));
  process.exit(0);
}
usage();
