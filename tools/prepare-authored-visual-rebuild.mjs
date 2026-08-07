#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {isPublishGradeVisualInput} from './publish-grade-visual-guard.mjs';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));

export function authoredVisualRebuildDecision({state,input,manifest,assetExists}){
  if(state?.state!=='RENDERED') return {kind:'NOOP',reason:'not_rendered'};
  if(!isPublishGradeVisualInput(input,{assetExists})) return {kind:'NOOP',reason:'authored_visual_assets_not_ready'};
  const technical=manifest?.technicalPreview===true || manifest?.publishBlocker==='publish_grade_visual_assets_missing' || manifest?.visualGrade==='heuristic-placeholder';
  if(!technical) return {kind:'NOOP',reason:'render_not_technical_preview'};
  return {kind:'RESET',reason:'authored_visual_assets_ready_for_rebuild'};
}

function runState(args){
  const r=spawnSync(process.execPath,['tools/episode-state.mjs',...args],{encoding:'utf8'});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function main(){
  const statePath=process.env.EPISODE_STATE_PATH||'episodes/current/episode-state.json';
  const inputPath=process.env.PRODUCTION_INPUT_PATH||'episodes/current/production-input.json';
  const manifestPath=process.env.RENDER_MANIFEST_PATH||'episodes/current/render-manifest.json';
  if(!fs.existsSync(statePath)||!fs.existsSync(inputPath)||!fs.existsSync(manifestPath)){
    console.log('AUTHORED_VISUAL_REBUILD_NOOP missing_required_artifact');return;
  }
  const state=readJson(statePath);const input=readJson(inputPath);const manifest=readJson(manifestPath);
  const decision=authoredVisualRebuildDecision({state,input,manifest});
  if(decision.kind!=='RESET'){console.log(`AUTHORED_VISUAL_REBUILD_NOOP ${decision.reason}`);return;}
  const patched=runState(['patch',String(state.state_revision),state.episode_id,'authored-visual-rebuild',JSON.stringify({production:{render_asset:null,qa_inputs_ready:false},qa:{status:'REWORK_REQUIRED',user_action_required:null,required_fixes:['Re-render with verified authored per-scene visual assets before independent QA.']}})]);
  runState(['transition',String(patched.state_revision),state.episode_id,'VOICE_READY','authored-visual-rebuild',decision.reason]);
  console.log(`AUTHORED_VISUAL_REBUILD_RESET ${decision.reason}`);
}

if(import.meta.url===`file://${process.argv[1]}`){try{main();}catch(error){console.error(`AUTHORED_VISUAL_REBUILD_ERROR ${error?.stack||String(error)}`);process.exitCode=1;}}
