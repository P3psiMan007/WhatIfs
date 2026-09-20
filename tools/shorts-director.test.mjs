import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  planShortsProposal,
  approveProposal,
  buildPromptPackage,
  proposalDigest,
  validateProposal,
  SCENE_COUNT,
  SCENE_SECONDS,
  MIN_VOICEOVER_WORDS,
} from './shorts-director.mjs';

const COPY = fs.readFileSync('shorts/fixtures/solar-storm-copy.txt', 'utf8');

test('plans six evenly timed scenes covering the whole minute', () => {
  const proposal = planShortsProposal({ copy: COPY });
  assert.equal(proposal.scenes.length, SCENE_COUNT);
  assert.equal(proposal.totalSeconds, SCENE_COUNT * SCENE_SECONDS);
  assert.equal(proposal.scenes[0].startSeconds, 0);
  assert.equal(proposal.scenes.at(-1).endSeconds, SCENE_COUNT * SCENE_SECONDS);
  assert.ok(proposal.scenes.every((scene) => scene.narration.trim().length > 0));
  assert.equal(validateProposal(proposal), true);
});

test('narration is partitioned across scenes without loss or duplication', () => {
  const proposal = planShortsProposal({ copy: COPY });
  assert.equal(proposal.scenes.map((scene) => scene.narration).join(' '), proposal.voiceover.text);
});

test('reuses the semantic planner so scenes are not all the same shot kind', () => {
  const proposal = planShortsProposal({ copy: COPY });
  assert.ok(new Set(proposal.scenes.map((scene) => scene.shotKind)).size >= 3);
});

test('theme and aspect ratio drive the stated colour direction', () => {
  const dark = planShortsProposal({ copy: COPY, theme: 'dark', aspectRatio: '9:16' });
  const light = planShortsProposal({ copy: COPY, theme: 'light', aspectRatio: '1:1' });
  assert.notEqual(dark.colorDirection.background, light.colorDirection.background);
  assert.equal(light.aspectRatio, '1:1');
});

test('rejects unsupported aspect ratio and theme', () => {
  assert.throws(() => planShortsProposal({ copy: COPY, aspectRatio: '4:3' }), /aspectRatio/);
  assert.throws(() => planShortsProposal({ copy: COPY, theme: 'sepia' }), /theme/);
});

test('fails closed on copy too short to fill six scenes', () => {
  assert.throws(() => planShortsProposal({ copy: 'Too short. Way too short.' }), new RegExp(String(MIN_VOICEOVER_WORDS)));
});

test('condenses overlong copy back into the voiceover band', () => {
  const proposal = planShortsProposal({ copy: `${COPY} ${COPY} ${COPY}` });
  assert.ok(proposal.voiceover.wordCount <= 170, `wordCount was ${proposal.voiceover.wordCount}`);
  assert.equal(validateProposal(proposal), true);
});

test('prompts are blocked until a human approves the proposal', () => {
  const proposal = planShortsProposal({ copy: COPY });
  assert.throws(() => buildPromptPackage(proposal), /not approved/);
});

test('approval requires an actor', () => {
  const proposal = planShortsProposal({ copy: COPY });
  assert.throws(() => approveProposal(proposal, { actor: '  ' }), /actor/);
});

test('approved proposal yields one prompt per scene bound to the approved digest', () => {
  const proposal = planShortsProposal({ copy: COPY });
  const approved = approveProposal(proposal, { actor: 'reviewer' });
  const promptPackage = buildPromptPackage(approved);
  assert.equal(promptPackage.prompts.length, SCENE_COUNT);
  assert.equal(promptPackage.proposalDigest, proposalDigest(proposal));
  assert.equal(promptPackage.approvedBy, 'reviewer');
  assert.ok(promptPackage.prompts.every((entry) => entry.durationSeconds === SCENE_SECONDS));
  assert.ok(promptPackage.prompts.every((entry) => entry.timeBeats.length === 3));
  assert.ok(promptPackage.prompts.every((entry) => entry.negativeConstraints.length > 0));
});

