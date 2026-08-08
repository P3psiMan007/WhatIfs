#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const EPISODE_ID='20260807-episode';
const THUMBNAIL_REVISION='framing-v2';
const HOOK_CONTRAST_REVISION='hours-v2';
const LATE_BEAT_REVISION='aligned-v2';
const STATE_PATH=process.env.EPISODE_STATE_PATH||'episodes/current/episode-state.json';
const INPUT_PATH=process.env.PRODUCTION_INPUT_PATH||'episodes/current/production-input.json';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

export function applyLateBeatRevision(input){
  if(input?.episodeId!==EPISODE_ID) throw new Error(`episode mismatch: expected ${EPISODE_ID}, found ${input?.episodeId||'null'}`);
  return {...input,lateBeatRevision:LATE_BEAT_REVISION};
}

export function planEpisode1LateBeatRepair({state,input}){
  if(input?.episodeId!==EPISODE_ID||state?.episode_id!==EPISODE_ID) return {kind:'NOOP',reason:'another_episode'};
  if(input?.lateBeatRevision===LATE_BEAT_REVISION) return {kind:'NOOP',reason:'late_beat_revision_already_applied'};
  if(state?.state!=='RENDERED') return {kind:'NOOP',reason:`state_${state?.state||'unknown'}`};
  if(state?.production?.qa_inputs_ready!==true) return {kind:'NOOP',reason:'render_not_qa_ready'};
  if(input?.visualGrade!=='publish-grade') return {kind:'NOOP',reason:'visual_input_not_publish_grade'};
  if(input?.thumbnailRevision!==THUMBNAIL_REVISION) return {kind:'NOOP',reason:'thumbnail_fix_not_ready'};
  if(input?.hookContrastRevision!==HOOK_CONTRAST_REVISION) return {kind:'NOOP',reason:'hook_contrast_fix_not_ready'};
  if(typeof state?.production?.render_asset!=='string'||state.production.render_asset.length===0) return {kind:'NOOP',reason:'render_asset_missing'};
  return {
    kind:'REBUILD',expectedRevision:Number(state.state_revision),episodeId:EPISODE_ID,transitionTo:'VOICE_READY',
    productionPatch:{render_asset:null,qa_inputs_ready:false},
    reason:'rerender after QA inspection found late visual beats cycling to earlier scene phases; keep later visuals aligned to the spoken payoff',
  };
}

function runState(args){
  const r=spawnSync(process.execPath,['tools/episode-state.mjs',...args],{encoding:'utf8'});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function main(){
  if(!fs.existsSync(STATE_PATH)||!fs.existsSync(INPUT_PATH)){
    console.log('EPISODE1_LATE_BEAT_REPAIR_NOOP missing_state_or_input');
    return;
  }
  const state=readJson(STATE_PATH); const input=readJson(INPUT_PATH);
  const plan=planEpisode1LateBeatRepair({state,input});
  if(plan.kind!=='REBUILD'){
    console.log(`EPISODE1_LATE_BEAT_REPAIR_${plan.kind} ${plan.reason}`);
    return;
  }
  writeJson(INPUT_PATH,applyLateBeatRevision(input));
  const patched=runState(['patch',String(plan.expectedRevision),plan.episodeId,'episode1-late-beat-repair',JSON.stringify({production:plan.productionPatch})]);
  const transitioned=runState(['transition',String(patched.state_revision),plan.episodeId,plan.transitionTo,'episode1-late-beat-repair',plan.reason]);
  console.log(`EPISODE1_LATE_BEAT_REPAIR_READY revision=${transitioned.state_revision}`);
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{main();}catch(error){console.error(`EPISODE1_LATE_BEAT_REPAIR_ERROR ${error?.stack||String(error)}`);process.exitCode=1;}
}
