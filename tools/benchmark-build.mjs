#!/usr/bin/env node
// Turn the measured narration manifest into render props + subtitles.
// Everything downstream (shot timing, captions, SRT, mix) is derived from the
// same measured numbers, so captions cannot drift from the audio and the SRT
// cannot outlive the picture.
import fs from 'node:fs';
import path from 'node:path';
import {HOOK_SHOTS, buildCaptionCues, buildShotFrames, findCoverageGaps, toSrt} from '../video/src/cinematic/shot-plan.mjs';

const audioDir = process.argv[2] || 'benchmark/audio';
const outDir = process.argv[3] || 'benchmark';
const fps = 30;

const manifest = JSON.parse(fs.readFileSync(path.join(audioDir, 'narration-manifest.json'), 'utf8'));
if (manifest.voice !== 'en-US-BrianNeural') {
  throw new Error(`Refusing to build: narrator is ${manifest.voice}, expected en-US-BrianNeural`);
}

// Round the film to a whole frame so audio, picture and subtitles share one end.
const durationInFrames = Math.round(manifest.narrationSeconds * fps);
const durationSeconds = durationInFrames / fps;

const captions = buildCaptionCues(manifest.cues, durationSeconds);
const frames = buildShotFrames(HOOK_SHOTS, fps, durationSeconds);
const gaps = findCoverageGaps(frames, fps, durationSeconds);
if (gaps.length) throw new Error(`Shot plan leaves uncovered frames: ${JSON.stringify(gaps)}`);

const lastShotStart = HOOK_SHOTS[HOOK_SHOTS.length - 1].start;
if (lastShotStart >= durationSeconds) throw new Error('Shot plan runs past the narration');

const props = {
  durationSeconds,
  captions,
  shots: HOOK_SHOTS,
};

fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, 'hook-props.json'), JSON.stringify(props, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'hook.srt'), toSrt(captions));

const longest = captions.reduce((max, cue) => Math.max(max, cue.text.length), 0);
console.log(`duration ${durationSeconds}s (${durationInFrames}f)  shots ${frames.length}  captions ${captions.length}`);
console.log(`longest caption ${longest} chars; last caption ends ${captions[captions.length - 1].end}s`);
for (const frame of frames) {
  console.log(`  ${String(frame.shotSeconds.toFixed(2)).padStart(5)}s  ${frame.id.padEnd(16)} ${frame.intent}`);
}
