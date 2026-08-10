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

test('finished Episode 1 stays cinematic while future episodes default to the pro doodle renderer', () => {
  assert.match(episode, /LEGACY_CINEMATIC_EPISODE_ID\s*=\s*['"]20260807-episode['"]/);
  assert.match(episode, /props\.episodeId===LEGACY_CINEMATIC_EPISODE_ID/);
  assert.match(episode, /doodle-explainer-v2/);
  assert.match(episode, /DoodleExplainerScenePro/);
});

test('future thumbnails use package text and doodle art instead of the sleep-specific 8 HOURS BACK plate', () => {
  assert.match(episode, /props\.thumbnailText/);
  assert.match(episode, /DoodleExplainerScenePro/);
  assert.match(episode, /legacyEpisode/);
});

test('factory restores the exact approved af_heart narrator with continuous-v2 flow and no silent fallback', () => {
  assert.match(narratorRepair, /approvedVoice\s*=\s*['"]af_heart['"]/);
  assert.match(narratorRepair, /approvedSpeed\s*=\s*0\.95/);
  assert.match(narratorRepair, /approvedFlow\s*=\s*['"]continuous-v2['"]/);
  assert.match(narrator, /LOCKED_VOICE\s*=\s*"af_heart"/);
  assert.match(narrator, /LOCKED_SPEED\s*=\s*0\.95/);
  assert.match(narrator, /pipeline\(text, voice=LOCKED_VOICE, speed=LOCKED_SPEED\)/);
  assert.match(narrator, /stop_duration=0\.35/);
  assert.match(narrator, /stop_silence=0\.12/);
  assert.match(narrator, /loudnorm=I=-18:TP=-1\.5:LRA=7/);
  assert.match(narrator, /raw_audio\.size\s*==\s*0/);
  assert.doesNotMatch(narrator, /am_michael|parts\.append\(silence\)|sentence_pauses/);
  assert.match(workflow, /kokoro==0\.9\.4/);
  assert.doesNotMatch(workflow, /edge-tts==7\.2\.8/);
});
