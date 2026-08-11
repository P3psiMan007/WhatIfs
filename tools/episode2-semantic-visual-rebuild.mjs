#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const EPISODE_ID='20260810-episode';
const VISUAL_SYSTEM='solar-storm-explainer-v1';
const REVISION='solar-storm-semantic-v6';
const RUNTIME_REVISION='direct-active-beat-v2';
const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

export function planSemanticRebuild({state,input}) {
  if(state?.episode_id!==EPISODE_ID||input?.episodeId!==EPISODE_ID)return {kind:'NOOP',reason:'another_episode'};
  if(['QA_PASSED','AUTO_PUBLISH_READY','PUBLISHED'].includes(state?.state))return {kind:'NOOP',reason:`publisher_owned_${state.state}`};
  const explicitRerender=Boolean(input?.rerenderRequest);
  const rendererCurrent=input?.rendererRuntimeRevision===RUNTIME_REVISION;
  if(input?.semanticVisualRevision===REVISION&&state?.production?.semantic_visual_revision===REVISION&&rendererCurrent&&!explicitRerender)return {kind:'NOOP',reason:'semantic_visual_render_already_requested'};
  if(!['RENDERED','VOICE_READY'].includes(state?.state))return {kind:'NOOP',reason:`state_${state?.state||'unknown'}`};
  const inputPatch={...input,visualSystem:VISUAL_SYSTEM,semanticVisualRevision:REVISION,rendererRuntimeRevision:RUNTIME_REVISION,visualGrade:'heuristic-placeholder',rendererProof:{...(input?.rendererProof||{}),required:true,composition:'WhatIfDoodleRendererProof'}};
  delete inputPatch.rerenderRequest;
  const productionPatch={render_asset:null,qa_inputs_ready:false,semantic_visual_revision:REVISION};
  return {kind:state.state==='RENDERED'?'REBUILD':'REFRESH_VISUALS',expectedRevision:Number(state.state_revision),episodeId:EPISODE_ID,inputPatch,productionPatch,transitionTo:'VOICE_READY'};
}

function runState(args){const r=spawnSync(process.execPath,['tools/episode-state.mjs',...args],{encoding:'utf8'});if(r.status!==0)throw new Error((r.stderr||r.stdout||'episode-state failed').trim());return JSON.parse(r.stdout);}

function main(){
  const statePath=process.env.EPISODE_STATE_PATH||'episodes/current/episode-state.json';
  const inputPath=process.env.PRODUCTION_INPUT_PATH||'episodes/current/production-input.json';
  if(!fs.existsSync(statePath)||!fs.existsSync(inputPath)){console.log('SEMANTIC_VISUAL_REBUILD_NOOP missing_state_or_input');return;}
  const state=readJson(statePath),input=readJson(inputPath);const plan=planSemanticRebuild({state,input});
  if(!['REBUILD','REFRESH_VISUALS'].includes(plan.kind)){console.log(`SEMANTIC_VISUAL_REBUILD_${plan.kind} ${plan.reason}`);return;}
  writeJson(inputPath,plan.inputPatch);
  const patched=runState(['patch',String(plan.expectedRevision),plan.episodeId,'episode2-semantic-visual-rebuild',JSON.stringify({production:plan.productionPatch,qa:{status:'REWORK_REQUIRED',scores:{},top_issues:['Latest inspected artifact still showed only ambient atmosphere and captions; semantic beat art remained absent.'],required_fixes:['Rerender semantic v6 with the direct active-beat runtime, then inspect real contact sheets and sampled frames before allowing QA.'],user_action_required:null}})]);
  if(plan.kind==='REBUILD')runState(['transition',String(patched.state_revision),plan.episodeId,plan.transitionTo,'episode2-semantic-visual-rebuild','rerender solar-storm episode with direct active-beat runtime']);
  console.log(`SEMANTIC_VISUAL_REBUILD_${plan.kind}_READY ${plan.episodeId}`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{main();}catch(error){console.error(`SEMANTIC_VISUAL_REBUILD_ERROR ${error?.stack||String(error)}`);process.exitCode=1;}}

// Production trigger: rerun semantic v6 after the direct active-beat runtime fix landed.
// Canonical rerender trigger 2026-08-11.
