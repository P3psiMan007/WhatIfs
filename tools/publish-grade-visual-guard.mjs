#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const BLOCKER = 'publish_grade_visual_assets_missing';

export function isPublishGradeVisualInput(input) {
  return input?.visualGrade === 'publish-grade'
    && Array.isArray(input?.scenes)
    && input.scenes.length >= 2
    && input.scenes.every((scene) => typeof scene?.visualAsset === 'string' && scene.visualAsset.trim().length > 0);
}

export function visualGuardDecision({state, input, manifest}) {
  if (state?.state !== 'RENDERED') return {kind:'NOOP', reason:'not_rendered'};
  const publishGrade = isPublishGradeVisualInput(input);
  if (publishGrade) {
    const staleBlocker = state?.qa?.user_action_required === BLOCKER
      || manifest?.qaInputsReady === false
      || manifest?.technicalPreview === true
      || manifest?.publishBlocker === BLOCKER
      || manifest?.visualGrade !== 'publish-grade';
    if (staleBlocker) {
      return {
        kind:'CLEAR',
        reason:'publish_grade_visuals_verified',
        patch:{production:{qa_inputs_ready:true}, qa:{user_action_required:null}},
        manifestPatch:{visualGrade:'publish-grade', qaInputsReady:true, technicalPreview:false, publishBlocker:null},
      };
    }
    return {kind:'READY', reason:'publish_grade_visuals_verified'};
  }
  const alreadyRecorded = state?.production?.qa_inputs_ready === false
    && state?.qa?.user_action_required === BLOCKER
    && manifest?.qaInputsReady === false
    && manifest?.technicalPreview === true
    && manifest?.publishBlocker === BLOCKER;
  if (alreadyRecorded) return {kind:'BLOCK_RECORDED', reason:BLOCKER};
  return {
    kind:'BLOCK',
    reason:BLOCKER,
    patch:{
      production:{qa_inputs_ready:false},
      qa:{user_action_required:BLOCKER},
    },
    manifestPatch:{
      visualGrade: input?.visualGrade || 'heuristic-placeholder',
      qaInputsReady:false,
      technicalPreview:true,
      publishBlocker:BLOCKER,
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
  if (!['BLOCK','CLEAR'].includes(decision.kind)) {
    console.log(`VISUAL_GUARD_${decision.kind} ${decision.reason}`);
    return;
  }
  runState(['patch', String(state.state_revision), state.episode_id, 'publish-grade-visual-guard', JSON.stringify(decision.patch)]);
  if (manifest) writeJson(manifestPath, {...manifest, ...decision.manifestPatch});
  if (decision.kind === 'BLOCK') console.error(`VISUAL_GUARD_BLOCKED ${decision.reason}`);
  else console.log(`VISUAL_GUARD_CLEAR ${decision.reason}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (error) { console.error(`VISUAL_GUARD_ERROR ${error?.stack || String(error)}`); process.exitCode = 1; }
}
