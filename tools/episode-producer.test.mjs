import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionInput, planProducerStage, parseSrt, buildProductionInputFromArtifacts, isPublishGradeVisualInput } from './episode-producer.mjs';

const validInput = {
  episodeId: 'ep1',
  narrator: { voice: 'en-US-BrianNeural', rate: '+4%' },
  title: 'What If Humans Never Needed Sleep?',
  description: 'A factual hypothetical explainer.',
  packages: [{ id: 'A', title: 'What If Humans Never Needed Sleep?', thumbnailText: '8 HOURS BACK' }],
  visualGrade: 'publish-grade',
  scenes: [
    { id: 'hook', headline: 'NO MORE SLEEP', narration: 'Imagine never needing to sleep again.', visualAsset: 'assets/hook.mp4' },
    { id: 'payoff', headline: 'MORE WAKING LIFE', narration: 'You gain waking time, not extra years.', visualAsset: 'assets/payoff.mp4' }
  ],
  sources: [{ url: 'https://example.com', claims: ['example claim'] }]
};

test('rejects production input for another episode', () => {
  const error = validateProductionInput(validInput, {episode_id: 'ep2'});
  assert.match(error, /episode mismatch/);
});

test('requires at least two narrated scenes', () => {
  const broken = {...validInput, scenes: [{id:'one', headline:'ONE', narration:'Only one.', visualAsset:'assets/one.mp4'}]};
  assert.match(validateProductionInput(broken, {episode_id:'ep1'}), /at least 2 scenes/);
});

test('SELECTED with valid input starts scripted stage', () => {
  assert.deepEqual(planProducerStage({state:{state:'SELECTED'}, inputReady:true, audioReady:false, renderReady:false}), {kind:'SCRIPT'});
});

test('SCRIPTED without audio proceeds to narration', () => {
  assert.deepEqual(planProducerStage({state:{state:'SCRIPTED'}, inputReady:true, audioReady:false, renderReady:false}), {kind:'NARRATE'});
});

test('VOICE_READY with audio and without render proceeds to render', () => {
  assert.deepEqual(planProducerStage({state:{state:'VOICE_READY'}, inputReady:true, audioReady:true, renderReady:false}), {kind:'RENDER'});
});

test('VOICE_READY regenerates narration if the workflow workspace lost the prior audio artifact', () => {
  assert.deepEqual(planProducerStage({state:{state:'VOICE_READY'}, inputReady:true, audioReady:false, renderReady:false}), {kind:'NARRATE'});
});

test('RENDERED is left for independent QA', () => {
  assert.deepEqual(planProducerStage({state:{state:'RENDERED'}, inputReady:true, audioReady:true, renderReady:true}), {kind:'NOOP', reason:'awaiting_qa'});
});

test('publish-grade visual readiness requires explicit grade and per-scene assets', () => {
  assert.equal(isPublishGradeVisualInput(validInput), true);
  assert.equal(isPublishGradeVisualInput({...validInput, visualGrade:'heuristic-placeholder'}), false);
  assert.equal(isPublishGradeVisualInput({...validInput, scenes:[validInput.scenes[0], {...validInput.scenes[1], visualAsset:null}]}), false);
});

test('parses SRT captions into second-based cues', () => {
  const cues = parseSrt('1\n00:00:00,000 --> 00:00:01,500\nHello world\n\n2\n00:00:01,500 --> 00:00:03,000\nNext line\n');
  assert.deepEqual(cues, [
    {start:0, end:1.5, text:'Hello world'},
    {start:1.5, end:3, text:'Next line'}
  ]);
});

test('builds production input from durable research and retention script artifacts as a non-publish-grade visual placeholder', () => {
  const script = '# Script — What if humans never needed sleep?\n\n**Target:** ~7–8 minutes\n\n## 0:00–0:30 — Hook\n\nTonight, you go to bed for the last time.\n\n## 0:30–1:20 — You gain a second life\n\nYou just gained eight hours.\n';
  const research = 'Source: https://www.nhlbi.nih.gov/health/sleep\nSource: https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms\n';
  const built = buildProductionInputFromArtifacts({episode_id:'ep1', growth:{topic:'What if humans never needed sleep?'}}, script, research);
  assert.equal(built.episodeId, 'ep1');
  assert.equal(built.scenes.length, 2);
  assert.equal(built.scenes[0].visual, 'clock');
  assert.equal(built.visualGrade, 'heuristic-placeholder');
  assert.equal(isPublishGradeVisualInput(built), false);
  assert.equal(built.sources.length, 2);
  assert.equal(built.packages.length, 3);
});
