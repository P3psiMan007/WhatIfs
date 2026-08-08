import test from 'node:test';
import assert from 'node:assert/strict';
import {planEpisode1ThumbnailRepair,applyThumbnailRevision} from './episode1-thumbnail-rebuild.mjs';

const state={
  episode_id:'20260807-episode',
  state:'RENDERED',
  state_revision:21,
  production:{qa_inputs_ready:true,render_asset:'github-actions://run/31245114773/artifact/episode-render/episode.mp4'},
};
const input={episodeId:'20260807-episode',visualGrade:'publish-grade',scenes:Array.from({length:9},(_,i)=>({id:`scene-${String(i+1).padStart(2,'0')}`,visualAsset:`visuals/20260807-episode/scene-${String(i+1).padStart(2,'0')}.svg`}))};

test('plans one rerender for the known clipped-thumbnail artifact',()=>{
  const plan=planEpisode1ThumbnailRepair({state,input});
  assert.equal(plan.kind,'REBUILD');
  assert.equal(plan.expectedRevision,21);
  assert.equal(plan.transitionTo,'VOICE_READY');
  assert.equal(plan.productionPatch.render_asset,null);
});

test('thumbnail repair becomes a no-op after input revision is applied',()=>{
  const revised=applyThumbnailRevision(input);
  assert.equal(revised.thumbnailRevision,'framing-v2');
  assert.deepEqual(planEpisode1ThumbnailRepair({state,input:revised}),{kind:'NOOP',reason:'thumbnail_revision_already_applied'});
});

test('thumbnail repair refuses unrelated episodes, states, or render artifacts',()=>{
  assert.equal(planEpisode1ThumbnailRepair({state:{...state,episode_id:'other'},input}).kind,'NOOP');
  assert.equal(planEpisode1ThumbnailRepair({state:{...state,state:'QA_PASSED'},input}).kind,'NOOP');
  assert.equal(planEpisode1ThumbnailRepair({state:{...state,production:{...state.production,render_asset:'github-actions://run/999/artifact/episode-render/episode.mp4'}},input}).kind,'NOOP');
});
