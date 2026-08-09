#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {
  EPISODE1_IMAGE_ASSET_REVISION,
  EPISODE1_IMAGE_SCENE_IDS,
  assertEpisode1ImageAssetCoverage,
  imageAssetsForScene,
} from '../video/src/episode1-image-assets.mjs';

const EPISODE_ID = '20260807-episode';
const MANIFEST_PATH = 'episodes/current/image-assets-v1.json';
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

function pngDimensions(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) throw new Error('not a PNG');
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') throw new Error('PNG is missing IHDR');
  return {width:buffer.readUInt32BE(16), height:buffer.readUInt32BE(20)};
}

export function validateImageFirstManifest(manifest, root = process.cwd()) {
  if (manifest?.episodeId !== EPISODE_ID) throw new Error('image asset manifest episode mismatch');
  if (manifest?.assetRevision !== EPISODE1_IMAGE_ASSET_REVISION) throw new Error('image asset manifest revision mismatch');
  if (manifest?.origin?.thirdPartyImageUrls !== false) throw new Error('image asset manifest must prohibit third-party image URLs');
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const expectedAssetCount = EPISODE1_IMAGE_SCENE_IDS.reduce((count, sceneId) => count + imageAssetsForScene(sceneId).length, 0);
  if (assets.length !== expectedAssetCount) throw new Error('image asset manifest asset count does not match the canonical shot set');
  const listedIds = [...new Set(assets.map((asset) => asset.sceneId))];
  assertEpisode1ImageAssetCoverage(listedIds);
  for (const sceneId of EPISODE1_IMAGE_SCENE_IDS) {
    const expected = imageAssetsForScene(sceneId);
    const sceneAssets = assets.filter((asset) => asset.sceneId === sceneId).sort((a, b) => String(a.variant).localeCompare(String(b.variant)));
    if (sceneAssets.length !== expected.length) throw new Error(`image asset manifest has incomplete set for ${sceneId}`);
    for (const [index, asset] of sceneAssets.entries()) {
      const expectedVariant = String.fromCharCode(97 + index);
      const expectedPath = `public/${expected[index]}`;
      if (asset.variant !== expectedVariant || asset.path !== expectedPath) throw new Error(`image asset manifest path mismatch for ${sceneId}-${expectedVariant}`);
      const fullPath = path.resolve(root, asset.path);
      if (!fs.existsSync(fullPath)) throw new Error(`image asset missing: ${asset.path}`);
      const bytes = fs.readFileSync(fullPath);
      const dimensions = pngDimensions(bytes);
      const aspect = dimensions.width / dimensions.height;
      if (dimensions.width !== asset.width || dimensions.height !== asset.height || aspect < 1.45 || aspect > 1.85) throw new Error(`image asset dimensions are invalid: ${asset.path}`);
      const digest = crypto.createHash('sha256').update(bytes).digest('hex');
      if (digest !== asset.sha256) throw new Error(`image asset hash mismatch: ${asset.path}`);
    }
  }
  return true;
}

export function applyImageFirstAssetsToInput(input) {
  if (input?.episodeId !== EPISODE_ID) throw new Error(`episode mismatch: expected ${EPISODE_ID}, found ${input?.episodeId || 'null'}`);
  assertEpisode1ImageAssetCoverage((input.scenes || []).map((scene) => scene?.id));
  return {
    ...input,
    visualGrade: 'publish-grade',
    imageFirstAssetRevision: EPISODE1_IMAGE_ASSET_REVISION,
    imageAssetManifest: MANIFEST_PATH,
    scenes: input.scenes.map((scene) => {
      const {visualAsset, ...withoutLegacyAsset} = scene;
      return {...withoutLegacyAsset, imageAssets:[...imageAssetsForScene(scene.id)]};
    }),
  };
}

export function imageFirstInputIsCanonical(input) {
  try {
    if (input?.visualGrade !== 'publish-grade' || input?.imageFirstAssetRevision !== EPISODE1_IMAGE_ASSET_REVISION || input?.imageAssetManifest !== MANIFEST_PATH) return false;
    assertEpisode1ImageAssetCoverage((input.scenes || []).map((scene) => scene?.id));
    return input.scenes.every((scene) => {
      const expected = imageAssetsForScene(scene.id);
      return !Object.hasOwn(scene, 'visualAsset') && Array.isArray(scene.imageAssets) && scene.imageAssets.length === expected.length && scene.imageAssets.every((asset, index) => asset === expected[index]);
    });
  } catch {
    return false;
  }
}

