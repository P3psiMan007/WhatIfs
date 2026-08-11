import test from 'node:test';
import assert from 'node:assert/strict';
import {planNextEpisodeBootstrap,blankEpisodeState,EPISODE_SCOPED_FILES} from './next-episode-bootstrap.mjs';

const state={state:'QA_PASSED',episode_id:'ep1'};
const publication={episodeId:'ep1',youtube:{videoId:'abc123',privateVerifiedAt:'2026-08-10T07:38:35Z',processingVerified:true,playbackVerified:true,metadataVerified:true,thumbnailSetSucceeded:true}};
const topics=[{id:'solar',enabled:true,consumedAt:null}];

test('rolls over only after exact private upload is fully verified',()=>{
  assert.equal(planNextEpisodeBootstrap({state,publication,topics}).kind,'ROLLOVER');
});

test('does not roll over an unfinished current episode',()=>{
  assert.equal(planNextEpisodeBootstrap({state:{...state,state:'RENDERED'},publication,topics}).kind,'NOOP');
});

test('does not roll over before private playback verification',()=>{
  const bad={...publication,youtube:{...publication.youtube,playbackVerified:false}};
  assert.equal(planNextEpisodeBootstrap({state,publication:bad,topics}).reason,'private_publication_not_verified');
});

test('does not roll over when publication belongs to another episode',()=>{
  assert.equal(planNextEpisodeBootstrap({state,publication:{...publication,episodeId:'other'},topics}).reason,'publication_episode_mismatch');
});

test('fresh state is isolated and starts idle with locked narrator preference',()=>{
  const fresh=blankEpisodeState();
  assert.equal(fresh.episode_id,null);
  assert.equal(fresh.state,'IDLE');
  assert.equal(fresh.state_revision,0);
  assert.deepEqual(fresh.production.voice_candidates,['af_heart']);
  assert.equal(fresh.production.render_asset,null);
  assert.equal(fresh.qa.status,null);
});

test('rollover treats QA evidence as episode-scoped state',()=>{
  assert.equal(EPISODE_SCOPED_FILES.includes('qa-evidence.json'),true);
});
