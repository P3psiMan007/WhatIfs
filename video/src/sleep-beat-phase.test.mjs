import test from 'node:test';
import assert from 'node:assert/strict';
import {getSleepBeatPhase} from './sleep-beat-phase.mjs';

test('first eight beats preserve the authored phase sequence',()=>{
  for(const sceneId of ['scene-02','scene-03','scene-04','scene-05','scene-06','scene-07','scene-08','scene-09']){
    for(let ordinal=1;ordinal<=8;ordinal++) assert.equal(getSleepBeatPhase(sceneId,ordinal),ordinal-1);
  }
});

test('late beats stay narratively aligned instead of wrapping to opening visuals',()=>{
  const expected={
    'scene-02':{9:5,10:6,11:7,12:7},
    'scene-03':{9:4,10:6,11:6,12:7},
    'scene-04':{9:5,10:7},
    'scene-05':{9:6,10:6,11:7,12:5},
    'scene-06':{9:4,10:5,11:5,12:6},
    'scene-07':{9:3,10:4,11:5,12:5,13:6,14:6},
    'scene-08':{9:6,10:7},
    'scene-09':{9:6,10:5},
  };
  for(const [sceneId,map] of Object.entries(expected)){
    for(const [ordinal,phase] of Object.entries(map)) assert.equal(getSleepBeatPhase(sceneId,Number(ordinal)),phase,`${sceneId} beat ${ordinal}`);
  }
});

test('unknown excess beats fail closed on the final authored phase instead of cycling',()=>{
  assert.equal(getSleepBeatPhase('scene-09',99),7);
  assert.equal(getSleepBeatPhase('scene-99',9),7);
});
