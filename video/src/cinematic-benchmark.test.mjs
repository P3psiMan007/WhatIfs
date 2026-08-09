import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const path=new URL('./cinematic-benchmark.jsx',import.meta.url);

test('cinematic benchmark exists and rejects the old doodle/SVG visual grammar',()=>{
  assert.equal(fs.existsSync(path),true,'cinematic-benchmark.jsx must exist');
  const src=fs.readFileSync(path,'utf8');
  assert.match(src,/WhatIfCinematicBenchmark/);
  assert.match(src,/en-US-BrianNeural/);
  assert.match(src,/c07e6450-2b34-49ec-aec7-9499bd2094be/);
  assert.match(src,/63246ed7-bf56-46ce-931b-48c800b3a661/);
  assert.match(src,/722cf062-0d56-4e4c-ab85-43e13e4a6cd5/);
  assert.match(src,/87d19717-40f8-42e7-8feb-aa1baf7242cb/);
  assert.doesNotMatch(src,/SleepAssetScene|sleep-scenes|\.svg|doodle|stick figure/i);
});

test('human shot transitions use motivated cuts instead of ghosted double-exposure crossfades',()=>{
  const src=fs.readFileSync(path,'utf8');
  assert.doesNotMatch(src,/fadeIn|fadeOut|Math\.min\(fadeIn,fadeOut\)/);
});
