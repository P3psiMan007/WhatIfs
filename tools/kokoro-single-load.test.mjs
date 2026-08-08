import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNarrationBatchPayload,
  buildNarrationBatchCommand,
} from './episode-producer.mjs';

const input = {
  narrator: {provider:'kokoro-82m', voice:'am_michael', rate:'+4%'},
  scenes: [
    {id:'scene-01', narration:'First scene.'},
    {id:'scene-02', narration:'Second scene.'},
    {id:'scene-09', narration:'Payoff scene.'},
  ],
};

test('Kokoro narration is planned as one batch containing every scene', () => {
  const payload = buildNarrationBatchPayload(input);
  assert.equal(payload.voice, 'am_michael');
  assert.equal(payload.rate, '+4%');
  assert.deepEqual(payload.scenes, [
    {id:'scene-01', text:'First scene.'},
    {id:'scene-02', text:'Second scene.'},
    {id:'scene-09', text:'Payoff scene.'},
  ]);
});

test('producer invokes one batch CLI instead of one Kokoro process per scene', () => {
  const command = buildNarrationBatchCommand(input, '/tmp/narration-batch.json', '/tmp/voice-parts');
  assert.equal(command.program, 'edge-tts');
  assert.deepEqual(command.args, [
    '--batch-json', '/tmp/narration-batch.json',
    '--output-dir', '/tmp/voice-parts',
  ]);
  assert.equal(command.args.includes('--file'), false);
});
