import test from 'node:test';
import assert from 'node:assert/strict';
import {applyIllustratedV3Revision,planEpisode1IllustratedV3Repair} from './episode1-illustrated-v3-rebuild.mjs';

const baseState={
  episode_id:'20260807-episode',
  state:'RENDERED',
  state_revision:43,
  production:{qa_inputs_ready:true,render_asset:'github-actions://run/31250080188/artifact/episode-render/episode.mp4'},
};
const baseInput={
  episodeId:'20260807-episode',
  visualGrade:'publish-grade',
  thumbnailRevision:'framing-v2',
  hookContrastRevision:'hours-v2',
  lateBeatRevision:'aligned-v2',
};

test('plans one revision-safe rerender for illustrated-v3 after earlier packaging repairs are canonical',()=>{
  const plan=planEpisode1IllustratedV3Repair({state:baseState,input:baseInput,assetsReady:true});
  assert.deepEqual(plan,{
    kind:'REBUILD',
    expectedRevision:43,
    episodeId:'20260807-episode',
    transitionTo:'VOICE_READY',
    productionPatch:{render_asset:null,qa_inputs_ready:false},
    reason:'rerender after direct quality review found sparse diagram-like art; upgrade all scene plates to illustrated-v3 narrative environments',
  });
});

test('illustrated-v3 repair is one-shot and refuses unsafe states',()=>{
  assert.equal(planEpisode1IllustratedV3Repair({state:baseState,input:{...baseInput,illustratedSceneRevision:'illustrated-v3'},assetsReady:true}).kind,'NOOP');
  assert.equal(planEpisode1IllustratedV3Repair({state:{...baseState,state:'QA_PASSED'},input:baseInput,assetsReady:true}).kind,'NOOP');
  assert.equal(planEpisode1IllustratedV3Repair({state:{...baseState,state:'AUTO_PUBLISH_READY'},input:baseInput,assetsReady:true}).kind,'NOOP');
  assert.equal(planEpisode1IllustratedV3Repair({state:{...baseState,state:'PUBLISHED'},input:baseInput,assetsReady:true}).kind,'NOOP');
  assert.equal(planEpisode1IllustratedV3Repair({state:{...baseState,state:'VOICE_READY'},input:baseInput,assetsReady:true}).kind,'NOOP');
  assert.equal(planEpisode1IllustratedV3Repair({state:baseState,input:{...baseInput,episodeId:'other'},assetsReady:true}).kind,'NOOP');
  assert.equal(planEpisode1IllustratedV3Repair({state:baseState,input:{...baseInput,visualGrade:'technical-preview'},assetsReady:true}).kind,'NOOP');
  assert.equal(planEpisode1IllustratedV3Repair({state:baseState,input:baseInput,assetsReady:false}).kind,'BLOCKED');
});

test('applying illustrated-v3 persists only the quality revision marker',()=>{
  const revised=applyIllustratedV3Revision(baseInput);
  assert.deepEqual(revised,{...baseInput,illustratedSceneRevision:'illustrated-v3'});
  assert.deepEqual(baseInput,{
    episodeId:'20260807-episode',visualGrade:'publish-grade',thumbnailRevision:'framing-v2',hookContrastRevision:'hours-v2',lateBeatRevision:'aligned-v2',
  });
});
