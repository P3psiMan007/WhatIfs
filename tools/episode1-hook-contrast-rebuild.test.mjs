import test from 'node:test';
import assert from 'node:assert/strict';
import {applyHookContrastRevision,planEpisode1HookContrastRepair} from './episode1-hook-contrast-rebuild.mjs';

const state={
  episode_id:'20260807-episode',
  state:'RENDERED',
  state_revision:23,
  production:{render_asset:'github-actions://run/next/artifact/episode-render/episode.mp4',qa_inputs_ready:true,selected_voice:'en-US-BrianNeural'},
};
const input={
  episodeId:'20260807-episode',
  visualGrade:'publish-grade',
  thumbnailRevision:'framing-v2',
  scenes:Array.from({length:9},(_,i)=>({id:`scene-${String(i+1).padStart(2,'0')}`,visualAsset:`visuals/20260807-episode/scene-${String(i+1).padStart(2,'0')}.svg`})),
};

test('plans one rerender only after the corrected thumbnail artifact is canonical',()=>{
  const plan=planEpisode1HookContrastRepair({state,input});
  assert.equal(plan.kind,'REBUILD');
  assert.equal(plan.expectedRevision,23);
  assert.equal(plan.transitionTo,'VOICE_READY');
  assert.deepEqual(plan.productionPatch,{render_asset:null,qa_inputs_ready:false});
});

test('does nothing before thumbnail repair has persisted',()=>{
  const plan=planEpisode1HookContrastRepair({state,input:{...input,thumbnailRevision:undefined}});
  assert.deepEqual(plan,{kind:'NOOP',reason:'thumbnail_fix_not_ready'});
});

test('hook contrast repair is one-shot once marker is persisted',()=>{
  const upgraded=applyHookContrastRevision(input);
  assert.equal(upgraded.hookContrastRevision,'hours-v2');
  assert.deepEqual(planEpisode1HookContrastRepair({state,input:upgraded}),{kind:'NOOP',reason:'hook_contrast_revision_already_applied'});
});

test('does not touch publisher-owned or non-rendered states',()=>{
  for(const next of ['VOICE_READY','QA_PASSED','AUTO_PUBLISH_READY','PUBLISHED']){
    assert.equal(planEpisode1HookContrastRepair({state:{...state,state:next},input}).kind,'NOOP');
  }
});

test('fails closed if current visual input is not publish-grade or render is not QA-ready',()=>{
  assert.deepEqual(planEpisode1HookContrastRepair({state,input:{...input,visualGrade:'heuristic-placeholder'}}),{kind:'NOOP',reason:'visual_input_not_publish_grade'});
  assert.deepEqual(planEpisode1HookContrastRepair({state:{...state,production:{...state.production,qa_inputs_ready:false}},input}),{kind:'NOOP',reason:'render_not_qa_ready'});
});
