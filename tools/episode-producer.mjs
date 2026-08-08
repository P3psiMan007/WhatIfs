#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => {
  fs.mkdirSync(path.dirname(p), {recursive: true});
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
};
const roundMs = (n) => Math.round(Number(n) * 1000) / 1000;

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
    experimentAssignment: 'baseline-dark-amber-v2',
    packages,
    pronunciationDictionary: [],
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

export function planProducerStage({state, inputReady, audioReady, renderReady}) {
  const name = state?.state;
  if (['RENDERED', 'QA_PASSED', 'AUTO_PUBLISH_READY', 'PUBLISHED'].includes(name)) return {kind: 'NOOP', reason: 'awaiting_qa'};
  if (!inputReady) return {kind: 'BLOCKED', reason: 'missing_production_input'};
  if (['SELECTED', 'RESEARCHED'].includes(name)) return {kind: 'SCRIPT'};
  if (['SCRIPTED', 'VOICE_AUDITIONS_READY', 'VOICE_SELECTED'].includes(name)) return audioReady ? {kind:'PROMOTE_VOICE'} : {kind:'NARRATE'};
  if (name === 'VOICE_READY') {
    if (!audioReady) return {kind:'NARRATE'};
    return renderReady ? {kind:'PROMOTE_RENDER'} : {kind:'RENDER'};
  }
  return {kind:'BLOCKED', reason:`unsupported_production_state:${name || 'null'}`};
}

export function parseSrt(text) {
  const toSeconds = (stamp) => {
    const match = String(stamp).trim().match(/(\d+):(\d+):(\d+),(\d+)/);
    if (!match) return NaN;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  };
  return String(text || '').trim().split(/\r?\n\r?\n+/).map((block)=>block.split(/\r?\n/)).map((lines)=>{
    const timingIndex = lines.findIndex((line)=>line.includes('-->'));
    if (timingIndex < 0) return null;
    const [from,to] = lines[timingIndex].split('-->').map((v)=>v.trim());
    const start = toSeconds(from); const end = toSeconds(to);
    const caption = lines.slice(timingIndex + 1).join(' ').replace(/\s+/g,' ').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || !caption) return null;
    return {start:roundMs(start), end:roundMs(end), text:caption};
  }).filter(Boolean);
}

function srtTimestamp(seconds) {
  const msTotal = Math.max(0, Math.round(Number(seconds) * 1000));
  const hours = Math.floor(msTotal / 3600000);
  const minutes = Math.floor((msTotal % 3600000) / 60000);
  const secs = Math.floor((msTotal % 60000) / 1000);
  const ms = msTotal % 1000;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}

export function formatSrt(cues) {
  return (cues || []).map((cue,index)=>`${index + 1}\n${srtTimestamp(cue.start)} --> ${srtTimestamp(cue.end)}\n${cue.text}\n`).join('\n');
}

export function countWords(scenes) {
  return scenes.reduce((n,scene)=>n + String(scene.narration || '').trim().split(/\s+/).filter(Boolean).length, 0);
}

export function buildNarrationBatchPayload(input) {
  return {
    voice: input?.narrator?.voice || 'am_michael',
    rate: input?.narrator?.rate || '+0%',
    scenes: (input?.scenes || []).map((scene) => ({id:scene.id, text:String(scene.narration || '').trim()})),
  };
}

export function buildNarrationBatchCommand(input, batchPath, outputDir) {
  buildNarrationBatchPayload(input);
  return {program:'edge-tts', args:['--batch-json',batchPath,'--output-dir',outputDir]};
}

export function buildExactSceneTimeline(parts) {
  let cursor = 0;
  const captions = [];
  const scenes = (parts || []).map((part)=>{
    const start = roundMs(cursor);
    const duration = roundMs(part.duration);
    for (const cue of part.cues || []) captions.push({start:roundMs(start + cue.start), end:roundMs(start + cue.end), text:cue.text});
    cursor += duration;
    return {...part.scene, start, duration};
  });
  return {scenes, captions, durationSeconds:roundMs(cursor)};
}

