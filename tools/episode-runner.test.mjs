import test from 'node:test';
import assert from 'node:assert/strict';
import { planNextAction, sameStatus } from './episode-runner.mjs';

const controls = { pauseAllProduction: false, pausePublishing: false };
const autonomy = { publishReadyStates: ['QA_PASSED','AUTO_PUBLISH_READY'] };

test('IDLE selects the first enabled queued topic', () => {
  const state = { state: 'IDLE', episode_id: null };
  const topics = [{ id: 'sleep', topic: 'What if humans never needed sleep?', enabled: true }];
  const plan = planNextAction({ state, controls, autonomy, topics, producerConfigured: false });
  assert.equal(plan.kind, 'SELECT_TOPIC');
  assert.equal(plan.topic.id, 'sleep');
});

test('production pause fails closed', () => {
  const plan = planNextAction({ state: {state:'IDLE'}, controls: {...controls, pauseAllProduction:true}, autonomy, topics: [], producerConfigured: false });
  assert.equal(plan.kind, 'NOOP');
  assert.equal(plan.reason, 'pauseAllProduction');
});

test('SELECTED without producer reports a concrete blocker', () => {
  const plan = planNextAction({ state: {state:'SELECTED', episode_id:'ep1'}, controls, autonomy, topics: [], producerConfigured: false });
  assert.equal(plan.kind, 'BLOCKED');
  assert.equal(plan.reason, 'missing_production_provider');
});

test('publish-ready states are left to the guarded publisher', () => {
  const plan = planNextAction({ state: {state:'QA_PASSED', episode_id:'ep1'}, controls, autonomy, topics: [], producerConfigured: true });
  assert.equal(plan.kind, 'NOOP');
  assert.equal(plan.reason, 'publisher_owned_state');
});

test('identical runner status is treated as unchanged', () => {
  assert.equal(sameStatus(
    { revision: 4, updatedAt: 'old', kind: 'BLOCKED', reason: 'missing_production_provider', episodeId: 'ep1', stateRevision: 2 },
    { kind: 'BLOCKED', reason: 'missing_production_provider', episodeId: 'ep1', stateRevision: 2 }
  ), true);
});
