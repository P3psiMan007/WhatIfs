import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {EPISODE1_IMAGE_ASSET_REVISION, EPISODE1_IMAGE_SCENE_IDS, imageAssetsForScene} from '../video/src/episode1-image-assets.mjs';
import {applyImageFirstAssetsToInput,imageFirstInputIsCanonical,planImageFirstRebuild,validateImageFirstManifest} from './episode1-image-first-rebuild.mjs';

const scenes = EPISODE1_IMAGE_SCENE_IDS.map((id) => ({id,headline:id,narration:'Narrated visual beat.',visualAsset:'legacy-placeholder'}));
const baseInput = {episodeId:'20260807-episode',visualGrade:'publish-grade',scenes};
const baseState = {episode_id:'20260807-episode',state:'RENDERED',state_revision:87,production:{render_asset:'github-actions://old/episode.mp4',qa_inputs_ready:true}};

test('all committed image-first assets have matching local hashes, valid PNG headers, and cinematic aspect ratios',()=>{
  const manifest = JSON.parse(fs.readFileSync('episodes/current/image-assets-v1.json','utf8'));
  assert.equal(validateImageFirstManifest(manifest), true);
});

test('image-first input replaces legacy scene assets with the exact local environment set',()=>{
  const upgraded = applyImageFirstAssetsToInput(baseInput);
  assert.equal(upgraded.imageFirstAssetRevision, EPISODE1_IMAGE_ASSET_REVISION);
  assert.equal(upgraded.imageAssetManifest, 'episodes/current/image-assets-v1.json');
  assert.equal(imageFirstInputIsCanonical(upgraded), true);
  for (const scene of upgraded.scenes) {
    assert.equal(Object.hasOwn(scene,'visualAsset'), false);
    assert.deepEqual(scene.imageAssets, imageAssetsForScene(scene.id));
  }
});

test('exactly one rendered legacy artifact is invalidated for the new image-first asset revision',()=>{
  const upgraded = applyImageFirstAssetsToInput(baseInput);
  const plan = planImageFirstRebuild({state:baseState,input:upgraded,assetsReady:true});
  assert.equal(plan.kind,'REBUILD');
  assert.equal(plan.transitionTo,'VOICE_READY');
  assert.equal(plan.productionPatch.image_first_asset_revision,EPISODE1_IMAGE_ASSET_REVISION);
  assert.equal(plan.productionPatch.render_asset,null);
  assert.equal(plan.productionPatch.qa_inputs_ready,false);
  assert.deepEqual(planImageFirstRebuild({state:{...baseState,production:{...baseState.production,image_first_asset_revision:EPISODE1_IMAGE_ASSET_REVISION}},input:upgraded,assetsReady:true}),{kind:'NOOP',reason:'image_first_render_already_requested'});
});

test('image-first rebuild fails closed for invalid assets and non-rendered states',()=>{
  assert.deepEqual(planImageFirstRebuild({state:baseState,input:baseInput,assetsReady:false}),{kind:'BLOCKED',reason:'first_party_image_assets_invalid'});
  assert.equal(planImageFirstRebuild({state:{...baseState,state:'SCRIPTED'},input:baseInput,assetsReady:true}).kind,'NOOP');
  assert.equal(planImageFirstRebuild({state:{...baseState,state:'QA_PASSED'},input:baseInput,assetsReady:true}).kind,'NOOP');
});

test('a stale voice-ready image revision refreshes the no-repeat asset set without touching narration state',()=>{
  const refreshed = applyImageFirstAssetsToInput(baseInput);
  const plan = planImageFirstRebuild({
    state:{...baseState,state:'VOICE_READY',production:{...baseState.production,image_first_asset_revision:'image-first-cinematic-v1'}},
    input:refreshed,
    assetsReady:true,
  });
  assert.equal(plan.kind,'REFRESH_VISUALS');
  assert.equal(plan.productionPatch.image_first_asset_revision,EPISODE1_IMAGE_ASSET_REVISION);
  assert.equal(plan.productionPatch.render_asset,null);
  assert.equal(plan.transitionTo,undefined);
});
