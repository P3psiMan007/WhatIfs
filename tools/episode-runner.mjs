#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');

export function resolveProducerCommand({ configured, builtInExists }) {
  const explicit = String(configured || '').trim();
  if (explicit) return explicit;
  return builtInExists ? 'node tools/episode-producer.mjs' : '';
}

export function extractProducerFailureReason(stderr = '') {
  const match = String(stderr).match(/PRODUCER_BLOCKED\s+([^:\s]+)/);
  return match?.[1] || null;
}

export function extractProducerFailureDetails(stderr = '') {
  const text = String(stderr || '').trim();
  if (!text) return null;
  const marker = text.lastIndexOf('PRODUCER_BLOCKED');
  const useful = marker >= 0 ? text.slice(marker) : text;
  return useful.slice(0, 1600);
}

export function planProductionInputRepair({ state, input }) {
  if (!input) return { kind: 'NOOP', reason: 'missing_input' };
  if (!state?.episode_id) return { kind: 'NOOP', reason: 'missing_episode_id' };
  if (input.episodeId === state.episode_id) return { kind: 'NOOP', reason: 'input_matches_episode' };
  return { kind: 'DELETE_STALE_INPUT', expectedEpisodeId: state.episode_id, staleEpisodeId: input.episodeId || null };
}

export function planNextAction({ state, controls, autonomy, topics, producerConfigured }) {
  if (controls?.pauseAllProduction === true) return { kind: 'NOOP', reason: 'pauseAllProduction' };
  const publisherStates = new Set([...(autonomy?.publishReadyStates || []), 'PUBLISHED']);
  if (publisherStates.has(state?.state)) return { kind: 'NOOP', reason: 'publisher_owned_state' };
  if (state?.state === 'RENDERED') {
    if (state?.production?.qa_inputs_ready !== true) return { kind: 'BLOCKED', reason: 'publish_grade_visual_assets_missing' };
    return { kind: 'NOOP', reason: 'awaiting_qa' };
  }
  if (state?.state === 'IDLE' || state?.state === 'ANALYZED') {
    const topic = (topics || []).find((t) => t && t.enabled !== false && !t.consumedAt);
    if (!topic) return { kind: 'BLOCKED', reason: 'no_topics_queued' };
    return { kind: 'SELECT_TOPIC', topic };
  }
  if (!producerConfigured) return { kind: 'BLOCKED', reason: 'missing_production_provider' };
  return { kind: 'RUN_PRODUCER', episodeId: state?.episode_id, state: state?.state };
}

export function sameStatus(prior, payload) {
  const keys = ['kind', 'reason', 'details', 'episodeId', 'state', 'stateRevision', 'topicId', 'exitCode'];
  return keys.every((key) => (prior?.[key] ?? null) === (payload?.[key] ?? null));
}

function writeStatus(statusPath, payload) {
  const prior = fs.existsSync(statusPath) ? readJson(statusPath) : { revision: 0 };
  if (sameStatus(prior, payload)) return false;
  writeJson(statusPath, {revision: Number(prior.revision || 0) + 1,updatedAt: new Date().toISOString(),...payload});
  return true;
}

