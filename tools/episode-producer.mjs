#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => {
  fs.mkdirSync(path.dirname(p), {recursive: true});
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
};

function sentenceCaseTopic(topic) {
  const raw = String(topic || 'What if this changed?').trim();
  if (!raw) return 'What If This Changed?';
  const withoutQuestion = raw.replace(/\?+$/, '');
  return withoutQuestion.charAt(0).toUpperCase() + withoutQuestion.slice(1) + '?';
}

function visualForHeading(heading) {
  const h = String(heading || '').toLowerCase();
  if (/(hook|time|bedtime|boundary)/.test(h)) return 'clock';
  if (/(memory|sleep is doing|brain)/.test(h)) return 'brain';
  if (/(night|circadian)/.test(h)) return 'sunmoon';
  if (/(economy|city|business)/.test(h)) return 'city';
  if (/(work|boss|job)/.test(h)) return 'work';
  if (/(home|relationship|family|couple)/.test(h)) return 'split';
  if (/(payoff|second life|life)/.test(h)) return 'hourglass';
  return 'grid';
}

export function buildProductionInputFromArtifacts(state, scriptText, researchText) {
  const topic = state?.growth?.topic || 'What if this changed?';
  const titleLine = String(scriptText || '').split(/\r?\n/).find((line) => /^#\s+Script\s+[—-]/i.test(line));
  const extractedTitle = titleLine ? titleLine.replace(/^#\s+Script\s+[—-]\s*/i, '').trim() : topic;
  const sections = [];
  const lines = String(scriptText || '').split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      const rawHeading = m[1].trim();
      const headingParts = rawHeading.split(/\s+[—-]\s+/);
      const heading = (headingParts[headingParts.length - 1] || 'Scene').trim();
      current = {heading, body: []};
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) sections.push(current);
  const scenes = sections.map((section, index) => {
    const narration = section.body
      .filter((line) => !/^\s*\*\*/.test(line))
      .join(' ')
      .replace(/[*_`>#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      id: `scene-${String(index + 1).padStart(2, '0')}`,
      headline: section.heading.toUpperCase().replace(/[^A-Z0-9 ?!'’-]/g, '').slice(0, 46) || `SCENE ${index + 1}`,
      subhead: index === 0 ? 'A What If Explains thought experiment' : null,
      visual: visualForHeading(section.heading),
      narration,
    };
  }).filter((scene) => scene.narration);
  const urls = [...new Set((String(researchText || '').match(/https?:\/\/[^\s)]+/g) || []).map((url) => url.replace(/[.,;]+$/, '')))];
  const baseTitle = sentenceCaseTopic(extractedTitle);
  const lower = baseTitle.toLowerCase();
  const sleepTopic = lower.includes('sleep');
  const packages = sleepTopic ? [
    {id:'A', title:'What If Humans Never Needed Sleep?', thumbnailText:'8 HOURS BACK', thumbnailConcept:'A glowing clock with one-third of the day opening into empty space.'},
    {id:'B', title:'What If You Never Had to Sleep Again?', thumbnailText:'NO MORE SLEEP', thumbnailConcept:'An awake figure centered between day and night with no bed visible.'},
    {id:'C', title:'A World Without Sleep Would Change Everything', thumbnailText:'24 HOURS AWAKE', thumbnailConcept:'A bright 24-hour city wrapped by a full-day clock.'},
  ] : [
    {id:'A', title:baseTitle, thumbnailText:'WHAT IF?', thumbnailConcept:'One bold visual contradiction that accurately represents the premise.'},
    {id:'B', title:`What Would Happen If ${baseTitle.replace(/^What if\s+/i,'').replace(/\?$/,'')}?`, thumbnailText:'THEN WHAT?', thumbnailConcept:'Before-versus-after split showing the central consequence.'},
    {id:'C', title:`The Strange Reality of ${baseTitle.replace(/^What if\s+/i,'').replace(/\?$/,'')}`, thumbnailText:'EVERYTHING CHANGES', thumbnailConcept:'A single iconic object altered by the premise.'},
  ];
  return {
    episodeId: state?.episode_id,
    title: packages[0].title,
    description: `A factual thought experiment from What If Explains: ${topic} Sources and caveats are preserved in the episode research ledger.`,
    narrator: {voice:'en-US-BrianNeural', rate:'+4%'},
    palette: {background:'#0b0d12', foreground:'#eae7e1', accent:'#ffb340'},
    experimentAssignment: 'baseline-dark-amber-v1',
    packages,
    pronunciationDictionary: [],
    visualGrade: 'heuristic-placeholder',
    sources: urls.map((url) => ({url, claims:['See durable research ledger for verified claim and safe-use context.']})),
    scenes,
  };
}

export function validateProductionInput(input, state) {
  if (!input || typeof input !== 'object') return 'production input must be an object';
  if (!input.episodeId || input.episodeId !== state?.episode_id) return `episode mismatch: input ${input.episodeId || 'null'} state ${state?.episode_id || 'null'}`;
  if (!input.title || typeof input.title !== 'string') return 'title is required';
  if (!input.description || typeof input.description !== 'string') return 'description is required';
  if (!Array.isArray(input.packages) || input.packages.length < 1) return 'at least 1 packaging hypothesis is required';
  if (!Array.isArray(input.scenes) || input.scenes.length < 2) return 'at least 2 scenes are required';
  for (const [index, scene] of input.scenes.entries()) {
    if (!scene?.id || !scene?.headline || !scene?.narration) return `scene ${index + 1} requires id, headline, and narration`;
  }
  if (!Array.isArray(input.sources) || input.sources.length < 1) return 'at least 1 factual source is required';
  if (!input.narrator?.voice) return 'narrator.voice is required';
  return null;
}

export function isPublishGradeVisualInput(input) {
  return input?.visualGrade === 'publish-grade'
    && Array.isArray(input?.scenes)
    && input.scenes.length >= 2
    && input.scenes.every((scene) => typeof scene?.visualAsset === 'string' && scene.visualAsset.trim().length > 0);
}

export function planProducerStage({state, inputReady, audioReady, renderReady}) {
  const name = state?.state;
  if (['RENDERED', 'QA_PASSED', 'AUTO_PUBLISH_READY', 'PUBLISHED'].includes(name)) return {kind: 'NOOP', reason: 'awaiting_qa'};
  if (!inputReady) return {kind: 'BLOCKED', reason: 'missing_production_input'};
  if (['SELECTED', 'RESEARCHED'].includes(name)) return {kind: 'SCRIPT'};
  if (['SCRIPTED', 'VOICE_AUDITIONS_READY', 'VOICE_SELECTED'].includes(name)) {
    return audioReady ? {kind: 'PROMOTE_VOICE'} : {kind: 'NARRATE'};
  }
  if (name === 'VOICE_READY') {
    if (!audioReady) return {kind: 'NARRATE'};
    return renderReady ? {kind: 'PROMOTE_RENDER'} : {kind: 'RENDER'};
  }
  return {kind: 'BLOCKED', reason: `unsupported_production_state:${name || 'null'}`};
}

export function parseSrt(text) {
  const toSeconds = (stamp) => {
    const match = String(stamp).trim().match(/(\d+):(\d+):(\d+),(\d+)/);
    if (!match) return NaN;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  };
  return String(text || '')
    .trim()
    .split(/\r?\n\r?\n+/)
    .map((block) => block.split(/\r?\n/))
    .map((lines) => {
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingIndex < 0) return null;
      const [from, to] = lines[timingIndex].split('-->').map((v) => v.trim());
      const start = toSeconds(from);
      const end = toSeconds(to);
      const caption = lines.slice(timingIndex + 1).join(' ').replace(/\s+/g, ' ').trim();
      if (!Number.isFinite(start) || !Number.isFinite(end) || !caption) return null;
      return {start, end, text: caption};
    })
    .filter(Boolean);
}

export function countWords(scenes) {
  return scenes.reduce((n, scene) => n + String(scene.narration || '').trim().split(/\s+/).filter(Boolean).length, 0);
}

export function allocateSceneTimings(scenes, durationSeconds) {
  const weights = scenes.map((scene) => Math.max(1, String(scene.narration || '').trim().split(/\s+/).filter(Boolean).length));
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  return scenes.map((scene, index) => {
    const duration = index === scenes.length - 1 ? durationSeconds - cursor : durationSeconds * (weights[index] / total);
    const result = {...scene, start: cursor, duration: Math.max(0.1, duration)};
    cursor += duration;
    return result;
  });
}

function runState(args) {
  const r = spawnSync(process.execPath, ['tools/episode-state.mjs', ...args], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function run(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, {encoding: 'utf8', ...options});
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r;
}

function block(reason, details = '') {
  console.error(`PRODUCER_BLOCKED ${reason}${details ? `: ${details}` : ''}`);
  process.exitCode = 2;
}

function probeDuration(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]);
  if (r.status !== 0) throw new Error('ffprobe duration failed');
  const value = Number(String(r.stdout || '').trim());
  if (!Number.isFinite(value) || value <= 0) throw new Error('invalid media duration');
  return value;
}

function probeVideo(file) {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-show_entries', 'format=duration,size', '-of', 'json', file]);
  if (r.status !== 0) throw new Error('ffprobe video failed');
  return JSON.parse(r.stdout);
}

function packagesForState(packages) {
  return {
    default: packages[0] || null,
    b: packages[1] || null,
    c: packages[2] || null,
  };
}

function main() {
  const statePath = process.env.EPISODE_STATE_PATH || 'episodes/current/episode-state.json';
  const inputPath = process.env.PRODUCTION_INPUT_PATH || 'episodes/current/production-input.json';
  const renderManifestPath = process.env.RENDER_MANIFEST_PATH || 'episodes/current/render-manifest.json';
  const publicDir = 'public';
  const distDir = 'dist';
  const audioPath = path.join(publicDir, 'narration.mp3');
  const subtitlesPath = path.join(publicDir, 'narration.srt');
  const renderDataPath = path.join(publicDir, 'production.json');
  const outputPath = path.join(distDir, 'episode.mp4');

  const state = readJson(statePath);
  if (!fs.existsSync(inputPath)) {
    const scriptPath = 'episodes/current/script.md';
    const researchPath = 'episodes/current/research.md';
    if (fs.existsSync(scriptPath) && fs.existsSync(researchPath)) {
      const derived = buildProductionInputFromArtifacts(
        state,
        fs.readFileSync(scriptPath, 'utf8'),
        fs.readFileSync(researchPath, 'utf8'),
      );
      writeJson(inputPath, derived);
      console.log(`Derived ${inputPath} from durable script/research artifacts.`);
    }
  }
  const inputReady = fs.existsSync(inputPath);
  const audioReady = fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1024;
  const renderReady = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1024;
  const plan = planProducerStage({state, inputReady, audioReady, renderReady});

  if (plan.kind === 'NOOP') {
    console.log(`PRODUCER_NOOP ${plan.reason}`);
    return;
  }
  if (plan.kind === 'BLOCKED') return block(plan.reason);

  const input = readJson(inputPath);
  const validationError = validateProductionInput(input, state);
  if (validationError) return block('invalid_production_input', validationError);

  let current = state;
  if (plan.kind === 'SCRIPT') {
    const words = countWords(input.scenes);
    const selected = runState(['transition', String(current.state_revision), current.episode_id, 'SCRIPTED', 'episode-producer', 'validated production input']);
    current = readJson(statePath);
    runState(['patch', String(selected.state_revision), current.episode_id, 'episode-producer', JSON.stringify({
      growth: {packages: packagesForState(input.packages)},
      production: {
        script_words: words,
        estimated_duration_min: Number((words / 155).toFixed(2)),
        pronunciation_dictionary: input.pronunciationDictionary || [],
      },
    })]);
    current = readJson(statePath);
  }

  if (['SCRIPTED', 'VOICE_AUDITIONS_READY', 'VOICE_SELECTED', 'VOICE_READY'].includes(current.state) && (!fs.existsSync(audioPath) || fs.statSync(audioPath).size <= 1024)) {
    fs.mkdirSync(publicDir, {recursive: true});
    const narrationText = input.scenes.map((scene) => scene.narration.trim()).join('\n\n');
    fs.writeFileSync(path.join(publicDir, 'narration.txt'), narrationText + '\n');
    const rate = input.narrator.rate || '+0%';
    const tts = run('edge-tts', ['--file', path.join(publicDir, 'narration.txt'), '--voice', input.narrator.voice, '--rate', rate, '--write-media', audioPath, '--write-subtitles', subtitlesPath]);
    if (tts.status !== 0 || !fs.existsSync(audioPath) || fs.statSync(audioPath).size < 1024) return block('narration_generation_failed');
    const durationSeconds = probeDuration(audioPath);
    const production = {
      episodeId: input.episodeId,
      title: input.title,
      durationSeconds,
      scenes: allocateSceneTimings(input.scenes, durationSeconds),
      palette: input.palette || {background:'#0b0d12', foreground:'#eae7e1', accent:'#ffb340'},
      audio: 'narration.mp3',
      captions: parseSrt(fs.readFileSync(subtitlesPath, 'utf8')),
    };
    writeJson(renderDataPath, production);
    const patched = runState(['patch', String(current.state_revision), current.episode_id, 'episode-producer', JSON.stringify({
      production: {
        voice_candidates: [input.narrator.voice],
        selected_voice: input.narrator.voice,
        voice_asset: `github-actions://run/${process.env.GITHUB_RUN_ID || 'local'}/artifact/episode-render/narration.mp3`,
      },
    })]);
    if (current.state !== 'VOICE_READY') {
      runState(['transition', String(patched.state_revision), current.episode_id, 'VOICE_READY', 'episode-producer', 'narration generated and probed']);
    }
    current = readJson(statePath);
  }

  if (current.state === 'VOICE_READY') {
    fs.mkdirSync(distDir, {recursive: true});
    if (!fs.existsSync(renderDataPath)) return block('missing_render_data');
    const render = run('npx', ['remotion', 'render', 'video/src/index.jsx', 'WhatIfEpisode', outputPath, '--codec=h264', '--crf=18', '--pixel-format=yuv420p', '--props', renderDataPath], {env: process.env});
    if (render.status !== 0 || !fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1024) return block('render_failed');
    const technical = probeVideo(outputPath);
    const stream = technical.streams?.[0] || {};
    if (Number(stream.width) !== 1920 || Number(stream.height) !== 1080) return block('render_dimension_mismatch');
    const publishGradeVisuals = isPublishGradeVisualInput(input);
    const manifest = {
      episodeId: current.episode_id,
      generatedAt: new Date().toISOString(),
      githubRunId: process.env.GITHUB_RUN_ID || null,
      artifactName: 'episode-render',
      filename: 'episode.mp4',
      title: input.title,
      description: input.description,
      packages: input.packages,
      chosenPackage: input.packages[0]?.id || 'A',
      experimentAssignment: input.experimentAssignment || 'control',
      visualGrade: input.visualGrade || 'unknown',
      qaInputsReady: publishGradeVisuals,
      technical,
      sourceCount: input.sources.length,
    };
    writeJson(renderManifestPath, manifest);
    const patched = runState(['patch', String(current.state_revision), current.episode_id, 'episode-producer', JSON.stringify({
      production: {
        render_asset: `github-actions://run/${process.env.GITHUB_RUN_ID || 'local'}/artifact/episode-render/episode.mp4`,
        qa_inputs_ready: publishGradeVisuals,
      },
      qa: {
        user_action_required: publishGradeVisuals ? null : 'publish_grade_visual_assets_missing',
      },
    })]);
    const reason = publishGradeVisuals
      ? '1080p publish-grade render completed and ffprobe verified'
      : '1080p technical preview completed; publish-grade visual assets still required';
    runState(['transition', String(patched.state_revision), current.episode_id, 'RENDERED', 'episode-producer', reason]);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (error) { block('producer_exception', error?.stack || String(error)); }
}
