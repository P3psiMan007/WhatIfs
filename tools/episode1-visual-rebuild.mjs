#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {SLEEP_SCENE_IDS,SLEEP_SCENE_ASSETS,assertSleepVisualCoverage} from '../video/src/sleep-visual-registry.mjs';

const EPISODE_ID='20260807-episode';
const BLOCKER='publish_grade_visual_assets_missing';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,value)=>fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n');

export function applyVisualAssetsToInput(input){
  if(input?.episodeId!==EPISODE_ID) throw new Error(`episode mismatch: expected ${EPISODE_ID}, found ${input?.episodeId||'null'}`);
  const ids=(input.scenes||[]).map((scene)=>scene?.id);
  assertSleepVisualCoverage(ids);
  return {
    ...input,
    visualGrade:'publish-grade',
    scenes:input.scenes.map((scene)=>({...scene,visualAsset:SLEEP_SCENE_ASSETS[scene.id]})),
  };
}

function isVisualInputAlreadyUpgraded(input){
  if(input?.visualGrade!=='publish-grade') return false;
  const scenes=Array.isArray(input?.scenes)?input.scenes:[];
  try { assertSleepVisualCoverage(scenes.map((scene)=>scene?.id)); } catch { return false; }
  return scenes.every((scene)=>scene.visualAsset===SLEEP_SCENE_ASSETS[scene.id]);
}

export function planEpisode1VisualRebuild({state,input,assetsReady}){
  if(state?.episode_id!==EPISODE_ID || input?.episodeId!==EPISODE_ID) return {kind:'NOOP',reason:'another_episode'};
  if(isVisualInputAlreadyUpgraded(input)) return {kind:'NOOP',reason:'visual_input_already_upgraded'};
  if(state?.state!=='RENDERED') return {kind:'NOOP',reason:`state_${state?.state||'unknown'}`};
  if(state?.qa?.user_action_required!==BLOCKER) return {kind:'NOOP',reason:'blocker_changed'};
  if(!assetsReady) return {kind:'BLOCKED',reason:'bespoke_visual_assets_incomplete'};
  const ids=(input.scenes||[]).map((scene)=>scene?.id);
  try { assertSleepVisualCoverage(ids); } catch { return {kind:'BLOCKED',reason:'scene_registry_coverage_mismatch'}; }
  return {
    kind:'REBUILD',
    expectedRevision:Number(state.state_revision),
    episodeId:EPISODE_ID,
    transitionTo:'VOICE_READY',
    productionPatch:{render_asset:null,qa_inputs_ready:false},
    reason:'replace heuristic technical preview with bespoke scene-by-scene visual rebuild',
  };
}

function allAssetsReady(){
  return SLEEP_SCENE_IDS.every((id)=>{
    const p=`public/${SLEEP_SCENE_ASSETS[id]}`;
    return fs.existsSync(p) && fs.statSync(p).size>300;
  });
}

function runState(args){
  const r=spawnSync(process.execPath,['tools/episode-state.mjs',...args],{encoding:'utf8'});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function main(){
  const statePath=process.env.EPISODE_STATE_PATH||'episodes/current/episode-state.json';
  const inputPath=process.env.PRODUCTION_INPUT_PATH||'episodes/current/production-input.json';
  if(!fs.existsSync(statePath)||!fs.existsSync(inputPath)){
    console.log('EPISODE1_VISUAL_REBUILD_NOOP missing_state_or_input');
    return;
  }
  const state=readJson(statePath);
  const input=readJson(inputPath);
  const plan=planEpisode1VisualRebuild({state,input,assetsReady:allAssetsReady()});
  if(plan.kind!=='REBUILD'){
    console.log(`EPISODE1_VISUAL_REBUILD_${plan.kind} ${plan.reason}`);
    if(plan.kind==='BLOCKED') process.exitCode=2;
    return;
  }
  const upgraded=applyVisualAssetsToInput(input);
  writeJson(inputPath,upgraded);
  const patched=runState(['patch',String(plan.expectedRevision),plan.episodeId,'episode1-bespoke-visual-rebuild',JSON.stringify({production:plan.productionPatch})]);
  runState(['transition',String(patched.state_revision),plan.episodeId,plan.transitionTo,'episode1-bespoke-visual-rebuild',plan.reason]);
  console.log(`EPISODE1_VISUAL_REBUILD_READY ${plan.episodeId}`);
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{main();}catch(error){console.error(`EPISODE1_VISUAL_REBUILD_ERROR ${error?.stack||String(error)}`);process.exitCode=1;}
}
