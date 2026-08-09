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

const approvedVoice = 'en-US-BrianNeural';
const currentVoice = String(input?.narrator?.voice || '');
const selectedVoice = String(state?.production?.selected_voice || '');
const needsRestore = currentVoice !== approvedVoice || selectedVoice !== approvedVoice || state?.qa?.status === 'QA_PASSED';
if (!needsRestore) process.exit(0);

input.narrator = {
  provider: 'edge-tts',
  voice: approvedVoice,
  rate: '+4%',
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
      'Previous render silently substituted an unapproved narrator for the locked narrator.',
      'Previous render composited procedural doodles over already-composed authored scene artwork.'
    ],
    required_fixes: [
      'Regenerate narration with the exact locked narrator en-US-BrianNeural; do not substitute another voice.',
      'Regenerate video with one visual owner per beat and independently review the exact render before any publication action.'
    ],
    user_action_required: null
  }
})]);
state = read(statePath);
if (state.state !== 'SCRIPTED') {
  runState(['transition', String(state.state_revision), state.episode_id, 'SCRIPTED', 'narrator-voice-lock-repair', 'invalidate rejected render and restore exact approved narrator']);
}
