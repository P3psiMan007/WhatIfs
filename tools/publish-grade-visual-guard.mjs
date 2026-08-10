#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {EPISODE1_IMAGE_ASSET_REVISION,assertEpisode1ImageAssetCoverage,imageAssetsForScene} from '../video/src/episode1-image-assets.mjs';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,value)=>fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n');
const BLOCKER='publish_grade_visual_assets_missing';
const PROGRAMMATIC_SYSTEMS=new Set(['doodle-explainer-v1','doodle-explainer-v2','solar-storm-explainer-v1']);
const SOLAR_SEMANTIC_REVISION='solar-storm-semantic-v3';

function parseStamp(value){const m=String(value).trim().match(/(\d+):(\d+):(\d+),(\d+)/);if(!m)return NaN;return Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number(m[4])/1000;}
function stamp(seconds){let ms=Math.max(0,Math.round(Number(seconds)*1000));const h=Math.floor(ms/3600000);ms%=3600000;const m=Math.floor(ms/60000);ms%=60000;const s=Math.floor(ms/1000);ms%=1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;}

export function clampSrtToDuration(text,durationSeconds){const limit=Number(durationSeconds);if(!Number.isFinite(limit)||limit<=0)throw new Error('invalid caption clamp duration');const kept=[];for(const block of String(text||'').trim().split(/\r?\n\r?\n+/)){const lines=block.split(/\r?\n/);const timing=lines.findIndex((line)=>line.includes('-->'));if(timing<0)continue;const [from,to]=lines[timing].split('-->').map((v)=>v.trim());const start=parseStamp(from),end=parseStamp(to),body=lines.slice(timing+1).join(' ').replace(/\s+/g,' ').trim();if(!Number.isFinite(start)||!Number.isFinite(end)||!body||start>=limit)continue;const clampedEnd=Math.min(end,limit);if(clampedEnd<=start)continue;kept.push({start,end:clampedEnd,body});}return kept.map((cue,index)=>`${index+1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.body}`).join('\n\n')+(kept.length?'\n':'');}

function isProofBoundProgrammaticInput(input){
  if(input?.visualGrade!=='publish-grade'||!PROGRAMMATIC_SYSTEMS.has(input?.visualSystem))return false;
  if(input.visualSystem==='solar-storm-explainer-v1'&&input?.semanticVisualRevision!==SOLAR_SEMANTIC_REVISION)return false;
  const proof=input?.rendererProof;
  if(!Number.isInteger(Number(proof?.workflowRunId))||Number(proof.workflowRunId)<=0)return false;
  if(!/^sha256:[0-9a-f]{64}$/i.test(String(proof?.artifactDigest||'')))return false;
  const scenes=Array.isArray(input?.scenes)?input.scenes:[];
  if(scenes.length<5)return false;
  return scenes.every((scene)=>Boolean(scene?.id&&scene?.headline&&scene?.narration));
}

function isLegacyImageFirstInput(input){try{if(input?.visualGrade!=='publish-grade'||input?.imageFirstAssetRevision!==EPISODE1_IMAGE_ASSET_REVISION||input?.imageAssetManifest!=='episodes/current/image-assets-v1.json')return false;assertEpisode1ImageAssetCoverage((input.scenes||[]).map((scene)=>scene?.id));return input.scenes.every((scene)=>{const expected=imageAssetsForScene(scene.id);return !Object.hasOwn(scene,'visualAsset')&&Array.isArray(scene.imageAssets)&&scene.imageAssets.length===expected.length&&scene.imageAssets.every((asset,index)=>asset===expected[index]);});}catch{return false;}}

export function isPublishGradeVisualInput(input){return isProofBoundProgrammaticInput(input)||isLegacyImageFirstInput(input);}
function verifiedManifestPatch(input){if(isProofBoundProgrammaticInput(input))return {visualGrade:'publish-grade',visualSystem:input.visualSystem,rendererProofRunId:Number(input.rendererProof.workflowRunId),rendererProofDigest:input.rendererProof.artifactDigest,qaInputsReady:true,technicalPreview:false,publishBlocker:null};return {visualGrade:'publish-grade',imageFirstAssetRevision:EPISODE1_IMAGE_ASSET_REVISION,qaInputsReady:true,technicalPreview:false,publishBlocker:null};}

