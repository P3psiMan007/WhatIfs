import test from 'node:test';
import assert from 'node:assert/strict';
import {planEpisode1VisualRebuild,applyVisualAssetsToInput} from './episode1-visual-rebuild.mjs';

const state={
  episode_id:'20260807-episode',
  state:'RENDERED',
  state_revision:16,
  production:{render_asset:'github-actions://old/episode.mp4',qa_inputs_ready:false,selected_voice:'af_heart'},
  qa:{status:'REWORK_REQUIRED',user_action_required:'publish_grade_visual_assets_missing'},
};
const input={
  episodeId:'20260807-episode',
  scenes:Array.from({length:9},(_,i)=>({id:`scene-${String(i+1).padStart(2,'0')}`,headline:'X',narration:'Y'})),
};

test('plans one revision-safe rebuild only for the stale placeholder render',()=>{
  const plan=planEpisode1VisualRebuild({state,input,assetsReady:true});
  assert.equal(plan.kind,'REBUILD');
  assert.equal(plan.expectedRevision,16);
  assert.equal(plan.episodeId,'20260807-episode');
  assert.equal(plan.transitionTo,'VOICE_READY');
  assert.equal(plan.productionPatch.render_asset,null);
  assert.equal(plan.productionPatch.qa_inputs_ready,false);
});

test('does not invalidate a newly rendered episode after canonical input was already upgraded',()=>{
  const upgraded=applyVisualAssetsToInput(input);
  const plan=planEpisode1VisualRebuild({state:{...state,production:{...state.production,render_asset:'github-actions://new/episode.mp4'}},input:upgraded,assetsReady:true});
  assert.deepEqual(plan,{kind:'NOOP',reason:'visual_input_already_upgraded'});
});

test('does not rebuild an already active or completed episode',()=>{
  for(const next of ['VOICE_READY','QA_PASSED','AUTO_PUBLISH_READY','PUBLISHED']){
    assert.equal(planEpisode1VisualRebuild({state:{...state,state:next},input,assetsReady:true}).kind,'NOOP');
  }
});

test('fails closed when art is incomplete or canonical blocker does not match',()=>{
  assert.equal(planEpisode1VisualRebuild({state,input,assetsReady:false}).kind,'BLOCKED');
  assert.equal(planEpisode1VisualRebuild({state:{...state,qa:{...state.qa,user_action_required:'something_else'}},input,assetsReady:true}).kind,'NOOP');
});

test('marks publish grade only when all nine canonical scene assets are attached',()=>{
  const upgraded=applyVisualAssetsToInput(input);
  assert.equal(upgraded.visualGrade,'publish-grade');
  assert.equal(upgraded.scenes.length,9);
  assert.deepEqual(upgraded.scenes.map(s=>s.visualAsset),Array.from({length:9},(_,i)=>`visuals/20260807-episode/scene-${String(i+1).padStart(2,'0')}.svg`));
});

test('refuses to upgrade incomplete or unexpected scene sets',()=>{
  assert.throws(()=>applyVisualAssetsToInput({...input,scenes:input.scenes.slice(0,8)}),/coverage mismatch/i);
  assert.throws(()=>applyVisualAssetsToInput({...input,scenes:[...input.scenes.slice(0,8),{id:'scene-99',headline:'X',narration:'Y'}]}),/coverage mismatch/i);
});
