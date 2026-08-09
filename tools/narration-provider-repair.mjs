#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const statePath = process.env.EPISODE_STATE_PATH || 'episodes/current/episode-state.json';
const inputPath = process.env.PRODUCTION_INPUT_PATH || 'episodes/current/production-input.json';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const runState = (args) => {
  const r = spawnSync(process.execPath, ['tools/episode-state.mjs', ...args], {stdio:'inherit'});
  if (r.status !== 0) process.exit(r.status || 1);
};

if (!fs.existsSync(statePath) || !fs.existsSync(inputPath)) process.exit(0);
let state = read(statePath);
const input = read(inputPath);

const approvedVoice = 'af_heart';
const approvedRate = '0.95';
const currentVoice = String(input?.narrator?.voice || '');
const currentRate = String(input?.narrator?.rate || '');
const selectedVoice = String(state?.production?.selected_voice || '');
const needsRestore = currentVoice !== approvedVoice || currentRate !== approvedRate || (selectedVoice && selectedVoice !== approvedVoice);
if (!needsRestore) process.exit(0);

input.narrator = {
  provider: 'kokoro',
  voice: approvedVoice,
  rate: approvedRate,
  locked: true
};
write(inputPath, input);

runState(['patch', String(state.state_revision), state.episode_id, 'narrator-voice-lock-repair', JSON.stringify({
  production: {
    voice_candidates: [approvedVoice],
    selected_voice: null,
    voice_asset: null,
    render_asset: null,
    qa_inputs_ready: false
  },
  qa: {
    status: 'REWORK_REQUIRED',
    scores: {},
    top_issues: [
      'Previous render used a rejected narrator instead of the approved female Kokoro narrator.',
      'Previous render is invalid for final publication until narration and visuals are rebuilt in the approved cinematic style.'
    ],
    required_fixes: [
      'Regenerate narration with Kokoro af_heart at speed 0.95 with no narrator fallback.',
      'Regenerate the video in the approved cinematic benchmark style and independently inspect the exact render before publication.'
    ],
    user_action_required: null
  }
})]);
state = read(statePath);
if (state.state !== 'SCRIPTED') {
  runState(['transition', String(state.state_revision), state.episode_id, 'SCRIPTED', 'narrator-voice-lock-repair', 'invalidate rejected render and restore approved af_heart narrator']);
}