export function visualGuardDecision({state,input,manifest}){
  if(state?.state!=='RENDERED')return {kind:'NOOP',reason:'not_rendered'};
  const publishGrade=isPublishGradeVisualInput(input);
  if(publishGrade){const expected=verifiedManifestPatch(input);const proofStale=isProofBoundProgrammaticInput(input)&&(manifest?.visualSystem!==input.visualSystem||manifest?.rendererProofRunId!==Number(input.rendererProof.workflowRunId)||manifest?.rendererProofDigest!==input.rendererProof.artifactDigest);const staleBlocker=state?.qa?.user_action_required===BLOCKER||manifest?.qaInputsReady===false||manifest?.technicalPreview===true||manifest?.publishBlocker===BLOCKER||manifest?.visualGrade!=='publish-grade'||proofStale;if(staleBlocker)return {kind:'CLEAR',reason:'publish_grade_visuals_verified',patch:{production:{qa_inputs_ready:true},qa:{user_action_required:null}},manifestPatch:expected};return {kind:'READY',reason:'publish_grade_visuals_verified'};}
  const alreadyRecorded=state?.production?.qa_inputs_ready===false&&state?.qa?.user_action_required===BLOCKER&&manifest?.qaInputsReady===false&&manifest?.technicalPreview===true&&manifest?.publishBlocker===BLOCKER;if(alreadyRecorded)return {kind:'BLOCK_RECORDED',reason:BLOCKER};return {kind:'BLOCK',reason:BLOCKER,patch:{production:{qa_inputs_ready:false},qa:{user_action_required:BLOCKER}},manifestPatch:{visualGrade:input?.visualGrade||'heuristic-placeholder',qaInputsReady:false,technicalPreview:true,publishBlocker:BLOCKER}};
}

function runState(args){const r=spawnSync(process.execPath,['tools/episode-state.mjs',...args],{encoding:'utf8'});if(r.status!==0)throw new Error((r.stderr||r.stdout||'episode-state command failed').trim());return JSON.parse(r.stdout);}
function clampRenderedCaptions(){const videoPath='dist/episode.mp4',srtPath='public/narration.srt';if(!fs.existsSync(videoPath)||!fs.existsSync(srtPath))return;const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',videoPath],{encoding:'utf8'});if(probe.status!==0)throw new Error('caption clamp could not probe rendered episode duration');const duration=Number(String(probe.stdout||'').trim());const before=fs.readFileSync(srtPath,'utf8'),after=clampSrtToDuration(before,duration);fs.writeFileSync(srtPath,after);console.log(`CAPTION_CLAMP_OK duration=${duration.toFixed(3)}`);}
function main(){const statePath=process.env.EPISODE_STATE_PATH||'episodes/current/episode-state.json',inputPath=process.env.PRODUCTION_INPUT_PATH||'episodes/current/production-input.json',manifestPath=process.env.RENDER_MANIFEST_PATH||'episodes/current/render-manifest.json';if(!fs.existsSync(statePath)||!fs.existsSync(inputPath)){console.log('VISUAL_GUARD_NOOP missing_state_or_input');return;}const state=readJson(statePath),input=readJson(inputPath),manifest=fs.existsSync(manifestPath)?readJson(manifestPath):null;if(state?.state==='RENDERED')clampRenderedCaptions();const decision=visualGuardDecision({state,input,manifest});if(!['BLOCK','CLEAR'].includes(decision.kind)){console.log(`VISUAL_GUARD_${decision.kind} ${decision.reason}`);return;}runState(['patch',String(state.state_revision),state.episode_id,'publish-grade-visual-guard',JSON.stringify(decision.patch)]);if(manifest)writeJson(manifestPath,{...manifest,...decision.manifestPatch});if(decision.kind==='BLOCK')console.error(`VISUAL_GUARD_BLOCKED ${decision.reason}`);else console.log(`VISUAL_GUARD_CLEAR ${decision.reason}`);}
if(import.meta.url===`file://${process.argv[1]}`){try{main();}catch(error){console.error(`VISUAL_GUARD_ERROR ${error?.stack||String(error)}`);process.exitCode=1;}}
