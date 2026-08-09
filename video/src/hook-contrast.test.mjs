import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('hook recovered-hours callout stays readable without a second visual layer',()=>{
  const episode=fs.readFileSync(new URL('./what-if-episode.jsx',import.meta.url),'utf8');
  const assetScene=fs.readFileSync(new URL('./sleep-asset-scene.jsx',import.meta.url),'utf8');
  assert.match(episode,/SleepAssetScene/);
  assert.doesNotMatch(episode,/HookHoursContrastOverlay/);
  assert.match(assetScene,/beat\?\.callout/);
  assert.match(assetScene,/color:palette\.foreground/);
  assert.match(assetScene,/data-visual-owner="authored-asset-only"/);
});
