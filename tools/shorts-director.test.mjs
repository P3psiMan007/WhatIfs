import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  planShortsProposal,
  approveProposal,
  buildPromptPackage,
  proposalDigest,
  validateProposal,
  missingSetup,
  SCENE_COUNT,
  SCENE_SECONDS,
  MIN_VOICEOVER_WORDS,
  MAX_VOICEOVER_WORDS,
  MIN_VISUAL_DEVICES,
} from './shorts-director.mjs';

const COPY = fs.readFileSync('shorts/fixtures/solar-storm-copy.txt', 'utf8');
const SETUP = { aspectRatio: '9:16', theme: 'dark' };
const plan = (overrides = {}) => planShortsProposal({ copy: COPY, ...SETUP, ...overrides });
const approvedPackage = (overrides = {}) => buildPromptPackage(approveProposal(plan(overrides), { actor: 'reviewer' }));

test('plans six evenly timed scenes covering the whole minute', () => {
  const proposal = plan();
  assert.equal(proposal.scenes.length, SCENE_COUNT);
  assert.equal(proposal.totalSeconds, SCENE_COUNT * SCENE_SECONDS);
  assert.equal(proposal.scenes[0].startSeconds, 0);
  assert.equal(proposal.scenes.at(-1).endSeconds, SCENE_COUNT * SCENE_SECONDS);
  assert.equal(validateProposal(proposal), true);
});

test('narration is partitioned across scenes without loss or duplication', () => {
  const proposal = plan();
  assert.equal(proposal.scenes.map((scene) => scene.narration).join(' '), proposal.voiceover.text);
});

test('reuses the semantic planner so scenes are not all the same shot kind', () => {
  assert.ok(new Set(plan().scenes.map((scene) => scene.shotKind)).size >= 3);
});

// Setup gate

test('refuses to pick an aspect ratio or theme silently, naming every gap at once', () => {
  assert.deepEqual(missingSetup({}).length, 2);
  assert.throws(() => planShortsProposal({ copy: COPY }), /aspectRatio.*theme/s);
  assert.throws(() => planShortsProposal({ copy: COPY, theme: 'dark' }), /aspectRatio/);
  assert.throws(() => planShortsProposal({ copy: COPY, aspectRatio: '9:16' }), /theme/);
});

test('rejects unsupported aspect ratio and theme', () => {
  assert.throws(() => plan({ aspectRatio: '4:3' }), /aspectRatio/);
  assert.throws(() => plan({ theme: 'sepia' }), /theme/);
});

// Copy band

test('fails closed outside the 130-150 word band', () => {
  assert.throws(() => planShortsProposal({ copy: 'Too short. Way too short.', ...SETUP }), new RegExp(String(MIN_VOICEOVER_WORDS)));
  const proposal = planShortsProposal({ copy: `${COPY} ${COPY} ${COPY}`, ...SETUP });
  assert.ok(proposal.voiceover.wordCount <= MAX_VOICEOVER_WORDS);
});

test('fails closed when trimming leaves the voiceover under the floor', () => {
  const runt = `${Array.from({ length: 6 }, (_, i) => `Scene ${i} is short.`).join(' ')} ${'word '.repeat(300)}.`;
  assert.throws(() => planShortsProposal({ copy: runt, ...SETUP }), new RegExp(String(MIN_VOICEOVER_WORDS)));
});

// Contract rules the upstream skill requires

test('every prompt carries the identical character DNA lock', () => {
  const pkg = approvedPackage();
  const dna = 'hollow circular head, no facial features';
  assert.ok(pkg.prompts.every((entry) => entry.prompt.includes(dna)), 'character lock missing from a prompt');
});

test('every prompt repeats the identical narrator lock verbatim', () => {
  const pkg = approvedPackage();
  const locks = new Set(pkg.prompts.map((entry) => entry.prompt.split('\n').find((line) => line.startsWith('Identical narrator:'))));
  assert.equal(locks.size, 1, 'narrator description differs between prompts');
  assert.ok([...locks][0]);
});

