import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredVisualRebuildDecision} from './prepare-authored-visual-rebuild.mjs';

const input={visualGrade:'publish-grade',scenes:[{visualAsset:'assets/a.svg'},{visualAsset:'assets/b.svg'}]};
const exists=()=>true;

test('invalidates only a rendered technical preview when authored assets are now ready',()=>{
  const d=authoredVisualRebuildDecision({state:{state:'RENDERED'},input,manifest:{technicalPreview:true,publishBlocker:'publish_grade_visual_assets_missing'},assetExists:exists});
  assert.deepEqual(d,{kind:'RESET',reason:'authored_visual_assets_ready_for_rebuild'});
});

test('does not reset publisher-owned or non-rendered states',()=>{
  for(const state of ['VOICE_READY','QA_PASSED','AUTO_PUBLISH_READY','PUBLISHED']){
    assert.equal(authoredVisualRebuildDecision({state:{state},input,manifest:{technicalPreview:true},assetExists:exists}).kind,'NOOP');
  }
});

test('does not reset if an authored asset is missing',()=>{
  const d=authoredVisualRebuildDecision({state:{state:'RENDERED'},input,manifest:{technicalPreview:true},assetExists:(asset)=>asset!=='assets/b.svg'});
  assert.deepEqual(d,{kind:'NOOP',reason:'authored_visual_assets_not_ready'});
});

test('does not invalidate an already authored render',()=>{
  const d=authoredVisualRebuildDecision({state:{state:'RENDERED'},input,manifest:{technicalPreview:false,visualGrade:'publish-grade'},assetExists:exists});
  assert.deepEqual(d,{kind:'NOOP',reason:'render_not_technical_preview'});
});
