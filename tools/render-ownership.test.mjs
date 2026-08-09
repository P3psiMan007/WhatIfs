import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const episode = fs.readFileSync('video/src/what-if-episode.jsx','utf8');
const assetScene = fs.readFileSync('video/src/sleep-asset-scene.jsx','utf8');
const scene01 = fs.readFileSync('public/visuals/20260807-episode/scene-01.svg','utf8');
const narratorRepair = fs.readFileSync('tools/narration-provider-repair.mjs','utf8');
const narrationShim = fs.readFileSync('tools/edge-tts','utf8');
const workflow = fs.readFileSync('.github/workflows/episode-factory.yml','utf8');

test('authored sleep scene art has exactly one render owner in the episode', () => {
  assert.match(scene01, /id="characters"/);
  assert.match(episode, /<SleepAssetScene/);
  assert.doesNotMatch(episode, /<SleepScene\b/);
  assert.doesNotMatch(episode, /HookHoursContrastOverlay/);
  assert.match(assetScene, /data-visual-owner="authored-asset-only"/);
  assert.match(assetScene, /if \(!spec\) throw new Error/);
});

test('factory locks the exact approved female Kokoro narrator with no fallback', () => {
  assert.match(narratorRepair, /approvedVoice = 'af_heart'/);
  assert.match(narratorRepair, /approvedRate = '0\.95'/);
  assert.match(narratorRepair, /provider: 'kokoro'/);
  assert.doesNotMatch(narratorRepair, /en-US-BrianNeural|am_michael/);
  assert.match(narrationShim, /APPROVED_VOICE = "af_heart"/);
  assert.match(narrationShim, /APPROVED_SPEED = 0\.95/);
  assert.match(narrationShim, /refusing fallback/);
  assert.doesNotMatch(narrationShim, /en-US-BrianNeural|am_michael/);
  assert.match(workflow, /narration-provider-repair\.mjs/);
});
