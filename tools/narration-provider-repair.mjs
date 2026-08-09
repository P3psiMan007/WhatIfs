#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

// This repair deliberately contains no alternate narrator identifier.
const statePath = process.env.EPISODE_STATE_PATH || 'episodes/current/episode-state.json';
const inputPath = process.env.PRODUCTION_INPUT_PATH || 'episodes/current/production-input.json';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const runState = (args) => { const r = spawnSync(process.execPath, ['tools/episode-state.mjs', ...args], {stdio:'inherit'}); if (r.status !== 0) process.exit(r.status || 1); };
if (!fs.existsSync(statePath) || !fs.existsSync(inputPath)) process.exit(0);
let state = read(statePath); const input = read(inputPath);
const approvedVoice = 'af_heart'; const approvedSpeed = 0.95; const approvedFlow = 'continuous-v2';
const currentVoice = String(input?.narrator?.voice || ''); const currentSpeed = Number(input?.narrator?.speed); const currentFlow=String(input?.narrator?.flowVersion||''); const selectedVoice = String(state?.production?.selected_voice || '');
const needsRestore = currentVoice !== approvedVoice || currentSpeed !== approvedSpeed || currentFlow !== approvedFlow || (selectedVoice && selectedVoice !== approvedVoice);
if (!needsRestore) process.exit(0);
input.narrator = {provider:'kokoro', voice:approvedVoice, speed:approvedSpeed, locked:true, flowVersion:approvedFlow}; write(inputPath,input);
runState(['patch',String(state.state_revision),state.episode_id,'narrator-flow-repair',JSON.stringify({production:{voice_candidates:[approvedVoice],selected_voice:null,voice_asset:null,render_asset:null,qa_inputs_ready:false},qa:{status:'REWORK_REQUIRED',scores:{},top_issues:['The previous af_heart render used pauses and level that failed the user-approved narration-flow standard.'],required_fixes:['Regenerate af_heart at speed 0.95 with continuous-v2 pause compression and spoken-word loudness normalization, then independently review the exact render.'],user_action_required:null}})]);
state=read(statePath); if(state.state!=='SCRIPTED') runState(['transition',String(state.state_revision),state.episode_id,'SCRIPTED','narrator-flow-repair','invalidate old render once and regenerate continuous-v2 af_heart narration']);
