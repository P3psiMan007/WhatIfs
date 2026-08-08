import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPublishGradeVisualInput,shouldInvalidateTechnicalPreview} from './activate-bespoke-visuals.mjs';

const baseInput={
  episodeId:'20260807-episode',
  scenes:Array.from({length:9},(_,i)=>({id:`scene-${String(i+1).padStart(2,'0')}`,headline:`S${i+1}`,narration:'x'})),
};

test('activation binds all nine real scene assets before labeling the current input publish-grade',()=>{
  const next=buildPublishGradeVisualInput(baseInput);
  assert.equal(next.visualGrade,'publish-grade');
  assert.equal(next.scenes.length,9);
  assert.deepEqual(next.scenes.map((s)=>s.visualAsset),Array.from({length:9},(_,i)=>`visuals/20260807-episode/scene-${String(i+1).padStart(2,'0')}.svg`));
});

test('activation rejects wrong episode or incomplete scene coverage',()=>{
  assert.throws(()=>buildPublishGradeVisualInput({...baseInput,episodeId:'other'}),/episode mismatch/i);
  assert.throws(()=>buildPublishGradeVisualInput({...baseInput,scenes:baseInput.scenes.slice(0,8)}),/coverage mismatch/i);
});

test('only the known blocked technical preview is invalidated for a fresh bespoke render',()=>{
  assert.equal(shouldInvalidateTechnicalPreview({episode_id:'20260807-episode',state:'RENDERED',production:{qa_inputs_ready:false,render_asset:'github-actions://old'}}),true);
  assert.equal(shouldInvalidateTechnicalPreview({episode_id:'20260807-episode',state:'RENDERED',production:{qa_inputs_ready:true,render_asset:'github-actions://new'}}),false);
  assert.equal(shouldInvalidateTechnicalPreview({episode_id:'20260807-episode',state:'QA_PASSED',production:{qa_inputs_ready:true,render_asset:'x'}}),false);
  assert.equal(shouldInvalidateTechnicalPreview({episode_id:'other',state:'RENDERED',production:{qa_inputs_ready:false,render_asset:'x'}}),false);
});
