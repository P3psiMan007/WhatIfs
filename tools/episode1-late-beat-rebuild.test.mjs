import test from 'node:test';
import assert from 'node:assert/strict';
import {applyLateBeatRevision,planEpisode1LateBeatRepair} from './episode1-late-beat-rebuild.mjs';

const state={
  episode_id:'20260807-episode',state:'RENDERED',state_revision:31,
  production:{render_asset:'github-actions://run/current/artifact/episode-render/episode.mp4',qa_inputs_ready:true},
};
const input={episodeId:'20260807-episode',visualGrade:'publish-grade',thumbnailRevision:'framing-v2',hookContrastRevision:'hours-v2'};

test('plans one rerender after prior visual packaging repairs are canonical',()=>{
  const plan=planEpisode1LateBeatRepair({state,input});
  assert.equal(plan.kind,'REBUILD');
  assert.equal(plan.expectedRevision,31);
  assert.equal(plan.transitionTo,'VOICE_READY');
  assert.deepEqual(plan.productionPatch,{render_asset:null,qa_inputs_ready:false});
});

test('does not run before thumbnail or hook fixes are canonical',()=>{
  assert.deepEqual(planEpisode1LateBeatRepair({state,input:{...input,thumbnailRevision:undefined}}),{kind:'NOOP',reason:'thumbnail_fix_not_ready'});
  assert.deepEqual(planEpisode1LateBeatRepair({state,input:{...input,hookContrastRevision:undefined}}),{kind:'NOOP',reason:'hook_contrast_fix_not_ready'});
});

test('repair is one-shot once late-beat marker is persisted',()=>{
  const upgraded=applyLateBeatRevision(input);
  assert.equal(upgraded.lateBeatRevision,'aligned-v2');
  assert.deepEqual(planEpisode1LateBeatRepair({state,input:upgraded}),{kind:'NOOP',reason:'late_beat_revision_already_applied'});
});

test('publisher-owned and non-rendered states are noops',()=>{
  for(const next of ['VOICE_READY','QA_PASSED','AUTO_PUBLISH_READY','PUBLISHED']){
    assert.equal(planEpisode1LateBeatRepair({state:{...state,state:next},input}).kind,'NOOP');
  }
});
