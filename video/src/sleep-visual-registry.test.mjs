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

test('sleep visual registry fails closed for unknown or missing scene ids', () => {
  assert.equal(getSleepSceneSpec('scene-99'), null);
  assert.throws(() => assertSleepVisualCoverage(['scene-01','scene-02']), /coverage mismatch/i);
  assert.throws(() => assertSleepVisualCoverage([...SLEEP_SCENE_IDS, 'scene-99']), /coverage mismatch/i);
});