export function extractBeatCallout(text) {
  const source = String(text || '').replace(/\s+/g,' ').trim();
  const numberUnit = source.match(/\b(\d[\d,.]*)\s+(?:extra\s+)?(hours?|days?|years?|minutes?)\b/i);
  if (numberUnit) return `${numberUnit[1]} ${numberUnit[2].toUpperCase()}`;
  const wordUnit = source.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:extra\s+)?(hours?|days?|years?|minutes?)\b/i);
  if (wordUnit) return `${wordUnit[1].toUpperCase()} ${wordUnit[2].toUpperCase()}`;
  const clock = source.match(/\b(\d{1,2})\s*(a\.m\.|p\.m\.)\b/i);
  if (clock) return `${clock[1]} ${clock[2].toUpperCase()}`;
  if (/^no\s+/i.test(source)) {
    const firstClause = source.split(/[.!?]/)[0].trim();
    if (firstClause.split(/\s+/).length <= 5) return firstClause.toUpperCase();
  }
  if (/always awake/i.test(source)) return 'ALWAYS AWAKE';
  return null;
}

function visualForBeat(text, baseVisual, index) {
  const t = String(text || '').toLowerCase();
  if (/(brain|memory|attention|learning|decision|fog)/.test(t)) return 'brain';
  if (/(night|circadian|light-dark|morning|evening|2 a\.m|3 a\.m)/.test(t)) return 'sunmoon';
  if (/(business|city|airport|hospital|restaurant|delivery|gym|university|government|construction|district)/.test(t)) return 'city';
  if (/(boss|employer|workday|work|email|response|customer)/.test(t)) return index % 2 ? 'work' : 'scale';
  if (/(family|couple|home|bedroom|parents|child|baby|partners)/.test(t)) return 'split';
  if (/(hour|day|year|life|time|bedtime|sleep)/.test(t)) return index % 2 ? 'hourglass' : 'clock';
  const alternates = ['grid','clock','hourglass','brain'];
  return index % 3 === 0 ? baseVisual : alternates[index % alternates.length];
}

export function buildVisualBeats(scenes, captions, options = {}) {
  const minSeconds = Number(options.minSeconds || 3);
  const maxSeconds = Number(options.maxSeconds || 6);
  const beats = [];
  let globalIndex = 0;
  const pushBeat = (scene,start,end,text) => {
    const duration = roundMs(end - start);
    if (duration <= 0) return;
    beats.push({id:`${scene.id}-beat-${String(globalIndex + 1).padStart(3,'0')}`,start:roundMs(start),duration,sceneId:scene.id,sceneHeadline:scene.headline,text:String(text || '').trim(),callout:extractBeatCallout(text),visual:visualForBeat(text,scene.visual || 'grid',globalIndex),layout:globalIndex % 4});
    globalIndex += 1;
  };
  for (const scene of scenes || []) {
    const sceneStart = Number(scene.start || 0); const sceneEnd = sceneStart + Number(scene.duration || 0);
    const cues = (captions || []).filter((c)=>c.end > sceneStart && c.start < sceneEnd);
    if (!cues.length) {
      let start = sceneStart;
      while (start < sceneEnd - 0.001) { const end = Math.min(sceneEnd,start + maxSeconds); pushBeat(scene,start,end,scene.headline); start = end; }
      continue;
    }
    let pendingStart = null; let pendingEnd = null; let pendingTexts = [];
    const flush = () => { if (pendingStart == null || pendingEnd == null) return; pushBeat(scene,pendingStart,pendingEnd,pendingTexts.join(' ')); pendingStart = null; pendingEnd = null; pendingTexts = []; };
    for (const cue of cues) {
      const cueStart = Math.max(sceneStart,Number(cue.start)); const cueEnd = Math.min(sceneEnd,Number(cue.end)); const cueDuration = cueEnd - cueStart;
      if (cueDuration > maxSeconds) {
        flush();
        const segments = Math.ceil(cueDuration / maxSeconds); const segmentDuration = cueDuration / segments;
        for (let i=0;i<segments;i++) { const start = cueStart + i*segmentDuration; const end = i===segments-1 ? cueEnd : cueStart + (i+1)*segmentDuration; pushBeat(scene,start,end,cue.text); }
        continue;
      }
      if (pendingStart == null) { pendingStart = cueStart; pendingEnd = cueEnd; pendingTexts = [cue.text]; continue; }
      const projected = cueEnd - pendingStart;
      if (projected > maxSeconds) { flush(); pendingStart = cueStart; pendingEnd = cueEnd; pendingTexts = [cue.text]; }
      else { pendingEnd = cueEnd; pendingTexts.push(cue.text); if (pendingEnd - pendingStart >= minSeconds) flush(); }
    }
    flush();
  }
  return beats;
}