test('every prompt restates the palette so isolated clips do not drift', () => {
  const approved = approveProposal(planShortsProposal({ copy: COPY }), { actor: 'reviewer' });
  const promptPackage = buildPromptPackage(approved);
  assert.ok(promptPackage.prompts.every((entry) => entry.prompt.includes('#0b0d12')));
  assert.ok(promptPackage.prompts.every((entry) => entry.prompt.includes('9:16')));
});

test('editing a proposal after approval invalidates the prompt package', () => {
  const approved = approveProposal(planShortsProposal({ copy: COPY }), { actor: 'reviewer' });
  assert.throws(() => buildPromptPackage({ ...approved, title: 'Something Else' }), /changed after approval/);
  assert.throws(
    () => buildPromptPackage({ ...approved, scenes: approved.scenes.map((s, i) => (i ? s : { ...s, cameraMove: 'whip pan' })) }),
    /changed after approval/,
  );
});

test('digest ignores the approval block so re-hashing is stable', () => {
  const proposal = planShortsProposal({ copy: COPY });
  const approved = approveProposal(proposal, { actor: 'reviewer' });
  assert.equal(proposalDigest(approved), proposalDigest(proposal));
});

test('validateProposal rejects a tampered scene timeline', () => {
  const proposal = planShortsProposal({ copy: COPY });
  proposal.scenes[2].startSeconds = 99;
  assert.throws(() => validateProposal(proposal), /startSeconds/);
});

test('digest is independent of key order but covers nested scene fields', () => {
  const proposal = planShortsProposal({ copy: COPY });
  const reordered = Object.fromEntries(Object.entries(proposal).reverse());
  assert.equal(proposalDigest(reordered), proposalDigest(proposal));

  const nestedEdit = {
    ...proposal,
    scenes: proposal.scenes.map((scene, index) => (index === 3 ? { ...scene, sfx: 'different sfx' } : scene)),
  };
  assert.notEqual(proposalDigest(nestedEdit), proposalDigest(proposal));
});

test('a narration slice is cut at a word boundary, never mid-word', () => {
  const proposal = planShortsProposal({ copy: COPY });
  for (const scene of proposal.scenes) {
    const quoted = scene.visualObjective.match(/^.*?: (.+)\.$/)?.[1];
    if (!quoted || !scene.narration.startsWith(quoted)) continue;
    // A clean cut lands at end of narration, at whitespace, or on the sentence
    // period the quote was trimmed back to.
    const boundary = scene.narration.slice(quoted.length, quoted.length + 1);
    assert.ok(boundary === '' || /[\s.!?]/.test(boundary), `cut mid-word before "${boundary}" in: ${quoted}`);
  }
});

test('objectives never carry a doubled sentence period into the prompt', () => {
  const proposal = planShortsProposal({ copy: COPY });
  const promptPackage = buildPromptPackage(approveProposal(proposal, { actor: 'reviewer' }));
  for (const scene of proposal.scenes) assert.doesNotMatch(scene.visualObjective, /\.\./);
  for (const entry of promptPackage.prompts) assert.doesNotMatch(entry.prompt, /\.\./);
});

test('templated objectives are left untouched by the fragment tidy', () => {
  const proposal = planShortsProposal({ copy: COPY });
  const causal = proposal.scenes.find((scene) => scene.shotKind === 'cause-effect');
  assert.ok(causal, 'expected a cause-effect scene in the fixture');
  assert.match(causal.visualObjective, /changes, then .* responds\.$/);
});

test('fails closed when trimming leaves the voiceover under the floor', () => {
  // Six tiny sentences then one huge one: the trim keeps the six, which are
  // far below the floor.
  const runt = `${Array.from({ length: 6 }, (_, i) => `Scene ${i} is short.`).join(' ')} ${'word '.repeat(300)}.`;
  assert.throws(() => planShortsProposal({ copy: runt }), /at least 110/);
});
