import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('hook recovered-hours callout stays readable without a second visual layer',()=>{
  const episode=fs.readFileSync(new URL('./what-if-episode.jsx',import.meta.url),'utf8');
  const cinematic=fs.readFileSync(new URL('./cinematic-full-episode.jsx',import.meta.url),'utf8');
  assert.match(episode,/CinematicEpisodeScene/);
  assert.doesNotMatch(episode,/HookHoursContrastOverlay|SleepAssetScene/);
  assert.match(episode,/data-visual-owner="cinematic-single"/);
  assert.match(cinematic,/MinimalCallout/);
  assert.match(cinematic,/color:AMBER/);
  assert.match(cinematic,/background:'rgba\(5,8,14,\.55\)'/);
  assert.match(cinematic,/data-visual-owner="cinematic-single"/);
});
