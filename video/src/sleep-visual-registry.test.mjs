import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SLEEP_SCENE_IDS,
  SLEEP_SCENE_ASSETS,
  getSleepSceneSpec,
  assertSleepVisualCoverage,
} from './sleep-visual-registry.mjs';

test('sleep episode visual registry covers exactly nine canonical scenes with unique checked-in art paths', () => {
  assert.deepEqual(SLEEP_SCENE_IDS, [
    'scene-01','scene-02','scene-03','scene-04','scene-05','scene-06','scene-07','scene-08','scene-09',
  ]);
  const paths = SLEEP_SCENE_IDS.map((id) => SLEEP_SCENE_ASSETS[id]);
  assert.equal(paths.length, 9);
  assert.equal(new Set(paths).size, 9);
  for (const [index, assetPath] of paths.entries()) {
    assert.equal(assetPath, `visuals/20260807-episode/scene-${String(index + 1).padStart(2, '0')}.svg`);
    const fullPath=path.join(process.cwd(),'public',assetPath);
    assert.equal(fs.existsSync(fullPath),true,`missing checked-in scene art: ${fullPath}`);
    assert.ok(fs.statSync(fullPath).size>300,`scene art too small to be a real plate: ${fullPath}`);
  }
  assert.equal(assertSleepVisualCoverage(SLEEP_SCENE_IDS), true);
});

test('sleep scene plates are illustrated environments rather than sparse diagram backgrounds', () => {
  for (const sceneId of SLEEP_SCENE_IDS) {
    const assetPath=SLEEP_SCENE_ASSETS[sceneId];
    const fullPath=path.join(process.cwd(),'public',assetPath);
    const svg=fs.readFileSync(fullPath,'utf8');
    assert.match(svg,/data-quality="illustrated-v3"/,`${sceneId} must opt into the illustrated-v3 art direction`);
    assert.match(svg,/<g[^>]+id="environment"/,`${sceneId} needs an environment layer`);
    assert.match(svg,/<g[^>]+id="characters"/,`${sceneId} needs a character/story layer`);
    assert.match(svg,/<g[^>]+id="depth"/,`${sceneId} needs foreground/background depth`);
    const solidFills=[...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((match)=>match[1].toLowerCase());
    assert.ok(new Set(solidFills).size>=4,`${sceneId} needs at least four solid fill colors for illustrated separation`);
    assert.ok(Buffer.byteLength(svg,'utf8')>1700,`${sceneId} is too sparse to qualify as an illustrated scene plate`);
  }
});

test('authored sleep visuals cannot reintroduce the rejected waking-life arithmetic claim', () => {
  const source=fs.readFileSync(path.join(process.cwd(),'video/src/sleep-scenes.jsx'),'utf8');
  assert.doesNotMatch(source,/NEARLY\s+1\/3\s+MORE\s+WAKING\s+LIFE/i);
  assert.match(source,/A THIRD OF EACH DAY BACK/i,'payoff should use the corrected day-share framing');
});

test('primary doodle characters use a filled silhouette layer instead of bare stick-only anatomy', () => {
  const source=fs.readFileSync(path.join(process.cwd(),'video/src/doodle-primitives.jsx'),'utf8');
  assert.match(source,/data-character-quality="filled-v4"/,'DoodlePerson must opt into the filled-v4 character treatment');
  assert.match(source,/fill=\{bodyFill\}/,'DoodlePerson needs a filled torso silhouette');
  assert.match(source,/strokeWidth="10"/,'DoodlePerson needs a stronger outer contour');
});

test('sleep visual registry fails closed for unknown or missing scene ids', () => {
  assert.equal(getSleepSceneSpec('scene-99'), null);
  assert.throws(() => assertSleepVisualCoverage(['scene-01','scene-02']), /coverage mismatch/i);
  assert.throws(() => assertSleepVisualCoverage([...SLEEP_SCENE_IDS, 'scene-99']), /coverage mismatch/i);
});
