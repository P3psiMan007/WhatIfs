import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublishGradeVisualInput, visualGuardDecision} from './publish-grade-visual-guard.mjs';

const publishGradeInput = {
  visualGrade:'publish-grade',
  scenes:[
    {visualAsset:'assets/a.svg'},
    {visualAsset:'assets/b.svg'},
  ],
};
const allAssetsExist = () => true;

test('publish-grade visual readiness requires explicit grade, per-scene assets, and verified files', () => {
  assert.equal(isPublishGradeVisualInput(publishGradeInput, {assetExists:allAssetsExist}), true);
  assert.equal(isPublishGradeVisualInput({...publishGradeInput, visualGrade:'heuristic-placeholder'}, {assetExists:allAssetsExist}), false);
  assert.equal(isPublishGradeVisualInput({...publishGradeInput, scenes:[{visualAsset:'assets/a.svg'},{visualAsset:null}]}, {assetExists:allAssetsExist}), false);
  assert.equal(isPublishGradeVisualInput(publishGradeInput, {assetExists:(asset)=>asset !== 'assets/b.svg'}), false);
});

test('rendered heuristic output is downgraded to a technical preview', () => {
  const decision = visualGuardDecision({
    state:{state:'RENDERED'},
    input:{scenes:[{visual:'clock'},{visual:'brain'}]},
    manifest:{},
    assetExists:allAssetsExist,
  });
  assert.equal(decision.kind, 'BLOCK');
  assert.equal(decision.reason, 'publish_grade_visual_assets_missing');
  assert.equal(decision.patch.production.qa_inputs_ready, false);
  assert.equal(decision.patch.qa.user_action_required, 'publish_grade_visual_assets_missing');
  assert.equal(decision.manifestPatch.qaInputsReady, false);
  assert.equal(decision.manifestPatch.technicalPreview, true);
});

test('rendered publish-grade assets remain eligible for independent QA only when files resolve', () => {
  const ready = visualGuardDecision({state:{state:'RENDERED'}, input:publishGradeInput, manifest:{}, assetExists:allAssetsExist});
  assert.deepEqual(ready, {kind:'READY', reason:'publish_grade_visuals_verified'});
  const blocked = visualGuardDecision({state:{state:'RENDERED'}, input:publishGradeInput, manifest:{}, assetExists:()=>false});
  assert.equal(blocked.kind, 'BLOCK');
});

test('non-rendered states are not mutated', () => {
  const decision = visualGuardDecision({state:{state:'VOICE_READY'}, input:{}, manifest:null, assetExists:allAssetsExist});
  assert.deepEqual(decision, {kind:'NOOP', reason:'not_rendered'});
});
