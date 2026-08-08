import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCharacterPayoffV4Revision,planEpisode1CharacterPayoffV4Repair} from './episode1-character-payoff-v4-rebuild.mjs';

const STALE_RENDER='github-actions://run/31251384878/artifact/episode-render/episode.mp4';
const baseState={
  episode_id:'20260807-episode',
  state:'RENDERED',
  state_revision:49,
  production:{qa_inputs_ready:true,render_asset:STALE_RENDER},
};
const baseInput={
  episodeId:'20260807-episode',
  visualGrade:'publish-grade',
  thumbnailRevision:'framing-v2',
  hookContrastRevision:'hours-v2',
  lateBeatRevision:'aligned-v2',
  illustratedSceneRevision:'illustrated-v3',
};

test('plans one rerender only for the inspected illustrated-v3 artifact needing character/payoff v4',()=>{
  assert.deepEqual(planEpisode1CharacterPayoffV4Repair({state:baseState,input:baseInput}),{
    kind:'REBUILD',
    expectedRevision:49,
    episodeId:'20260807-episode',
    transitionTo:'VOICE_READY',
    productionPatch:{render_asset:null,qa_inputs_ready:false},
    reason:'rerender after direct QA found stale payoff arithmetic in authored visuals and stick-only primary characters; apply character-payoff-v4',
  });
});

test('character-payoff v4 rerender is one-shot and refuses stale or publisher-owned contexts',()=>{
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:baseState,input:{...baseInput,characterPayoffRevision:'character-payoff-v4'}}).kind,'NOOP');
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:{...baseState,state:'QA_PASSED'},input:baseInput}).kind,'NOOP');
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:{...baseState,state:'AUTO_PUBLISH_READY'},input:baseInput}).kind,'NOOP');
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:{...baseState,state:'PUBLISHED'},input:baseInput}).kind,'NOOP');
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:{...baseState,state:'VOICE_READY'},input:baseInput}).kind,'NOOP');
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:{...baseState,production:{...baseState.production,render_asset:'github-actions://run/999/artifact/episode-render/episode.mp4'}},input:baseInput}).kind,'NOOP');
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:{...baseState,production:{...baseState.production,qa_inputs_ready:false}},input:baseInput}).kind,'NOOP');
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:baseState,input:{...baseInput,illustratedSceneRevision:null}}).kind,'NOOP');
  assert.equal(planEpisode1CharacterPayoffV4Repair({state:baseState,input:{...baseInput,episodeId:'other'}}).kind,'NOOP');
});

test('applying character-payoff v4 persists only its revision marker',()=>{
  assert.deepEqual(applyCharacterPayoffV4Revision(baseInput),{...baseInput,characterPayoffRevision:'character-payoff-v4'});
  assert.equal(baseInput.characterPayoffRevision,undefined);
});
