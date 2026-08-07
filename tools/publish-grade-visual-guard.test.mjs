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

test('rendered publish-grade assets remain eligible for independent QA', () => {
  const decision = visualGuardDecision({state:{state:'RENDERED'}, input:publishGradeInput, manifest:{}});
  assert.deepEqual(decision, {kind:'READY', reason:'publish_grade_visuals_verified'});
});

test('non-rendered states are not mutated', () => {
  const decision = visualGuardDecision({state:{state:'VOICE_READY'}, input:{}, manifest:null});
  assert.deepEqual(decision, {kind:'NOOP', reason:'not_rendered'});
});