export function planImageFirstRebuild({state, input, assetsReady}) {
  if (state?.episode_id !== EPISODE_ID || input?.episodeId !== EPISODE_ID) return {kind:'NOOP', reason:'another_episode'};
  if (['QA_PASSED', 'AUTO_PUBLISH_READY', 'PUBLISHED'].includes(state?.state)) return {kind:'NOOP', reason:`publisher_owned_${state.state}`};
  if (!assetsReady) return {kind:'BLOCKED', reason:'first_party_image_assets_invalid'};
  const productionPatch = {render_asset:null, qa_inputs_ready:false, image_first_asset_revision:EPISODE1_IMAGE_ASSET_REVISION, image_asset_manifest:MANIFEST_PATH};
  if (imageFirstInputIsCanonical(input) && state?.production?.image_first_asset_revision === EPISODE1_IMAGE_ASSET_REVISION) return {kind:'NOOP', reason:'image_first_render_already_requested'};
  if (state?.state === 'VOICE_READY') {
    return {kind:'REFRESH_VISUALS', expectedRevision:Number(state.state_revision), episodeId:EPISODE_ID, productionPatch, reason:'refresh the voice-ready episode with the verified no-repeat image-first shot set'};
  }
  if (state?.state !== 'RENDERED') return {kind:'NOOP', reason:`state_${state?.state || 'unknown'}`};
  return {
    kind:'REBUILD',
    expectedRevision:Number(state.state_revision),
    episodeId:EPISODE_ID,
    transitionTo:'VOICE_READY',
    productionPatch,
    reason:'replace the rejected template visual language with verified first-party image-first cinematic environments',
  };
}

function runState(args) {
  const result = spawnSync(process.execPath, ['tools/episode-state.mjs', ...args], {encoding:'utf8'});
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'episode-state command failed').trim());
  return JSON.parse(result.stdout);
}

function main() {
  const statePath = process.env.EPISODE_STATE_PATH || 'episodes/current/episode-state.json';
  const inputPath = process.env.PRODUCTION_INPUT_PATH || 'episodes/current/production-input.json';
  const manifestPath = process.env.IMAGE_ASSET_MANIFEST_PATH || MANIFEST_PATH;
  if (!fs.existsSync(statePath) || !fs.existsSync(inputPath) || !fs.existsSync(manifestPath)) {
    console.log('IMAGE_FIRST_REBUILD_NOOP missing_state_input_or_manifest');
    return;
  }
  const state = readJson(statePath);
  const input = readJson(inputPath);
  let assetsReady = false;
  try {
    assetsReady = validateImageFirstManifest(readJson(manifestPath));
  } catch (error) {
    console.error(`IMAGE_FIRST_ASSET_VALIDATION_FAILED ${error.message}`);
  }
  const plan = planImageFirstRebuild({state, input, assetsReady});
  if (!['REBUILD','REFRESH_VISUALS'].includes(plan.kind)) {
    console.log(`IMAGE_FIRST_REBUILD_${plan.kind} ${plan.reason}`);
    if (plan.kind === 'BLOCKED') process.exitCode = 2;
    return;
  }
  writeJson(inputPath, applyImageFirstAssetsToInput(input));
  const patched = runState(['patch', String(plan.expectedRevision), plan.episodeId, 'episode1-image-first-rebuild', JSON.stringify({
    production:plan.productionPatch,
    qa:{status:'REWORK_REQUIRED',scores:{},top_issues:['The superseded render failed visual storytelling and repetition review.'],required_fixes:['Render and independently review the exact first-party image-first cinematic artifact.'],user_action_required:null},
  })]);
  if (plan.kind === 'REBUILD') runState(['transition', String(patched.state_revision), plan.episodeId, plan.transitionTo, 'episode1-image-first-rebuild', plan.reason]);
  console.log(`IMAGE_FIRST_REBUILD_${plan.kind}_READY ${plan.episodeId}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(`IMAGE_FIRST_REBUILD_ERROR ${error?.stack || String(error)}`); process.exitCode = 1; }
}
