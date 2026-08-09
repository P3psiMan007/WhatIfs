import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOOK_SHOTS,
  buildCaptionCues,
  buildShotFrames,
  findCoverageGaps,
  toSrt,
} from './shot-plan.mjs';

const FPS = 30;
const DURATION = 28.033333333333335;

test('every shot names exactly one visual owner', () => {
  for (const shot of HOOK_SHOTS) {
    assert.equal(typeof shot.shot, 'string');
    assert.ok(shot.shot.length > 0, `${shot.id} has no shot component`);
  }
  const ids = HOOK_SHOTS.map((shot) => shot.id);
  assert.equal(new Set(ids).size, ids.length, 'shot ids must be unique');
});

test('the hook shot plan covers every frame with no gaps', () => {
  const frames = buildShotFrames(HOOK_SHOTS, FPS, DURATION);
  assert.deepEqual(findCoverageGaps(frames, FPS, DURATION), []);
  assert.equal(frames[0].from, 0, 'first shot must start on frame 0');
  const total = Math.round(DURATION * FPS);
  const last = frames[frames.length - 1];
  assert.equal(last.from + last.durationInFrames, total, 'last shot must run to the final frame');
});

test('consecutive shots overlap so a cut can never expose the canvas', () => {
  const frames = buildShotFrames(HOOK_SHOTS, FPS, DURATION, 2);
  for (let index = 0; index < frames.length - 1; index += 1) {
    const current = frames[index];
    const next = frames[index + 1];
    assert.ok(
      current.from + current.durationInFrames > next.from,
      `${current.id} ends before ${next.id} begins`,
    );
  }
});

test('a plan with a hole is reported rather than rendered', () => {
  const holed = [
    {id: 'a', shot: 'A', start: 0},
    {id: 'b', shot: 'B', start: 2},
  ];
  const frames = buildShotFrames(holed, FPS, 10, 0).map((frame) =>
    frame.id === 'b' ? {...frame, durationInFrames: 30} : frame,
  );
  const gaps = findCoverageGaps(frames, FPS, 10);
  assert.equal(gaps.length, 1);
  assert.deepEqual(gaps[0], {from: 90, to: 300});
});

const line = (text, words) => ({text, words});
const word = (text, start, end) => ({text, start, end});

test('captions split on sentences before anything else', () => {
  const cues = buildCaptionCues(
    [line('No fatigue. No brain fog.', [
      word('No', 0, 0.3), word('fatigue.', 0.3, 0.9),
      word('No', 1.2, 1.4), word('brain', 1.4, 1.7), word('fog.', 1.7, 2.1),
    ])],
    10,
  );
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, 'No fatigue.');
  assert.equal(cues[1].text, 'No brain fog.');
});

test('long sentences break before a connector, not mid-phrase', () => {
  const source = 'Tomorrow, every human wakes up and discovers that sleep is simply unnecessary.';
  const words = source.split(' ').map((token, index) => word(token, index * 0.5, index * 0.5 + 0.4));
  const cues = buildCaptionCues([line(source, words)], 30);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, 'Tomorrow, every human wakes up');
  assert.equal(cues[1].text, 'and discovers that sleep is simply unnecessary.');
});

test('no caption is long enough to overflow a phone screen', () => {
  const source = 'Whatever your body used to repair during sleep now happens while you are awake.';
  const words = source.split(' ').map((token, index) => word(token, index * 0.4, index * 0.4 + 0.3));
  for (const cue of buildCaptionCues([line(source, words)], 30)) {
    assert.ok(cue.text.length <= 52, `caption too long: ${cue.text}`);
  }
});

test('captions never outlive the picture', () => {
  const words = [word('Held', 27.4, 27.9), word('long.', 27.9, 28.6)];
  const cues = buildCaptionCues([line('Held long.', words)], DURATION);
  assert.ok(cues[cues.length - 1].end <= DURATION + 1e-9);
});

test('captions never overlap each other', () => {
  const source = 'One two three four five six seven eight nine ten eleven twelve.';
  const words = source.split(' ').map((token, index) => word(token, index * 0.5, index * 0.5 + 0.45));
  const cues = buildCaptionCues([line(source, words)], 30);
  for (let index = 0; index < cues.length - 1; index += 1) {
    assert.ok(cues[index].end <= cues[index + 1].start, 'cues overlap');
    assert.ok(cues[index].end > cues[index].start, 'cue has no duration');
  }
});

test('srt timestamps are well formed', () => {
  const srt = toSrt([{text: 'Hello.', start: 1.5, end: 2.25}]);
  assert.equal(srt, '1\n00:00:01,500 --> 00:00:02,250\nHello.\n');
});