function runEpisodeState(args) {
  const r = spawnSync(process.execPath, ['tools/episode-state.mjs', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function runOptionalTool(path,label) {
  if (!fs.existsSync(path)) return;
  const r = spawnSync(process.execPath,[path],{encoding:'utf8',env:process.env});
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || `${label} failed`).trim());
}

function runSafeNextEpisodeBootstrap() { runOptionalTool('tools/next-episode-bootstrap.mjs','next episode bootstrap'); }
function runSemanticVisualRepair() { runOptionalTool('tools/episode2-semantic-visual-rebuild.mjs','semantic visual rebuild'); }

function repairStaleProductionInput(state) {
  const inputPath = process.env.PRODUCTION_INPUT_PATH || 'episodes/current/production-input.json';
  if (!fs.existsSync(inputPath)) return;
  let input;
  try { input = readJson(inputPath); } catch { fs.rmSync(inputPath, {force:true}); console.log(`Removed unreadable ${inputPath}; producer will derive it from current script/research.`); return; }
  const repair = planProductionInputRepair({state, input});
  if (repair.kind !== 'DELETE_STALE_INPUT') return;
  fs.rmSync(inputPath, {force:true});
  console.log(`Removed stale production input for ${repair.staleEpisodeId || 'unknown'}; active episode is ${repair.expectedEpisodeId}.`);
}

function main() {
  const statePath = process.env.EPISODE_STATE_PATH || 'episodes/current/episode-state.json';
  const autonomyPath = process.env.AUTONOMY_PATH || 'config/autonomy.json';
  const controlsPath = process.env.DAILY_CONTROL_PATH || 'queue/daily-control.json';
  const topicsPath = process.env.TOPIC_QUEUE_PATH || 'queue/topics.json';
  const statusPath = process.env.RUNNER_STATUS_PATH || 'queue/runner-status.json';
  for (const p of [statePath, autonomyPath, controlsPath, topicsPath]) {
    if (!fs.existsSync(p)) {writeStatus(statusPath,{kind:'BLOCKED',reason:`missing_required_file:${p}`});console.error(`BLOCKED missing required file: ${p}`);process.exitCode=2;return;}
  }
  runSafeNextEpisodeBootstrap();
  runSemanticVisualRepair();
  const state = readJson(statePath);
  repairStaleProductionInput(state);
  const autonomy = readJson(autonomyPath);
  const controls = readJson(controlsPath);
  const queue = readJson(topicsPath);
  const topics = Array.isArray(queue) ? queue : queue.topics || [];
  const producerCommand = resolveProducerCommand({configured:process.env.EPISODE_PRODUCER_CMD,builtInExists:fs.existsSync('tools/episode-producer.mjs')});
  const plan = planNextAction({state, controls, autonomy, topics, producerConfigured:Boolean(producerCommand)});
  if (plan.kind === 'NOOP') {console.log(`NOOP ${plan.reason}`);return;}
  if (plan.kind === 'BLOCKED') {writeStatus(statusPath,{kind:plan.kind,reason:plan.reason,episodeId:state.episode_id,state:state.state,stateRevision:state.state_revision});console.error(`BLOCKED ${plan.reason}`);process.exitCode=2;return;}
  if (plan.kind === 'SELECT_TOPIC') {
    const selected=runEpisodeState(['transition',String(state.state_revision),'NEW','SELECTED','episode-factory',`selected topic ${plan.topic.id}`]);
    const patched=runEpisodeState(['patch',String(selected.state_revision),selected.episode_id,'episode-factory',JSON.stringify({growth:{topic_id:plan.topic.id,topic:plan.topic.topic,topic_source:plan.topic.source||'queue',hook_promise:plan.topic.hookPromise||null}})]);
    const nextQueue=Array.isArray(queue)?[...queue]:{...queue,topics:[...topics]};const arr=Array.isArray(nextQueue)?nextQueue:nextQueue.topics;const idx=arr.findIndex((t)=>t.id===plan.topic.id);if(idx>=0)arr[idx]={...arr[idx],consumedAt:new Date().toISOString(),episodeId:selected.episode_id};writeJson(topicsPath,nextQueue);writeStatus(statusPath,{kind:'SELECTED',reason:null,episodeId:selected.episode_id,state:'SELECTED',stateRevision:patched.state_revision,topicId:plan.topic.id});console.log(JSON.stringify({kind:'SELECTED',episode_id:selected.episode_id,topic_id:plan.topic.id}));return;
  }
  const result=spawnSync(producerCommand,{shell:true,encoding:'utf8',env:process.env});if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);const after=fs.existsSync(statePath)?readJson(statePath):state;
  if(result.status!==0){const reason=extractProducerFailureReason(result.stderr)||'producer_failed';const details=extractProducerFailureDetails(result.stderr);writeStatus(statusPath,{kind:'BLOCKED',reason,details,episodeId:after.episode_id,state:after.state,stateRevision:after.state_revision,exitCode:result.status});process.exitCode=result.status||1;return;}
  writeStatus(statusPath,{kind:'PRODUCER_RAN',reason:null,details:null,episodeId:after.episode_id,state:after.state,stateRevision:after.state_revision});
}

if (import.meta.url === `file://${process.argv[1]}`) main();
