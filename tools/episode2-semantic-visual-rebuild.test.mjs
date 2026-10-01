import test from 'node:test';
import assert from 'node:assert/strict';
import {planSemanticRebuild} from './episode2-semantic-visual-rebuild.mjs';

const EPISODE_ID='20260810-episode';
const REVISION='solar-storm-semantic-v6';
const RUNTIME='full-frame-svg-freeze-v3';
const DIGEST=`sha256:${'a'.repeat(64)}`;

function currentInput(overrides={}) {
  return {
    episodeId:EPISODE_ID,
    visualSystem:'solar-storm-explainer-v1',
    semanticVisualRevision:REVISION,
    rendererRuntimeRevision:RUNTIME,
    visualGrade:'heuristic-placeholder',
    rendererProof:{required:true,composition:'WhatIfDoodleRendererProof'},
    ...overrides,
  };
}

function renderedState(overrides={}) {
  return {
    episode_id:EPISODE_ID,
    state:'RENDERED',
    state_revision:63,
    production:{semantic_visual_revision:REVISION,qa_inputs_ready:false,render_asset:null},
    qa:{status:'REWORK_REQUIRED',user_action_required:'publish_grade_visual_assets_missing'},
    ...overrides,
  };
}

test('rebuilds a current semantic revision when publish-grade visuals are still blocked', () => {
  const plan=planSemanticRebuild({state:renderedState(),input:currentInput()});
  assert.equal(plan.kind,'REBUILD');
  assert.equal(plan.transitionTo,'VOICE_READY');
  assert.equal(plan.productionPatch.render_asset,null);
});

test('noops only after the current semantic render has publish-grade proof and QA inputs', () => {
  const state=renderedState({
    production:{semantic_visual_revision:REVISION,qa_inputs_ready:true,render_asset:'github-actions://run/123/artifact/episode-render/episode.mp4'},
    qa:{status:'PENDING',user_action_required:null},
  });
  const input=currentInput({
    visualGrade:'publish-grade',
    rendererProof:{required:true,composition:'WhatIfEpisode',workflowRunId:123,artifactDigest:DIGEST},
  });
  const plan=planSemanticRebuild({state,input});
  assert.deepEqual(plan,{kind:'NOOP',reason:'semantic_visual_render_already_verified'});
});

test('explicit rerender request still rebuilds a verified render', () => {
  const state=renderedState({
    production:{semantic_visual_revision:REVISION,qa_inputs_ready:true,render_asset:'github-actions://run/123/artifact/episode-render/episode.mp4'},
    qa:{status:'PENDING',user_action_required:null},
  });
  const input=currentInput({
    visualGrade:'publish-grade',
    rerenderRequest:{reason:'manual'},
    rendererProof:{required:true,composition:'WhatIfEpisode',workflowRunId:123,artifactDigest:DIGEST},
  });
  assert.equal(planSemanticRebuild({state,input}).kind,'REBUILD');
});
