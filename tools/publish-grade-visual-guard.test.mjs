import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublishGradeVisualInput, visualGuardDecision} from './publish-grade-visual-guard.mjs';

const publishGradeInput = {
  visualGrade:'publish-grade',
  scenes:[
    {visualAsset:'assets/a.mp4'},
    {visualAsset:'assets/b.mp4'},
  ],
};

test('publish-grade visual readiness requires explicit grade and per-scene assets', () => {
  assert.equal(isPublishGradeVisualInput(publishGradeInput), true);
  assert.equal(isPublishGradeVisualInput({...publishGradeInput, visualGrade:'heuristic-placeholder'}), false);
  assert.equal(isPublishGradeVisualInput({...publishGradeInput, scenes:[{visualAsset:'assets/a.mp4'},{visualAsset:null}]}), false);
});

test('rendered heuristic output is downgraded to a technical preview', () => {
  const decision = visualGuardDecision({
    state:{state:'RENDERED'},
    input:{scenes:[{visual:'clock'},{visual:'brain'}]},
    manifest:{},
  });
  assert.equal(decision.kind, 'BLOCK');
  assert.equal(decision.reason, 'publish_grade_visual_assets_missing');
  assert.equal(decision.patch.production.qa_inputs_ready, false);
  assert.equal(decision.patch.qa.user_action_required, 'publish_grade_visual_assets_missing');
  assert.equal(decision.manifestPatch.qaInputsReady, false);
  assert.equal(decision.manifestPatch.technicalPreview, true);
});

test('already-recorded visual blocker is idempotent and does not bump state revision', () => {
  const decision = visualGuardDecision({
    state:{state:'RENDERED', production:{qa_inputs_ready:false}, qa:{user_action_required:'publish_grade_visual_assets_missing'}},
    input:{scenes:[{visual:'clock'},{visual:'brain'}]},
    manifest:{visualGrade:'heuristic-placeholder', qaInputsReady:false, technicalPreview:true, publishBlocker:'publish_grade_visual_assets_missing'},
  });
  assert.deepEqual(decision, {kind:'BLOCK_RECORDED', reason:'publish_grade_visual_assets_missing'});
});

test('rendered publish-grade assets remain eligible for independent QA', () => {
  const decision = visualGuardDecision({state:{state:'RENDERED'}, input:publishGradeInput, manifest:{}});
  assert.deepEqual(decision, {kind:'READY', reason:'publish_grade_visuals_verified'});
});

test('publish-grade assets clear a stale visual-assets blocker revision-safely', () => {
  const decision = visualGuardDecision({
    state:{state:'RENDERED', production:{qa_inputs_ready:true}, qa:{user_action_required:'publish_grade_visual_assets_missing'}},
    input:publishGradeInput,
    manifest:{visualGrade:'heuristic-placeholder', qaInputsReady:false, technicalPreview:true, publishBlocker:'publish_grade_visual_assets_missing'},
  });
  assert.equal(decision.kind, 'CLEAR');
  assert.equal(decision.reason, 'publish_grade_visuals_verified');
  assert.deepEqual(decision.patch, {production:{qa_inputs_ready:true}, qa:{user_action_required:null}});
  assert.deepEqual(decision.manifestPatch, {visualGrade:'publish-grade', qaInputsReady:true, technicalPreview:false, publishBlocker:null});
});

test('non-rendered states are not mutated', () => {
  const decision = visualGuardDecision({state:{state:'VOICE_READY'}, input:{}, manifest:null});
  assert.deepEqual(decision, {kind:'NOOP', reason:'not_rendered'});
});
