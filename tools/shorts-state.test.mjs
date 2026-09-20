import test from 'node:test';
import assert from 'node:assert/strict';
import { transition, ALLOWED_TRANSITIONS } from './shorts-state.mjs';

const baseState = () => ({
  pipeline_version: 'shorts-1.0',
  short_id: '20260920-test-short',
  state: 'PROPOSED',
  state_revision: 4,
  updated_at: '2026-09-20T00:00:00.000Z',
  updated_by: 'bootstrap',
  history: [],
});

test('advances along an allowed edge and appends history', () => {
  const next = transition(baseState(), { expectedRevision: 4, to: 'APPROVED', actor: 'reviewer', reason: 'looks good' });
  assert.equal(next.state, 'APPROVED');
  assert.equal(next.state_revision, 5);
  assert.equal(next.updated_by, 'reviewer');
  assert.equal(next.history.length, 1);
  assert.deepEqual(
    { from: next.history[0].from, to: next.history[0].to, reason: next.history[0].reason },
    { from: 'PROPOSED', to: 'APPROVED', reason: 'looks good' },
  );
});

test('does not mutate the state it was given', () => {
  const state = baseState();
  transition(state, { expectedRevision: 4, to: 'APPROVED', actor: 'reviewer' });
  assert.equal(state.state, 'PROPOSED');
  assert.equal(state.state_revision, 4);
  assert.equal(state.history.length, 0);
});

test('rejects a stale revision', () => {
  assert.throws(() => transition(baseState(), { expectedRevision: 3, to: 'APPROVED', actor: 'reviewer' }), /revision conflict/);
});

test('rejects an actor-less transition', () => {
  assert.throws(() => transition(baseState(), { expectedRevision: 4, to: 'APPROVED', actor: '' }), /actor/);
});

test('cannot skip approval to reach prompts', () => {
  assert.throws(
    () => transition(baseState(), { expectedRevision: 4, to: 'PROMPTS_READY', actor: 'reviewer' }),
    /illegal transition: PROPOSED -> PROMPTS_READY/,
  );
});

test('cannot jump straight from stitched to published', () => {
  const state = { ...baseState(), state: 'STITCHED' };
  assert.throws(() => transition(state, { expectedRevision: 4, to: 'PUBLISHED_PRIVATE', actor: 'qa' }), /illegal transition/);
});

test('published is terminal', () => {
  assert.deepEqual(ALLOWED_TRANSITIONS.PUBLISHED_PRIVATE, []);
  const state = { ...baseState(), state: 'PUBLISHED_PRIVATE' };
  assert.throws(() => transition(state, { expectedRevision: 4, to: 'IDLE', actor: 'anyone' }), /illegal transition/);
});

test('every stage can be rejected back out except idle and published', () => {
  for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
    if (['IDLE', 'PUBLISHED_PRIVATE', 'REJECTED', 'DRAFTED'].includes(from)) continue;
    assert.ok(targets.includes('REJECTED'), `${from} cannot be rejected`);
  }
});

test('returning to idle clears the short id', () => {
  const state = { ...baseState(), state: 'REJECTED' };
  const next = transition(state, { expectedRevision: 4, to: 'IDLE', actor: 'operator' });
  assert.equal(next.short_id, null);
});

test('every transition target is itself a known state', () => {
  for (const targets of Object.values(ALLOWED_TRANSITIONS)) {
    for (const target of targets) assert.ok(target in ALLOWED_TRANSITIONS, `unknown target ${target}`);
  }
});
