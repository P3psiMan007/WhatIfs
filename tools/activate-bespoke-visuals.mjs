#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {SLEEP_SCENE_ASSETS,assertSleepVisualCoverage} from '../video/src/sleep-visual-registry.mjs';

const EPISODE_ID='20260807-episode';
const ACTOR='bespoke-visual-activation';
const INPUT_PATH=process.env.PRODUCTION_INPUT_PATH||'episodes/current/production-input.json';
const STATE_PATH=process.env.EPISODE_STATE_PATH||'episodes/current/episode-state.json';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

export function buildPublishGradeVisualInput(input){
  if(input?.episodeId!==EPISODE_ID) throw new Error(`episode mismatch: expected ${EPISODE_ID}, found ${input?.episodeId||'null'}`);
  const sceneIds=(input.scenes||[]).map((scene)=>scene?.id).filter(Boolean);
  assertSleepVisualCoverage(sceneIds);
  const scenes=input.scenes.map((scene)=>({...scene,visualAsset:SLEEP_SCENE_ASSETS[scene.id]}));
  return {...input,visualGrade:'publish-grade',scenes};
}

export function shouldInvalidateTechnicalPreview(state){
  return state?.episode_id===EPISODE_ID
    && state?.state==='RENDERED'
    && state?.production?.qa_inputs_ready===false
    && typeof state?.production?.render_asset==='string'
    && state.production.render_asset.length>0;
}

function verifyAssetFiles(){
  for(const [sceneId,asset] of Object.entries(SLEEP_SCENE_ASSETS)){
    const full=`public/${asset}`;
    if(!fs.existsSync(full)) throw new Error(`missing scene art ${sceneId}: ${full}`);
    if(fs.statSync(full).size<=300) throw new Error(`scene art is not substantive ${sceneId}: ${full}`);
  }
}

function runState(args){
  const r=spawnSync(process.execPath,['tools/episode-state.mjs',...args],{encoding:'utf8'});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function main(){
  if(!fs.existsSync(INPUT_PATH)||!fs.existsSync(STATE_PATH)){
    console.log('BESPOKE_VISUAL_NOOP missing_input_or_state');
    return;
  }
  verifyAssetFiles();
  const input=readJson(INPUT_PATH);
  if(input.episodeId!==EPISODE_ID){
    console.log(`BESPOKE_VISUAL_NOOP episode_${input.episodeId||'null'}`);
    return;
  }
  const nextInput=buildPublishGradeVisualInput(input);
  if(JSON.stringify(nextInput)!==JSON.stringify(input)) writeJson(INPUT_PATH,nextInput);

  const state=readJson(STATE_PATH);
  if(!shouldInvalidateTechnicalPreview(state)){
    console.log('BESPOKE_VISUAL_READY input_verified_no_state_reset');
    return;
  }
  const patched=runState(['patch',String(state.state_revision),state.episode_id,ACTOR,JSON.stringify({production:{render_asset:null,qa_inputs_ready:false}})]);
  const transitioned=runState(['transition',String(patched.state_revision),state.episode_id,'VOICE_READY',ACTOR,'supersede heuristic technical preview with bespoke nine-scene visual rebuild']);
  console.log(`BESPOKE_VISUAL_ACTIVATED revision=${transitioned.state_revision}`);
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{main();}catch(error){console.error(`BESPOKE_VISUAL_ERROR ${error?.stack||String(error)}`);process.exitCode=1;}
}
