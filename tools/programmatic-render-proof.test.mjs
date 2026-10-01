import test from 'node:test';
import assert from 'node:assert/strict';
import {planProgrammaticRenderProof} from './programmatic-render-proof.mjs';

const DIGEST=`sha256:${'b'.repeat(64)}`;

const state={episode_id:'20260810-episode',state:'RENDERED'};
const input={
  episodeId:'20260810-episode',
  visualSystem:'solar-storm-explainer-v1',
  semanticVisualRevision:'solar-storm-semantic-v6',
  rendererRuntimeRevision:'full-frame-svg-freeze-v3',
  visualGrade:'heuristic-placeholder',
  rendererProof:{required:true,composition:'WhatIfDoodleRendererProof'},
  scenes:Array.from({length:10},(_,i)=>({id:`scene-${i+1}`,headline:`SCENE ${i+1}`,narration:'Narration'})),
};
const manifest={episodeId:'20260810-episode',githubRunId:'321',artifactName:'episode-render',filename:'episode.mp4'};

test('binds the exact current episode render as publish-grade proof', () => {
  const plan=planProgrammaticRenderProof({state,input,manifest,runId:'321',videoDigest:DIGEST});
  assert.equal(plan.kind,'BIND');
  assert.equal(plan.inputPatch.visualGrade,'publish-grade');
  assert.equal(plan.inputPatch.rendererProof.composition,'WhatIfEpisode');
  assert.equal(plan.inputPatch.rendererProof.workflowRunId,321);
  assert.equal(plan.inputPatch.rendererProof.artifactDigest,DIGEST);
  assert.equal(plan.manifestPatch.visualSystem,'solar-storm-explainer-v1');
  assert.equal(plan.manifestPatch.rendererProofRunId,321);
  assert.equal(plan.manifestPatch.rendererProofDigest,DIGEST);
});

test('refuses to bind proof from a different workflow run', () => {
  const plan=planProgrammaticRenderProof({state,input,manifest,runId:'999',videoDigest:DIGEST});
  assert.deepEqual(plan,{kind:'NOOP',reason:'manifest_run_mismatch'});
});

test('refuses malformed video digests', () => {
  const plan=planProgrammaticRenderProof({state,input,manifest,runId:'321',videoDigest:'sha256:nope'});
  assert.deepEqual(plan,{kind:'NOOP',reason:'invalid_video_digest'});
});
