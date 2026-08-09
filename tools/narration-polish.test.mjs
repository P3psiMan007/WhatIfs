import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clampSrtToDuration} from './publish-grade-visual-guard.mjs';

test('locked narrator compresses only long internal pauses and rejects empty generated audio',()=>{
  const shim=fs.readFileSync('tools/edge-tts','utf8');
  assert.match(shim,/LOCKED_VOICE\s*=\s*"af_heart"/);
  assert.match(shim,/LOCKED_SPEED\s*=\s*0\.95/);
  assert.match(shim,/stop_duration=0\.35/);
  assert.match(shim,/stop_silence=0\.12/);
  assert.match(shim,/stop_threshold=-42dB/);
  assert.match(shim,/raw_audio\.size\s*==\s*0/);
  assert.doesNotMatch(shim,/am_michael|parts\.append\(silence\)|sentence_pauses/);
});

test('scene narration is normalized to a YouTube-friendly spoken-word target',()=>{
  const shim=fs.readFileSync('tools/edge-tts','utf8');
  assert.match(shim,/loudnorm=I=-18:TP=-1\.5:LRA=7/);
});

test('final SRT cue cannot extend beyond the exact video duration',()=>{
  const input='1\n00:00:00,000 --> 00:00:02,000\nA\n\n2\n00:00:09,500 --> 00:00:10,400\nB\n\n3\n00:00:10,100 --> 00:00:11,000\noutside\n';
  const output=clampSrtToDuration(input,10);
  assert.match(output,/00:00:09,500 --> 00:00:10,000/);
  assert.doesNotMatch(output,/outside/);
  assert.doesNotMatch(output,/00:00:10,400/);
});
