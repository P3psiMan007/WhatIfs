import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const episode = fs.readFileSync('video/src/what-if-episode.jsx','utf8');
const assetScene = fs.readFileSync('video/src/sleep-asset-scene.jsx','utf8');
const scene01 = fs.readFileSync('public/visuals/20260807-episode/scene-01.svg','utf8');
const narratorRepair = fs.readFileSync('tools/narration-provider-repair.mjs','utf8');
const workflow = fs.readFileSync('.github/workflows/episode-factory.yml','utf8');

test('authored sleep scene art has exactly one render owner in the episode', () => {
  assert.match(scene01, /id="characters"/);
  assert.match(episode, /<SleepAssetScene/);
  assert.doesNotMatch(episode, /<SleepScene\b/);
  assert.doesNotMatch(episode, /HookHoursContrastOverlay/);
  assert.match(assetScene, /data-visual-owner="authored-asset-only"/);
});

test('factory restores the exact approved narrator instead of silently substituting Kokoro', () => {
  assert.match(narratorRepair, /en-US-BrianNeural/);
  assert.doesNotMatch(narratorRepair, /am_michael/);
  assert.match(workflow, /edge-tts==7\.2\.8/);
  assert.doesNotMatch(workflow, /kokoro==/);
});
