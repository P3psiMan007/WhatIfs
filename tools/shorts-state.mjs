#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_SHORTS_STATE_PATH = 'shorts/current/shorts-state.json';

// Resolved per call, not at module load, so tests and one-off runs can point
// the pipeline at a sandbox without re-importing the module.
export const statePath = () => process.env.SHORTS_STATE_PATH || DEFAULT_SHORTS_STATE_PATH;

// Prompts may only be generated from an APPROVED proposal, and nothing reaches
// YouTube without passing QA first — the same fail-closed shape the long-form
// episode pipeline uses.
export const ALLOWED_TRANSITIONS = {
  IDLE: ['DRAFTED'],
  DRAFTED: ['PROPOSED', 'IDLE'],
  PROPOSED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PROMPTS_READY', 'REJECTED'],
  PROMPTS_READY: ['CLIPS_RENDERED', 'REJECTED'],
  CLIPS_RENDERED: ['STITCHED', 'REJECTED'],
  STITCHED: ['QA_PASSED', 'REJECTED'],
  QA_PASSED: ['PUBLISHED_PRIVATE', 'REJECTED'],
  PUBLISHED_PRIVATE: [],
  REJECTED: ['IDLE'],
};

const fail = (message) => {
  throw new Error(message);
};

export const readState = (target = statePath()) => JSON.parse(fs.readFileSync(target, 'utf8'));

export const atomicWrite = (state, target = statePath()) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(tmp, target);
};

export function transition(state, { expectedRevision, to, actor, reason = '' }) {
  if (state.state_revision !== expectedRevision) {
    fail(`revision conflict: expected ${expectedRevision}, found ${state.state_revision}`);
  }
  const allowed = ALLOWED_TRANSITIONS[state.state];
  if (!allowed) fail(`unknown current state: ${state.state}`);
  if (!allowed.includes(to)) fail(`illegal transition: ${state.state} -> ${to}`);
  if (!String(actor || '').trim()) fail('transition requires an actor');

  const now = new Date().toISOString();
  const from = state.state;
  const next = {
    ...state,
    state: to,
    state_revision: state.state_revision + 1,
    updated_at: now,
    updated_by: actor,
    history: [...state.history, { revision: state.state_revision + 1, at: now, actor, from, to, reason: reason || null }],
  };
  if (to === 'IDLE') next.short_id = null;
  return next;
}

const usage = () => {
  console.error(
    'Usage:\n  node tools/shorts-state.mjs show\n  node tools/shorts-state.mjs transition <expectedRevision> <newState> <actor> [reason]',
  );
  process.exit(2);
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const [, , cmd, ...args] = process.argv;
  if (cmd === 'show') {
    console.log(JSON.stringify(readState(), null, 2));
  } else if (cmd === 'transition') {
    if (args.length < 3) usage();
    const [expectedRevisionRaw, to, actor, reason = ''] = args;
    const next = transition(readState(), { expectedRevision: Number(expectedRevisionRaw), to, actor, reason });
    atomicWrite(next);
    console.log(JSON.stringify({ short_id: next.short_id, state: next.state, state_revision: next.state_revision }, null, 2));
  } else {
    usage();
  }
}
