import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('Episode 1 hook recovered-hours callout stays readable without a second legacy visual layer',()=>{
  const episode=fs.readFileSync(new URL('./what-if-episode.jsx',import.meta.url),'utf8');
  const cinematic=fs.readFileSync(new URL('./cinematic-full-episode.jsx',import.meta.url),'utf8');
  assert.match(episode,/LEGACY_CINEMATIC_EPISODE_ID\s*=\s*['"]20260807-episode['"]/);
  assert.match(episode,/CinematicEpisodeScene/);
  assert.doesNotMatch(episode,/HookHoursContrastOverlay|SleepAssetScene/);
  assert.match(cinematic,/MinimalCallout/);
  assert.match(cinematic,/color:AMBER/);
  assert.match(cinematic,/background:'rgba\(5,8,14,\.55\)'/);
  assert.match(cinematic,/data-visual-owner="cinematic-single"/);
});
