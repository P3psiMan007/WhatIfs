#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const EPISODE_ID='20260807-episode';
const REVISION='character-payoff-v4';
const REQUIRED_ILLUSTRATED_REVISION='illustrated-v3';
const INSPECTED_STALE_RENDER='github-actions://run/31251384878/artifact/episode-render/episode.mp4';
const STATE_PATH=process.env.EPISODE_STATE_PATH||'episodes/current/episode-state.json';
const INPUT_PATH=process.env.PRODUCTION_INPUT_PATH||'episodes/current/production-input.json';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

export function applyCharacterPayoffV4Revision(input){
  if(input?.episodeId!==EPISODE_ID) throw new Error(`episode mismatch: expected ${EPISODE_ID}, found ${input?.episodeId||'null'}`);
  return {...input,characterPayoffRevision:REVISION};
}

export function planEpisode1CharacterPayoffV4Repair({state,input}){
  if(input?.episodeId!==EPISODE_ID||state?.episode_id!==EPISODE_ID) return {kind:'NOOP',reason:'another_episode'};
  if(input?.characterPayoffRevision===REVISION) return {kind:'NOOP',reason:'character_payoff_revision_already_applied'};
  if(['QA_PASSED','AUTO_PUBLISH_READY','PUBLISHED'].includes(state?.state)) return {kind:'NOOP',reason:`publisher_owned_${state.state}`};
  if(state?.state!=='RENDERED') return {kind:'NOOP',reason:`state_${state?.state||'unknown'}`};
  if(state?.production?.qa_inputs_ready!==true) return {kind:'NOOP',reason:'render_not_qa_ready'};
  if(state?.production?.render_asset!==INSPECTED_STALE_RENDER) return {kind:'NOOP',reason:'render_asset_changed'};
  if(input?.visualGrade!=='publish-grade') return {kind:'NOOP',reason:'visual_input_not_publish_grade'};
  if(input?.illustratedSceneRevision!==REQUIRED_ILLUSTRATED_REVISION) return {kind:'NOOP',reason:'illustrated_v3_not_ready'};
  return {
    kind:'REBUILD',
    expectedRevision:Number(state.state_revision),
    episodeId:EPISODE_ID,
    transitionTo:'VOICE_READY',
    productionPatch:{render_asset:null,qa_inputs_ready:false},
    reason:'rerender after direct QA found stale payoff arithmetic in authored visuals and stick-only primary characters; apply character-payoff-v4',
  };
}

function runState(args){
  const r=spawnSync(process.execPath,['tools/episode-state.mjs',...args],{encoding:'utf8'});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function main(){
  if(!fs.existsSync(STATE_PATH)||!fs.existsSync(INPUT_PATH)){
    console.log('EPISODE1_CHARACTER_PAYOFF_V4_NOOP missing_state_or_input');
    return;
  }
  const state=readJson(STATE_PATH); const input=readJson(INPUT_PATH);
  const plan=planEpisode1CharacterPayoffV4Repair({state,input});
  if(plan.kind!=='REBUILD'){
    console.log(`EPISODE1_CHARACTER_PAYOFF_V4_${plan.kind} ${plan.reason}`);
    return;
  }
  writeJson(INPUT_PATH,applyCharacterPayoffV4Revision(input));
  const patched=runState(['patch',String(plan.expectedRevision),plan.episodeId,'episode1-character-payoff-v4-repair',JSON.stringify({production:plan.productionPatch})]);
  const transitioned=runState(['transition',String(patched.state_revision),plan.episodeId,plan.transitionTo,'episode1-character-payoff-v4-repair',plan.reason]);
  console.log(`EPISODE1_CHARACTER_PAYOFF_V4_READY revision=${transitioned.state_revision}`);
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{main();}catch(error){console.error(`EPISODE1_CHARACTER_PAYOFF_V4_ERROR ${error?.stack||String(error)}`);process.exitCode=1;}
}
