#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {SLEEP_SCENE_IDS,SLEEP_SCENE_ASSETS} from '../video/src/sleep-visual-registry.mjs';

const EPISODE_ID='20260807-episode';
const ILLUSTRATED_REVISION='illustrated-v3';
const THUMBNAIL_REVISION='framing-v2';
const HOOK_CONTRAST_REVISION='hours-v2';
const LATE_BEAT_REVISION='aligned-v2';
const STATE_PATH=process.env.EPISODE_STATE_PATH||'episodes/current/episode-state.json';
const INPUT_PATH=process.env.PRODUCTION_INPUT_PATH||'episodes/current/production-input.json';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

export function applyIllustratedV3Revision(input){
  if(input?.episodeId!==EPISODE_ID) throw new Error(`episode mismatch: expected ${EPISODE_ID}, found ${input?.episodeId||'null'}`);
  return {...input,illustratedSceneRevision:ILLUSTRATED_REVISION};
}

export function planEpisode1IllustratedV3Repair({state,input,assetsReady}){
  if(input?.episodeId!==EPISODE_ID||state?.episode_id!==EPISODE_ID) return {kind:'NOOP',reason:'another_episode'};
  if(input?.illustratedSceneRevision===ILLUSTRATED_REVISION) return {kind:'NOOP',reason:'illustrated_revision_already_applied'};
  if(['QA_PASSED','AUTO_PUBLISH_READY','PUBLISHED'].includes(state?.state)) return {kind:'NOOP',reason:`publisher_owned_${state.state}`};
  if(state?.state!=='RENDERED') return {kind:'NOOP',reason:`state_${state?.state||'unknown'}`};
  if(state?.production?.qa_inputs_ready!==true) return {kind:'NOOP',reason:'render_not_qa_ready'};
  if(typeof state?.production?.render_asset!=='string'||state.production.render_asset.length===0) return {kind:'NOOP',reason:'render_asset_missing'};
  if(input?.visualGrade!=='publish-grade') return {kind:'NOOP',reason:'visual_input_not_publish_grade'};
  if(input?.thumbnailRevision!==THUMBNAIL_REVISION) return {kind:'NOOP',reason:'thumbnail_fix_not_ready'};
  if(input?.hookContrastRevision!==HOOK_CONTRAST_REVISION) return {kind:'NOOP',reason:'hook_contrast_fix_not_ready'};
  if(input?.lateBeatRevision!==LATE_BEAT_REVISION) return {kind:'NOOP',reason:'late_beat_fix_not_ready'};
  if(!assetsReady) return {kind:'BLOCKED',reason:'illustrated_v3_assets_incomplete'};
  return {
    kind:'REBUILD',
    expectedRevision:Number(state.state_revision),
    episodeId:EPISODE_ID,
    transitionTo:'VOICE_READY',
    productionPatch:{render_asset:null,qa_inputs_ready:false},
    reason:'rerender after direct quality review found sparse diagram-like art; upgrade all scene plates to illustrated-v3 narrative environments',
  };
}

function allAssetsReady(){
  return SLEEP_SCENE_IDS.every((id)=>{
    const file=`public/${SLEEP_SCENE_ASSETS[id]}`;
    if(!fs.existsSync(file)||fs.statSync(file).size<=1700) return false;
    const svg=fs.readFileSync(file,'utf8');
    return svg.includes('data-quality="illustrated-v3"')&&svg.includes('id="environment"')&&svg.includes('id="characters"')&&svg.includes('id="depth"');
  });
}

function runState(args){
  const r=spawnSync(process.execPath,['tools/episode-state.mjs',...args],{encoding:'utf8'});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function main(){
  if(!fs.existsSync(STATE_PATH)||!fs.existsSync(INPUT_PATH)){
    console.log('EPISODE1_ILLUSTRATED_V3_NOOP missing_state_or_input');
    return;
  }
  const state=readJson(STATE_PATH); const input=readJson(INPUT_PATH);
  const plan=planEpisode1IllustratedV3Repair({state,input,assetsReady:allAssetsReady()});
  if(plan.kind!=='REBUILD'){
    console.log(`EPISODE1_ILLUSTRATED_V3_${plan.kind} ${plan.reason}`);
    if(plan.kind==='BLOCKED') process.exitCode=2;
    return;
  }
  writeJson(INPUT_PATH,applyIllustratedV3Revision(input));
  const patched=runState(['patch',String(plan.expectedRevision),plan.episodeId,'episode1-illustrated-v3-repair',JSON.stringify({production:plan.productionPatch})]);
  const transitioned=runState(['transition',String(patched.state_revision),plan.episodeId,plan.transitionTo,'episode1-illustrated-v3-repair',plan.reason]);
  console.log(`EPISODE1_ILLUSTRATED_V3_READY revision=${transitioned.state_revision}`);
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{main();}catch(error){console.error(`EPISODE1_ILLUSTRATED_V3_ERROR ${error?.stack||String(error)}`);process.exitCode=1;}
}
