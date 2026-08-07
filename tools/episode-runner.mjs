#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');

export function planNextAction({ state, controls, autonomy, topics, producerConfigured }) {
  if (controls?.pauseAllProduction === true) return { kind: 'NOOP', reason: 'pauseAllProduction' };

  const publisherStates = new Set([...(autonomy?.publishReadyStates || []), 'PUBLISHED']);
  if (publisherStates.has(state?.state)) return { kind: 'NOOP', reason: 'publisher_owned_state' };

  if (state?.state === 'IDLE' || state?.state === 'ANALYZED') {
    const topic = (topics || []).find((t) => t && t.enabled !== false && !t.consumedAt);
    if (!topic) return { kind: 'BLOCKED', reason: 'no_topics_queued' };
    return { kind: 'SELECT_TOPIC', topic };
  }

  if (!producerConfigured) return { kind: 'BLOCKED', reason: 'missing_production_provider' };
  return { kind: 'RUN_PRODUCER', episodeId: state?.episode_id, state: state?.state };
}

function writeStatus(statusPath, payload) {
  const prior = fs.existsSync(statusPath) ? readJson(statusPath) : { revision: 0 };
  writeJson(statusPath, {
    revision: Number(prior.revision || 0) + 1,
    updatedAt: new Date().toISOString(),
    ...payload,
  });
}

function runEpisodeState(args) {
  const r = spawnSync(process.execPath, ['tools/episode-state.mjs', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function main() {
  const statePath = process.env.EPISODE_STATE_PATH || 'episodes/current/episode-state.json';
  const autonomyPath = process.env.AUTONOMY_PATH || 'config/autonomy.json';
  const controlsPath = process.env.DAILY_CONTROL_PATH || 'queue/daily-control.json';
  const topicsPath = process.env.TOPIC_QUEUE_PATH || 'queue/topics.json';
  const statusPath = process.env.RUNNER_STATUS_PATH || 'queue/runner-status.json';

  for (const p of [statePath, autonomyPath, controlsPath, topicsPath]) {
    if (!fs.existsSync(p)) {
      writeStatus(statusPath, { kind: 'BLOCKED', reason: `missing_required_file:${p}` });
      console.error(`BLOCKED missing required file: ${p}`);
      process.exitCode = 2;
      return;
    }
  }

  const state = readJson(statePath);
  const autonomy = readJson(autonomyPath);
  const controls = readJson(controlsPath);
  const queue = readJson(topicsPath);
  const topics = Array.isArray(queue) ? queue : queue.topics || [];
  const producerCommand = process.env.EPISODE_PRODUCER_CMD?.trim() || '';
  const plan = planNextAction({ state, controls, autonomy, topics, producerConfigured: Boolean(producerCommand) });

  if (plan.kind === 'NOOP') {
    console.log(`NOOP ${plan.reason}`);
    return;
  }

  if (plan.kind === 'BLOCKED') {
    writeStatus(statusPath, { kind: plan.kind, reason: plan.reason, episodeId: state.episode_id, state: state.state, stateRevision: state.state_revision });
    console.error(`BLOCKED ${plan.reason}`);
    process.exitCode = 2;
    return;
  }

  if (plan.kind === 'SELECT_TOPIC') {
    const selected = runEpisodeState(['transition', String(state.state_revision), 'NEW', 'SELECTED', 'episode-factory', `selected topic ${plan.topic.id}`]);
    const patch = {
      growth: {
        topic_id: plan.topic.id,
        topic: plan.topic.topic,
        topic_source: plan.topic.source || 'queue',
        hook_promise: plan.topic.hookPromise || null,
      },
    };
    const patched = runEpisodeState(['patch', String(selected.state_revision), selected.episode_id, 'episode-factory', JSON.stringify(patch)]);
    const nextQueue = Array.isArray(queue) ? [...queue] : { ...queue, topics: [...topics] };
    const arr = Array.isArray(nextQueue) ? nextQueue : nextQueue.topics;
    const idx = arr.findIndex((t) => t.id === plan.topic.id);
    if (idx >= 0) arr[idx] = { ...arr[idx], consumedAt: new Date().toISOString(), episodeId: selected.episode_id };
    writeJson(topicsPath, nextQueue);
    writeStatus(statusPath, { kind: 'SELECTED', reason: null, episodeId: selected.episode_id, state: 'SELECTED', stateRevision: patched.state_revision, topicId: plan.topic.id });
    console.log(JSON.stringify({ kind: 'SELECTED', episode_id: selected.episode_id, topic_id: plan.topic.id }));
    return;
  }

  const result = spawnSync(producerCommand, { shell: true, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    writeStatus(statusPath, { kind: 'BLOCKED', reason: 'producer_failed', episodeId: state.episode_id, state: state.state, stateRevision: state.state_revision, exitCode: result.status });
    process.exitCode = result.status || 1;
    return;
  }
  writeStatus(statusPath, { kind: 'PRODUCER_RAN', reason: null, episodeId: state.episode_id, state: state.state, stateRevision: state.state_revision });
}

if (import.meta.url === `file://${process.argv[1]}`) main();
