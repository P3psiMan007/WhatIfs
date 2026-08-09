import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNarrationBatchPayload, clampCaptionsToDuration} from './episode-producer.mjs';

const lockedInput={
  narrator:{provider:'kokoro',voice:'af_heart',speed:0.95,locked:true},
  scenes:[{id:'scene-01',narration:'First sentence. Second sentence.'}],
};

test('narration payload carries exact locked provider, voice and speed with no fallback',()=>{
  assert.deepEqual(buildNarrationBatchPayload(lockedInput),{
    provider:'kokoro',
    voice:'af_heart',
    speed:0.95,
    scenes:[{id:'scene-01',text:'First sentence. Second sentence.'}],
  });
  assert.throws(()=>buildNarrationBatchPayload({...lockedInput,narrator:{provider:'kokoro',voice:'',speed:0.95}}),/narrator voice/i);
});

test('captions are clamped to the exact combined narration duration',()=>{
  const cues=clampCaptionsToDuration([
    {start:0,end:2,text:'A'},
    {start:9.5,end:10.4,text:'B'},
    {start:10.1,end:11,text:'outside'},
  ],10);
  assert.deepEqual(cues,[
    {start:0,end:2,text:'A'},
    {start:9.5,end:10,text:'B'},
  ]);
});

test('locked narrator compresses only long internal pauses and rejects empty generated audio',()=>{
  const shim=fs.readFileSync('tools/edge-tts','utf8');
  assert.match(shim,/stop_duration=0\.35/);
  assert.match(shim,/stop_silence=0\.12/);
  assert.match(shim,/stop_threshold=-42dB/);
  assert.match(shim,/raw_audio\.size\s*==\s*0/);
  assert.doesNotMatch(shim,/parts\.append\(silence\)|sentence_pauses/);
});

test('combined narration is normalized to a YouTube-friendly spoken-word target',()=>{
  const producer=fs.readFileSync('tools/episode-producer.mjs','utf8');
  assert.match(producer,/loudnorm=I=-18:TP=-1\.5:LRA=7/);
});
