import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('recovered-hours hook label uses the light foreground instead of dark background color',()=>{
  const source=fs.readFileSync(new URL('./sleep-scenes.jsx',import.meta.url),'utf8');
  assert.match(source,/text="8 HOURS"\s+color=\{fg\}/);
  assert.doesNotMatch(source,/text="8 HOURS"\s+color="#0b0d12"/);
});
