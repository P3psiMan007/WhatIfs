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
const alreadyKokoro = input?.narrator?.provider === 'kokoro-82m' && String(input?.narrator?.voice || '').startsWith('am_');
const legacyVoice = String(state?.production?.selected_voice || '').includes('Neural') || String(input?.narrator?.voice || '').includes('Neural');
if (alreadyKokoro && !legacyVoice) process.exit(0);

input.narrator = {
  provider: 'kokoro-82m',
  model: 'hexgrad/Kokoro-82M',
  license: 'Apache-2.0',
  voice: 'am_michael',
  rate: '+4%'
};
write(inputPath, input);

runState(['patch', String(state.state_revision), state.episode_id, 'critic-qa-self-heal', JSON.stringify({
  production: {
    voice_candidates: ['kokoro-82m/am_michael'],
    selected_voice: null,
    voice_asset: null,
    render_asset: null,
    qa_inputs_ready: false
  },
  qa: {
    status: 'REWORK_REQUIRED',
    scores: {},
    top_issues: ['Prior narration provider lacked sufficiently explicit commercial-use evidence and payoff delivery was rushed.'],
    required_fixes: ['Regenerate narration with Apache-2.0 Kokoro-82M at the slower documentary pacing preset, regenerate captions/render, then independently review changed artifacts.'],
    user_action_required: null
  }
})]);
state = read(statePath);
runState(['transition', String(state.state_revision), state.episode_id, 'SCRIPTED', 'critic-qa-self-heal', 'invalidate legacy narration/render for Apache-2.0 Kokoro rebuild']);
