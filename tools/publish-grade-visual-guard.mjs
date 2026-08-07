#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');

export function isPublishGradeVisualInput(input, {assetExists} = {}) {
  const exists = assetExists || ((asset) => fs.existsSync(path.join('public', asset)));
  return input?.visualGrade === 'publish-grade'
    && Array.isArray(input?.scenes)
    && input.scenes.length >= 2
    && input.scenes.every((scene) => {
      const asset = typeof scene?.visualAsset === 'string' ? scene.visualAsset.trim() : '';
      return asset.length > 0 && exists(asset);
    });
}

export function visualGuardDecision({state, input, manifest, assetExists}) {
  if (state?.state !== 'RENDERED') return {kind:'NOOP', reason:'not_rendered'};
  const publishGrade = isPublishGradeVisualInput(input, {assetExists});
  if (publishGrade) return {kind:'READY', reason:'publish_grade_visuals_verified'};
  return {
    kind:'BLOCK',
    reason:'publish_grade_visual_assets_missing',
    patch:{
      production:{qa_inputs_ready:false},
      qa:{user_action_required:'publish_grade_visual_assets_missing'},
    },
    manifestPatch:{
      visualGrade: input?.visualGrade || 'heuristic-placeholder',
      qaInputsReady:false,
      technicalPreview:true,
      publishBlocker:'publish_grade_visual_assets_missing',
    },
  };
}

function runState(args) {
  const r = spawnSync(process.execPath, ['tools/episode-state.mjs', ...args], {encoding:'utf8'});
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function main() {
  const statePath = process.env.EPISODE_STATE_PATH || 'episodes/current/episode-state.json';
  const inputPath = process.env.PRODUCTION_INPUT_PATH || 'episodes/current/production-input.json';
  const manifestPath = process.env.RENDER_MANIFEST_PATH || 'episodes/current/render-manifest.json';
  if (!fs.existsSync(statePath) || !fs.existsSync(inputPath)) {
    console.log('VISUAL_GUARD_NOOP missing_state_or_input');
    return;
  }
  const state = readJson(statePath);
  const input = readJson(inputPath);
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;
  const decision = visualGuardDecision({state,input,manifest});
  if (decision.kind !== 'BLOCK') {
    console.log(`VISUAL_GUARD_${decision.kind} ${decision.reason}`);
    return;
  }
  runState(['patch', String(state.state_revision), state.episode_id, 'publish-grade-visual-guard', JSON.stringify(decision.patch)]);
  if (manifest) writeJson(manifestPath, {...manifest, ...decision.manifestPatch});
  console.error(`VISUAL_GUARD_BLOCKED ${decision.reason}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (error) { console.error(`VISUAL_GUARD_ERROR ${error?.stack || String(error)}`); process.exitCode = 1; }
}
