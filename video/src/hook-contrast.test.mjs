import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('third hook beat redraws recovered-hours label in readable foreground',()=>{
  const source=fs.readFileSync(new URL('./what-if-episode.jsx',import.meta.url),'utf8');
  assert.match(source,/beat\.sceneId==='scene-01'&&beat\.localBeatOrdinal===3/);
  assert.match(source,/8 HOURS/);
  assert.match(source,/fill:\s*palette\.foreground/);
});
