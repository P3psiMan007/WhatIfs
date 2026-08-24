import test from 'node:test';
import assert from 'node:assert/strict';
import {planSemanticShot, scoreStoryboardQuality, improveShotSequence} from './semantic-shot-planner.mjs';

test('plans a contrast shot for a misconception correction', () => {
  const shot = planSemanticShot({
    text: "Your battery percentage isn't measured directly. Instead, your phone estimates it from voltage.",
    sceneHeadline: 'BATTERY PERCENTAGE',
    index: 0,
  });
  assert.equal(shot.kind, 'contrast');
  assert.equal(shot.subject.key, 'battery');
  assert.equal(shot.secondary.key, 'phone');
  assert.match(shot.visualObjective, /wrong|actual|estimate/i);
});

test('plans a process shot when narration describes a signal path', () => {
  const shot = planSemanticShot({
    text: 'The phone measures battery voltage, sends that reading into an estimator, and turns it into a percentage.',
    sceneHeadline: 'HOW THE NUMBER APPEARS',
    index: 1,
  });
  assert.equal(shot.kind, 'process');
  assert.equal(shot.subject.key, 'phone');
  assert.ok(shot.stages.length >= 3);
});

test('improves a repetitive shot run without losing semantic subjects', () => {
  const shots = [0,1,2,3,4].map((index) => ({
    ...planSemanticShot({text:'A phone sits on a table.', sceneHeadline:'PHONE', index}),
    kind:'object-focus',
  }));
  const improved = improveShotSequence(shots);
  const run = improved.map((s) => s.kind);
  assert.notDeepEqual(run, ['object-focus','object-focus','object-focus','object-focus','object-focus']);
  assert.ok(improved.every((s) => s.subject.key === 'phone'));
});

test('quality score penalizes generic repetition and rewards semantic variety', () => {
  const bad = Array.from({length:8}, (_,index) => ({
    shot:{kind:'object-focus', subject:{key:'generic',label:'THING'}, secondary:{key:'generic',label:'THING'}, visualObjective:'Show the thing.'},
    text:`generic beat ${index}`,
  }));
  const goodTexts = [
    "Your battery percentage isn't measured directly; the phone estimates it.",
    'The phone measures battery voltage and sends the reading into an estimator.',
    'Cold changes the voltage curve, so the estimate can move even when energy barely changed.',
    'At the bottom of the curve, a tiny voltage change can represent a large remaining chunk.',
    'That is why one percent can sometimes last longer than you expect.',
    'Charging reverses the path and the estimate recalibrates.',
    'The number is useful, but it is not a fuel gauge inside the battery.',
    'It is software interpreting an electrical signal.',
  ];
  const goodShots = improveShotSequence(goodTexts.map((text,index)=>planSemanticShot({text,sceneHeadline:'BATTERY',index})));
  const good = goodShots.map((shot,index)=>({shot,text:goodTexts[index]}));
  assert.ok(scoreStoryboardQuality(good).score > scoreStoryboardQuality(bad).score);
  assert.ok(scoreStoryboardQuality(good).score >= 0.68);
});
