import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const episode = fs.readFileSync('video/src/what-if-episode.jsx','utf8');
const cinematic = fs.readFileSync('video/src/cinematic-full-episode.jsx','utf8');
const narratorRepair = fs.readFileSync('tools/narration-provider-repair.mjs','utf8');
const narrator = fs.readFileSync('tools/edge-tts','utf8');
const workflow = fs.readFileSync('.github/workflows/episode-factory.yml','utf8');

test('episode has exactly one cinematic visual owner per beat and does not mount rejected SVG renderer', () => {
  assert.match(episode, /CinematicEpisodeScene/);
  assert.match(episode, /data-visual-owner="cinematic-single"/);
  assert.doesNotMatch(episode, /SleepAssetScene|SleepScene\b|HookHoursContrastOverlay/);
  assert.match(cinematic, /data-visual-owner="cinematic-single"/);
  assert.doesNotMatch(cinematic, /visualAsset|\.svg/);
});

test('factory restores the exact approved af_heart narrator with no silent fallback', () => {
  assert.match(narratorRepair, /approvedVoice\s*=\s*['"]af_heart['"]/);
  assert.match(narratorRepair, /approvedSpeed\s*=\s*0\.95/);
  assert.match(narrator, /LOCKED_VOICE\s*=\s*"af_heart"/);
  assert.match(narrator, /LOCKED_SPEED\s*=\s*0\.95/);
  assert.match(narrator, /pipeline\(text, voice=LOCKED_VOICE, speed=LOCKED_SPEED\)/);
  assert.doesNotMatch(narrator, /am_michael/);
  assert.match(workflow, /kokoro==0\.9\.4/);
  assert.doesNotMatch(workflow, /edge-tts==7\.2\.8/);
});
