import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContinuousBeatFrames} from './visual-timeline.mjs';

test('visual beats cover narration pauses without black frame gaps', () => {
  const frames = buildContinuousBeatFrames([
    {id:'a',start:0,duration:3.25},
    {id:'b',start:3.39,duration:2.8},
    {id:'c',start:6.33,duration:3.1},
  ], 30, 10);
  assert.equal(frames[0].from + frames[0].durationInFrames, frames[1].from);
  assert.equal(frames[1].from + frames[1].durationInFrames, frames[2].from);
  assert.equal(frames[2].from + frames[2].durationInFrames, 300);
});