test('clip one establishes the music and later clips continue it explicitly', () => {
  const pkg = approvedPackage();
  assert.match(pkg.prompts[0].prompt, /establishes the theme/);
  for (const entry of pkg.prompts.slice(1)) {
    assert.match(entry.prompt, /seamlessly continue the identical .* from clip 1/);
  }
});

test('no prompt contains technical colour notation', () => {
  const pkg = approvedPackage();
  for (const entry of pkg.prompts) {
    assert.doesNotMatch(entry.prompt, /#[0-9a-fA-F]{3,8}\b/, `hex leaked into prompt ${entry.index}`);
    assert.doesNotMatch(entry.prompt, /\brgb\(|\bhsl\(|\bpantone\b/i);
  }
  // Accents are still named, just in ordinary words.
  assert.match(pkg.prompts[0].prompt, /warm gold|vivid red|electric blue/);
});

test('hex survives on the proposal for human review but never reaches a prompt', () => {
  const proposal = plan();
  assert.match(proposal.reviewSwatch.background, /^#[0-9a-f]{6}$/i);
  assert.ok(!buildPromptPackage(approveProposal(proposal, { actor: 'reviewer' })).prompts.some((e) => e.prompt.includes('#')));
});

test('dark theme is pitch black, not a near-black tint', () => {
  assert.equal(plan({ theme: 'dark' }).reviewSwatch.background, '#000000');
  assert.match(plan({ theme: 'dark' }).canvas, /pitch-black/);
  assert.match(plan({ theme: 'light' }).canvas, /pure-white/);
});

test('each scene carries at least four visual devices, all named in its prompt', () => {
  const proposal = plan();
  const pkg = buildPromptPackage(approveProposal(proposal, { actor: 'reviewer' }));
  proposal.scenes.forEach((scene, index) => {
    assert.ok(scene.visualDevices.length >= MIN_VISUAL_DEVICES, `scene ${index} is too sparse`);
    for (const device of scene.visualDevices) assert.ok(pkg.prompts[index].prompt.includes(device));
  });
});

test('beats run 0-3 / 3-7 / 7-10 so something changes every few seconds', () => {
  for (const scene of plan().scenes) {
    assert.equal(scene.beats.length, 3);
    assert.match(scene.beats[0], /^\[0-3s\]/);
    assert.match(scene.beats[1], /^\[3-7s\]/);
    assert.match(scene.beats[2], /^\[7-10s\]/);
  }
});

test('the figure is given something to do in every scene', () => {
  for (const scene of plan().scenes) {
    assert.ok(scene.visualDevices.some((device) => /stick figure/.test(device)), `scene ${scene.index} has no acting figure`);
  }
});

test('each cut names the same frame on both sides', () => {
  const proposal = plan();
  for (let i = 1; i < proposal.scenes.length; i += 1) {
    assert.ok(proposal.scenes[i].openingState.includes(proposal.scenes[i - 1].closingState));
  }
  assert.match(proposal.scenes[0].openingState, /cold open/);
});

test('the stitching guide lists every cut with its matched state', () => {
  const pkg = approvedPackage();
  assert.equal(pkg.stitchingGuide.length, SCENE_COUNT - 1);
  pkg.stitchingGuide.forEach((cut, index) => {
    assert.equal(cut.atSeconds, (index + 1) * SCENE_SECONDS);
    assert.ok(cut.matchedState);
  });
});

test('each prompt quotes its own narration exactly, as audio only', () => {
  const proposal = plan();
  const pkg = buildPromptPackage(approveProposal(proposal, { actor: 'reviewer' }));
  proposal.scenes.forEach((scene, index) => {
    assert.ok(pkg.prompts[index].prompt.includes(`"${scene.narration}"`), `scene ${index} dialogue not quoted exactly`);
    assert.match(pkg.prompts[index].prompt, /Audio voiceover only, strictly no speech bubbles/);
  });
});

test('staging advice follows the chosen aspect ratio', () => {
  assert.match(approvedPackage({ aspectRatio: '9:16' }).prompts[0].prompt, /stacked vertical motion/);
  assert.match(approvedPackage({ aspectRatio: '16:9' }).prompts[0].prompt, /lateral tracking/);
  assert.match(approvedPackage({ aspectRatio: '1:1' }).prompts[0].prompt, /compact central composition/);
});

test('validateProposal rejects a stripped character or narrator lock', () => {
  assert.throws(() => validateProposal({ ...plan(), characterDna: 'a guy' }), /character DNA/);
  assert.throws(() => validateProposal({ ...plan(), narratorLock: 'someone' }), /narrator lock/);
});

test('validateProposal rejects a broken continuity chain', () => {
  const proposal = plan();
  proposal.scenes[3].openingState = 'start wherever you like';
  assert.throws(() => validateProposal(proposal), /does not inherit/);
});

test('validateProposal rejects a scene stripped of visual devices', () => {
  const proposal = plan();
  proposal.scenes[2].visualDevices = ['one thing'];
  assert.throws(() => validateProposal(proposal), /visual devices/);
});

// Approval gate

test('prompts are blocked until a human approves the proposal', () => {
  assert.throws(() => buildPromptPackage(plan()), /not approved/);
});

test('approval requires an actor', () => {
  assert.throws(() => approveProposal(plan(), { actor: '  ' }), /actor/);
});

test('approved proposal yields one prompt per scene bound to the approved digest', () => {
  const proposal = plan();
  const pkg = buildPromptPackage(approveProposal(proposal, { actor: 'reviewer' }));
  assert.equal(pkg.prompts.length, SCENE_COUNT);
  assert.equal(pkg.proposalDigest, proposalDigest(proposal));
  assert.equal(pkg.approvedBy, 'reviewer');
  assert.ok(pkg.prompts.every((entry) => entry.durationSeconds === SCENE_SECONDS));
});

test('editing a proposal after approval invalidates the prompt package', () => {
  const approved = approveProposal(plan(), { actor: 'reviewer' });
  assert.throws(() => buildPromptPackage({ ...approved, title: 'Something Else' }), /changed after approval/);
  assert.throws(
    () => buildPromptPackage({ ...approved, scenes: approved.scenes.map((s, i) => (i ? s : { ...s, cameraMove: 'whip pan' })) }),
    /changed after approval/,
  );
});

test('digest is independent of key order but covers nested scene fields', () => {
  const proposal = plan();
  assert.equal(proposalDigest(Object.fromEntries(Object.entries(proposal).reverse())), proposalDigest(proposal));
  const nestedEdit = { ...proposal, scenes: proposal.scenes.map((s, i) => (i === 3 ? { ...s, sfx: 'different' } : s)) };
  assert.notEqual(proposalDigest(nestedEdit), proposalDigest(proposal));
});

test('digest ignores the approval block so re-hashing is stable', () => {
  const proposal = plan();
  assert.equal(proposalDigest(approveProposal(proposal, { actor: 'reviewer' })), proposalDigest(proposal));
});

// Narration quoting hygiene

test('a narration slice is cut at a word boundary, never mid-word', () => {
  for (const scene of plan().scenes) {
    const quoted = scene.visualObjective.match(/^.*?: (.+)\.$/)?.[1];
    if (!quoted || !scene.narration.startsWith(quoted)) continue;
    const boundary = scene.narration.slice(quoted.length, quoted.length + 1);
    assert.ok(boundary === '' || /[\s.!?]/.test(boundary), `cut mid-word before "${boundary}"`);
  }
});

test('objectives never carry a doubled sentence period into the prompt', () => {
  const proposal = plan();
  const pkg = buildPromptPackage(approveProposal(proposal, { actor: 'reviewer' }));
  for (const scene of proposal.scenes) assert.doesNotMatch(scene.visualObjective, /\.\./);
  for (const entry of pkg.prompts) assert.doesNotMatch(entry.prompt, /\.\./);
});