function runState(args) {
  const r = spawnSync(process.execPath, ['tools/episode-state.mjs', ...args], {encoding:'utf8'});
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'episode-state command failed').trim());
  return JSON.parse(r.stdout);
}

function run(cmd,args,options={}) {
  const r = spawnSync(cmd,args,{encoding:'utf8',...options});
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r;
}
function block(reason,details='') { console.error(`PRODUCER_BLOCKED ${reason}${details ? `: ${details}` : ''}`); process.exitCode = 2; }
function probeDuration(file) {
  const r = run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file]);
  if (r.status !== 0) throw new Error(`ffprobe duration failed for ${file}`);
  const value = Number(String(r.stdout || '').trim());
  if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid media duration for ${file}`);
  return value;
}
function probeVideo(file) {
  const r = run('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,codec_name','-show_entries','format=duration,size,bit_rate','-of','json',file]);
  if (r.status !== 0) throw new Error('ffprobe video failed');
  return JSON.parse(r.stdout);
}
function packagesForState(packages) { return {default:packages[0] || null,b:packages[1] || null,c:packages[2] || null}; }

function concatAudio(partPaths, outputPath, workDir) {
  const listPath = path.join(workDir,'concat.txt');
  const quote = (p) => path.resolve(p).replaceAll("'", "'\\''");
  fs.writeFileSync(listPath,partPaths.map((p)=>`file '${quote(p)}'`).join('\n') + '\n');
  const r = run('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',listPath,'-c:a','libmp3lame','-b:a','128k',outputPath]);
  if (r.status !== 0 || !fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1024) throw new Error('narration concat failed');
}

function generateNarration(input, publicDir) {
  const workDir = path.join(publicDir,'voice-parts');
  fs.rmSync(workDir,{recursive:true,force:true}); fs.mkdirSync(workDir,{recursive:true});
  const batchPath = path.join(workDir,'narration-batch.json');
  writeJson(batchPath,buildNarrationBatchPayload(input));
  const command = buildNarrationBatchCommand(input,batchPath,workDir);
  const tts = run(command.program,command.args);
  if (tts.status !== 0) throw new Error('batch narration generation failed');

  const parts = []; const partPaths = [];
  for (let index=0; index<input.scenes.length; index++) {
    const scene = input.scenes[index]; const stem = `scene-${String(index + 1).padStart(2,'0')}`;
    const partAudio = path.join(workDir,`${stem}.mp3`); const srtPath = path.join(workDir,`${stem}.srt`);
    if (!fs.existsSync(partAudio) || fs.statSync(partAudio).size < 1024) throw new Error(`narration generation failed for ${scene.id}`);
    const duration = probeDuration(partAudio); const cues = fs.existsSync(srtPath) ? parseSrt(fs.readFileSync(srtPath,'utf8')) : [];
    if (!cues.length) throw new Error(`narration subtitles missing for ${scene.id}`);
    parts.push({scene,duration,cues}); partPaths.push(partAudio);
  }
  const audioPath = path.join(publicDir,'narration.mp3'); const subtitlesPath = path.join(publicDir,'narration.srt');
  concatAudio(partPaths,audioPath,workDir);
  const combinedDuration = probeDuration(audioPath); const timeline = buildExactSceneTimeline(parts); const delta = roundMs(combinedDuration - timeline.durationSeconds);
  if (Math.abs(delta) > 1 && Math.abs(delta) / combinedDuration > 0.01) throw new Error(`concatenated narration duration drifted ${delta}s from measured scene total`);
  if (timeline.scenes.length && Math.abs(delta) > 0.001) { timeline.scenes[timeline.scenes.length - 1].duration = roundMs(timeline.scenes[timeline.scenes.length - 1].duration + delta); timeline.durationSeconds = roundMs(combinedDuration); }
  fs.writeFileSync(subtitlesPath,formatSrt(timeline.captions));
  return {...timeline,audioPath,subtitlesPath};
}

function makeContactSheet(outputPath,distDir,durationSeconds) {
  const fullPath = path.join(distDir,'contact-sheet.jpg'); const first30Path = path.join(distDir,'first-30s-contact-sheet.jpg'); const interval = Math.max(2,durationSeconds / 12);
  const full = run('ffmpeg',['-y','-v','error','-i',outputPath,'-vf',`fps=1/${interval.toFixed(3)},scale=480:-2,tile=4x3:padding=8:margin=8`,'-frames:v','1',fullPath]);
  if (full.status !== 0 || !fs.existsSync(fullPath)) throw new Error('full contact sheet failed');
  const first = run('ffmpeg',['-y','-v','error','-ss','0','-t','30','-i',outputPath,'-vf','fps=1/3,scale=384:-2,tile=5x2:padding=6:margin=6','-frames:v','1',first30Path]);
  if (first.status !== 0 || !fs.existsSync(first30Path)) throw new Error('first-30 contact sheet failed');
  return {fullPath,first30Path};
}

function main() {
  const statePath = process.env.EPISODE_STATE_PATH || 'episodes/current/episode-state.json';
  const inputPath = process.env.PRODUCTION_INPUT_PATH || 'episodes/current/production-input.json';
  const renderManifestPath = process.env.RENDER_MANIFEST_PATH || 'episodes/current/render-manifest.json';
  const publicDir='public'; const distDir='dist'; const audioPath=path.join(publicDir,'narration.mp3'); const renderDataPath=path.join(publicDir,'production.json'); const thumbnailPropsPath=path.join(publicDir,'thumbnail.json'); const outputPath=path.join(distDir,'episode.mp4'); const thumbnailPath=path.join(distDir,'thumbnail.png');
  const state = readJson(statePath);
  if (!fs.existsSync(inputPath)) {
    const scriptPath='episodes/current/script.md'; const researchPath='episodes/current/research.md';
    if (fs.existsSync(scriptPath) && fs.existsSync(researchPath)) { const derived = buildProductionInputFromArtifacts(state,fs.readFileSync(scriptPath,'utf8'),fs.readFileSync(researchPath,'utf8')); writeJson(inputPath,derived); console.log(`Derived ${inputPath} from durable script/research artifacts.`); }
  }
  const inputReady=fs.existsSync(inputPath); const audioReady=fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1024; const renderReady=fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1024;
  const plan=planProducerStage({state,inputReady,audioReady,renderReady});
  if (plan.kind==='NOOP') { console.log(`PRODUCER_NOOP ${plan.reason}`); return; }
  if (plan.kind==='BLOCKED') return block(plan.reason);
  const input=readJson(inputPath); const validationError=validateProductionInput(input,state); if (validationError) return block('invalid_production_input',validationError);
  let current=state;
  if (plan.kind==='SCRIPT') {
    const words=countWords(input.scenes); const selected=runState(['transition',String(current.state_revision),current.episode_id,'SCRIPTED','episode-producer','validated production input']); current=readJson(statePath);
    runState(['patch',String(selected.state_revision),current.episode_id,'episode-producer',JSON.stringify({growth:{packages:packagesForState(input.packages)},production:{script_words:words,estimated_duration_min:Number((words/155).toFixed(2)),pronunciation_dictionary:input.pronunciationDictionary || []}})]); current=readJson(statePath);
  }
  if (['SCRIPTED','VOICE_AUDITIONS_READY','VOICE_SELECTED','VOICE_READY'].includes(current.state) && (!fs.existsSync(audioPath) || fs.statSync(audioPath).size <= 1024)) {
    fs.mkdirSync(publicDir,{recursive:true}); const timeline=generateNarration(input,publicDir); const beats=buildVisualBeats(timeline.scenes,timeline.captions,{minSeconds:3,maxSeconds:6}); const maxBeat=Math.max(...beats.map((b)=>b.duration));
    if (!beats.length || maxBeat > 6.05) return block('visual_beat_density_failed',`max beat ${maxBeat}s`);
    const production={episodeId:input.episodeId,title:input.title,durationSeconds:timeline.durationSeconds,scenes:timeline.scenes,beats,palette:input.palette || {background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'},audio:'narration.mp3',captions:timeline.captions};
    writeJson(renderDataPath,production); writeJson(thumbnailPropsPath,{episodeId:input.episodeId,title:input.packages[0]?.title || input.title,thumbnailText:input.packages[0]?.thumbnailText || 'WHAT IF?',palette:production.palette,visual:'clock'});
    const patched=runState(['patch',String(current.state_revision),current.episode_id,'episode-producer',JSON.stringify({production:{voice_candidates:[input.narrator.voice],selected_voice:input.narrator.voice,voice_asset:`github-actions://run/${process.env.GITHUB_RUN_ID || 'local'}/artifact/episode-render/narration.mp3`}})]);
    if (current.state!=='VOICE_READY') runState(['transition',String(patched.state_revision),current.episode_id,'VOICE_READY','episode-producer','per-scene narration generated, concatenated, and probed']); current=readJson(statePath);
  }
  if (current.state==='VOICE_READY') {
    fs.mkdirSync(distDir,{recursive:true}); if (!fs.existsSync(renderDataPath)) return block('missing_render_data'); const production=readJson(renderDataPath);
    const render=run('npx',['remotion','render','video/src/index.jsx','WhatIfEpisode',outputPath,'--codec=h264','--crf=18','--pixel-format=yuv420p','--props',renderDataPath],{env:process.env});
    if (render.status!==0 || !fs.existsSync(outputPath) || fs.statSync(outputPath).size<1024) return block('render_failed');
    const thumb=run('npx',['remotion','still','video/src/index.jsx','WhatIfThumbnail',thumbnailPath,'--props',thumbnailPropsPath],{env:process.env});
    if (thumb.status!==0 || !fs.existsSync(thumbnailPath) || fs.statSync(thumbnailPath).size<1024) return block('thumbnail_render_failed');
    const technical=probeVideo(outputPath); const stream=technical.streams?.[0] || {}; if (Number(stream.width)!==1920 || Number(stream.height)!==1080) return block('render_dimension_mismatch');
    const contacts=makeContactSheet(outputPath,distDir,Number(technical.format?.duration || production.durationSeconds)); const beatDurations=production.beats.map((b)=>Number(b.duration)); const first30BeatCount=production.beats.filter((b)=>Number(b.start)<30).length;
    const manifest={episodeId:current.episode_id,generatedAt:new Date().toISOString(),githubRunId:process.env.GITHUB_RUN_ID || null,artifactName:'episode-render',filename:'episode.mp4',thumbnailFilename:'thumbnail.png',contactSheetFilename:path.basename(contacts.fullPath),first30ContactSheetFilename:path.basename(contacts.first30Path),title:input.title,description:input.description,packages:input.packages,chosenPackage:input.packages[0]?.id || 'A',experimentAssignment:input.experimentAssignment || 'control',technical,visualQa:{syncBasis:'measured-per-scene-audio',totalBeats:production.beats.length,first30BeatCount,maxBeatDuration:roundMs(Math.max(...beatDurations)),averageBeatDuration:roundMs(beatDurations.reduce((a,b)=>a+b,0)/beatDurations.length)},sourceCount:input.sources.length};
    writeJson(renderManifestPath,manifest); const patched=runState(['patch',String(current.state_revision),current.episode_id,'episode-producer',JSON.stringify({production:{render_asset:`github-actions://run/${process.env.GITHUB_RUN_ID || 'local'}/artifact/episode-render/episode.mp4`,qa_inputs_ready:true}})]);
    runState(['transition',String(patched.state_revision),current.episode_id,'RENDERED','episode-producer','1080p synchronized render, thumbnail, and contact sheets verified']);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (error) { block('producer_exception',error?.stack || String(error)); }
}
