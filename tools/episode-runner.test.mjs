import test from 'node:test';
import assert from 'node:assert/strict';
import { planNextAction, sameStatus, resolveProducerCommand, extractProducerFailureReason, extractProducerFailureDetails, planProductionInputRepair } from './episode-runner.mjs';
import {planNextEpisodeBootstrap,blankEpisodeState} from './next-episode-bootstrap.mjs';

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

test('RENDERED with publish-grade QA inputs is left for independent QA', () => {
  const plan = planNextAction({ state: {state:'RENDERED', episode_id:'ep1', production:{qa_inputs_ready:true}}, controls, autonomy, topics: [], producerConfigured: true });
  assert.equal(plan.kind, 'NOOP');
  assert.equal(plan.reason, 'awaiting_qa');
});

test('RENDERED placeholder output records a precise visual blocker instead of handing off to QA', () => {
  const plan = planNextAction({ state: {state:'RENDERED', episode_id:'ep1', production:{qa_inputs_ready:false}}, controls, autonomy, topics: [], producerConfigured: true });
  assert.equal(plan.kind, 'BLOCKED');
  assert.equal(plan.reason, 'publish_grade_visual_assets_missing');
});

test('identical runner status is treated as unchanged', () => {
  assert.equal(sameStatus(
    { revision: 4, updatedAt: 'old', kind: 'BLOCKED', reason: 'missing_production_provider', episodeId: 'ep1', stateRevision: 2 },
    { kind: 'BLOCKED', reason: 'missing_production_provider', episodeId: 'ep1', stateRevision: 2 }
  ), true);
});

test('uses the built-in producer when no repository variable is configured', () => {
  assert.equal(resolveProducerCommand({ configured: '', builtInExists: true }), 'node tools/episode-producer.mjs');
});

test('explicit repository producer command overrides the built-in producer', () => {
  assert.equal(resolveProducerCommand({ configured: 'custom-producer', builtInExists: true }), 'custom-producer');
});

test('extracts precise fail-closed producer blocker', () => {
  assert.equal(extractProducerFailureReason('PRODUCER_BLOCKED narration_generation_failed: timeout'), 'narration_generation_failed');
});

test('preserves useful producer exception details for durable diagnosis', () => {
  const stderr = 'some warning\nPRODUCER_BLOCKED producer_exception: Error: ffprobe duration failed\n    at probeDuration (file:///repo/tools/episode-producer.mjs:12:3)\n';
  const details = extractProducerFailureDetails(stderr);
  assert.match(details, /ffprobe duration failed/);
  assert.match(details, /probeDuration/);
  assert.ok(details.length <= 1600);
});

test('stale production input is deleted so the producer can derive the active episode', () => {
  const repair = planProductionInputRepair({
    state: {episode_id:'20260810-episode'},
    input: {episodeId:'20260807-episode'},
  });
  assert.equal(repair.kind, 'DELETE_STALE_INPUT');
  assert.equal(repair.expectedEpisodeId, '20260810-episode');
  assert.equal(repair.staleEpisodeId, '20260807-episode');
});

test('matching production input is preserved', () => {
  const repair = planProductionInputRepair({
    state: {episode_id:'20260810-episode'},
    input: {episodeId:'20260810-episode'},
  });
  assert.equal(repair.kind, 'NOOP');
  assert.equal(repair.reason, 'input_matches_episode');
});

test('next episode rollover requires exact verified private publication and a queued topic',()=>{
  const state={state:'QA_PASSED',episode_id:'ep1'};
  const publication={episodeId:'ep1',youtube:{videoId:'abc',privateVerifiedAt:'2026-08-10T07:38:35Z',processingVerified:true,playbackVerified:true,metadataVerified:true,thumbnailSetSucceeded:true}};
  const topics=[{id:'solar',enabled:true,consumedAt:null}];
  assert.equal(planNextEpisodeBootstrap({state,publication,topics}).kind,'ROLLOVER');
  assert.equal(planNextEpisodeBootstrap({state,publication:{...publication,youtube:{...publication.youtube,playbackVerified:false}},topics}).reason,'private_publication_not_verified');
});

test('fresh rollover state cannot inherit Episode 1 render or QA',()=>{
  const fresh=blankEpisodeState();
  assert.equal(fresh.state,'IDLE');
  assert.equal(fresh.episode_id,null);
  assert.equal(fresh.production.render_asset,null);
  assert.equal(fresh.qa.status,null);
  assert.deepEqual(fresh.production.voice_candidates,['af_heart']);
});
