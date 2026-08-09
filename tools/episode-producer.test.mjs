import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateProductionInput,
  planProducerStage,
  parseSrt,
  buildProductionInputFromArtifacts,
  buildExactSceneTimeline,
  buildVisualBeats,
  formatSrt,
  extractBeatCallout,
  buildNarrationBatchPayload,
  describeImageAssetManifest,
} from './episode-producer.mjs';
import {isPublishGradeVisualInput} from './publish-grade-visual-guard.mjs';
import {EPISODE1_IMAGE_ASSET_REVISION,EPISODE1_IMAGE_SCENE_IDS,imageAssetsForScene} from '../video/src/episode1-image-assets.mjs';

const validInput = {
  episodeId: 'ep1',
  narrator: { provider:'kokoro', voice:'af_heart', speed:0.95, locked:true, flowVersion:'continuous-v2' },
  title: 'What If Humans Never Needed Sleep?',
  description: 'A factual hypothetical explainer.',
  packages: [{ id: 'A', title: 'What If Humans Never Needed Sleep?', thumbnailText: '8 HOURS BACK' }],
  visualGrade: 'publish-grade',
  scenes: [
    { id: 'hook', headline: 'NO MORE SLEEP', narration: 'Imagine never needing to sleep again.', visual: 'clock', visualAsset: 'assets/hook.mp4' },
    { id: 'payoff', headline: 'MORE WAKING LIFE', narration: 'You gain waking time, not extra years.', visual: 'hourglass', visualAsset: 'assets/payoff.mp4' }
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

test('publish-grade visual readiness requires the canonical full-section image manifest', () => {
  const canonical = {...validInput, imageFirstAssetRevision:EPISODE1_IMAGE_ASSET_REVISION, imageAssetManifest:'episodes/current/image-assets-v1.json', scenes:EPISODE1_IMAGE_SCENE_IDS.map((id)=>({id,headline:id,narration:'Narration.',imageAssets:[...imageAssetsForScene(id)]}))};
  assert.equal(isPublishGradeVisualInput(canonical), true);
  assert.equal(isPublishGradeVisualInput({...canonical, visualGrade:'heuristic-placeholder'}), false);
  assert.equal(isPublishGradeVisualInput({...canonical, scenes:canonical.scenes.slice(0,8)}), false);
});

test('render provenance pins the exact checked-in image manifest bytes', () => {
  const input = JSON.parse(fs.readFileSync('episodes/current/production-input.json','utf8'));
  const provenance = describeImageAssetManifest(input);
  assert.deepEqual(Object.keys(provenance).sort(), ['assetRevision','path','sha256']);
  assert.equal(provenance.path, 'episodes/current/image-assets-v1.json');
  assert.equal(provenance.assetRevision, EPISODE1_IMAGE_ASSET_REVISION);
  assert.match(provenance.sha256, /^[0-9a-f]{64}$/);
  assert.throws(() => describeImageAssetManifest({...input,imageAssetManifest:'../outside.json'}), /invalid image asset manifest path/);
});

test('batch narrator is fail-closed to af_heart 0.95 and preserves whole-scene flow', () => {
  assert.equal(fs.existsSync('tools/edge-tts'), true, 'locked batch narrator must exist');
  const shim = fs.readFileSync('tools/edge-tts','utf8');
  assert.match(shim, /LOCKED_VOICE\s*=\s*"af_heart"/);
  assert.match(shim, /LOCKED_SPEED\s*=\s*0\.95/);
  assert.match(shim, /pipeline\(text, voice=LOCKED_VOICE, speed=LOCKED_SPEED\)/);
  assert.match(shim, /trim_edge_silence/);
  assert.doesNotMatch(shim, /am_michael/);
  assert.doesNotMatch(shim, /parts\.append\(silence\)|sentence_pauses/);
  assert.deepEqual(buildNarrationBatchPayload(validInput), {provider:'kokoro',voice:'af_heart',speed:0.95,flowVersion:'continuous-v2',scenes:[{id:'hook',text:'Imagine never needing to sleep again.'},{id:'payoff',text:'You gain waking time, not extra years.'}]});
  assert.throws(()=>buildNarrationBatchPayload({...validInput,narrator:{...validInput.narrator,voice:'other'}}),/fail-closed/);
  assert.throws(()=>buildNarrationBatchPayload({...validInput,narrator:{...validInput.narrator,flowVersion:'chunked'}}),/fail-closed/);
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
  assert.equal(isPublishGradeVisualInput(built), false);
  assert.equal(built.sources.length, 2);
  assert.equal(built.packages.length, 3);
});

test('scene boundaries use measured per-scene narration durations rather than word-count estimates', () => {
  const parts = [
    {scene: validInput.scenes[0], duration: 4.25, cues:[{start:0.05,end:4.1,text:'Imagine never needing to sleep again.'}]},
    {scene: validInput.scenes[1], duration: 3.5, cues:[{start:0.04,end:3.4,text:'You gain waking time, not extra years.'}]},
  ];
  const timeline = buildExactSceneTimeline(parts);
  assert.equal(timeline.scenes[0].start, 0);
  assert.equal(timeline.scenes[0].duration, 4.25);
  assert.equal(timeline.scenes[1].start, 4.25);
  assert.equal(timeline.scenes[1].duration, 3.5);
  assert.equal(timeline.captions[1].start, 4.29);
  assert.equal(timeline.durationSeconds, 7.75);
});

test('visual beats keep publish-grade motion cadence with no long static holds', () => {
  const scenes = [{id:'s1', headline:'HOOK', visual:'clock', start:0, duration:25, narration:'x'}];
  const captions = [
    {start:0,end:2.2,text:'Tonight, you go to bed for the last time.'},
    {start:2.2,end:4.4,text:'Not because something is wrong.'},
    {start:4.4,end:10.2,text:'Tomorrow, every human wakes up and discovers that sleep is unnecessary.'},
    {start:10.2,end:11.3,text:'No fatigue.'},
    {start:11.3,end:12.6,text:'No brain fog.'},
    {start:12.6,end:14.2,text:'No hidden health cost.'},
    {start:14.2,end:18.8,text:'Your body repairs itself while you remain awake.'},
    {start:18.8,end:22.0,text:'You gain roughly eight extra hours every day.'},
    {start:22.0,end:25,text:'Those hours might stop belonging to you.'},
  ];
  const beats = buildVisualBeats(scenes, captions, {minSeconds:3, maxSeconds:6});
  assert.ok(beats.length >= 5);
  assert.ok(beats.every((beat) => beat.duration <= 6.01), JSON.stringify(beats));
  assert.equal(beats[0].sceneHeadline, 'HOOK');
  assert.ok(beats.some((beat) => /8|HOURS/.test(beat.callout || '')));
});

test('long subtitle cues are split into multiple visual beats even when caption text is unchanged', () => {
  const scenes = [{id:'s1', headline:'BIOLOGY', visual:'brain', start:0, duration:14, narration:'x'}];
  const captions = [{start:0,end:14,text:'A long factual sentence remains on screen while the visual treatment changes.'}];
  const beats = buildVisualBeats(scenes, captions, {minSeconds:3,maxSeconds:5});
  assert.ok(beats.length >= 3);
  assert.ok(Math.max(...beats.map((b)=>b.duration)) <= 5.01);
});

test('short pending cue cannot combine with the next cue into an overlong visual beat', () => {
  const scenes = [{id:'s1', headline:'HOOK', visual:'clock', start:0, duration:7.582, narration:'x'}];
  const captions = [
    {start:0,end:1.5,text:'Short opening phrase.'},
    {start:1.7,end:7.582,text:'The next subtitle remains under six seconds but the combined window is too long.'},
  ];
  const beats = buildVisualBeats(scenes, captions, {minSeconds:3,maxSeconds:6});
  assert.ok(Math.max(...beats.map((b)=>b.duration)) <= 6.01, JSON.stringify(beats));
});

test('combined SRT formatter preserves globally shifted cue times', () => {
  const srt = formatSrt([
    {start:0.05,end:1.5,text:'First'},
    {start:4.29,end:7.65,text:'Second'},
  ]);
  assert.match(srt, /00:00:04,290 --> 00:00:07,650/);
});

test('beat callouts surface meaningful numbers and short paradox phrases', () => {
  assert.equal(extractBeatCallout('You have just recovered about 2,920 hours every year.'), '2,920 HOURS');
  assert.equal(extractBeatCallout('No brain fog.'), 'NO BRAIN FOG');
});
