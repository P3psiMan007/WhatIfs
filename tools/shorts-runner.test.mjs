import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const COPY = fs.readFileSync('shorts/fixtures/solar-storm-copy.txt', 'utf8');

// The runner resolves SHORTS_DIR and SHORTS_STATE_PATH per call, so each case
// just repoints them at a throwaway sandbox.
async function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shorts-runner-'));
  process.env.SHORTS_DIR = dir;
  process.env.SHORTS_STATE_PATH = path.join(dir, 'shorts-state.json');
  fs.writeFileSync(
    process.env.SHORTS_STATE_PATH,
    `${JSON.stringify(JSON.parse(fs.readFileSync('shorts/current/shorts-state.json', 'utf8')), null, 2)}\n`,
  );
  const copyPath = path.join(dir, 'copy.txt');
  fs.writeFileSync(copyPath, COPY);
  const runner = await import('./shorts-runner.mjs');
  return { dir, copyPath, runner };
}

const readJson = (dir, file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));

test('plan writes a proposal and parks the pipeline at PROPOSED', async () => {
  const { dir, copyPath, runner } = await sandbox();
  const { state } = runner.planCommand({ copyPath, aspectRatio: '9:16', theme: 'dark', title: '', actor: 'operator' });
  assert.equal(state.state, 'PROPOSED');
  assert.match(state.short_id, /^\d{8}-/);
  assert.equal(state.proposal.approvedBy, null);
  const proposal = readJson(dir, 'proposal.json');
  assert.equal(proposal.scenes.length, 6);
  assert.equal(proposal.approval, undefined);
  assert.equal(fs.existsSync(path.join(dir, 'prompt-package.json')), false);
});

test('prompts are refused while the proposal is still unapproved', async () => {
  const { copyPath, runner } = await sandbox();
  runner.planCommand({ copyPath, aspectRatio: '9:16', theme: 'dark', title: '', actor: 'operator' });
  assert.throws(() => runner.promptsCommand({ actor: 'operator' }), /require state APPROVED/);
});

test('approve then prompts produces a package bound to the recorded digest', async () => {
  const { dir, copyPath, runner } = await sandbox();
  runner.planCommand({ copyPath, aspectRatio: '9:16', theme: 'dark', title: '', actor: 'operator' });
  const approved = runner.approveCommand({ actor: 'reviewer' });
  assert.equal(approved.state.state, 'APPROVED');
  assert.equal(approved.state.proposal.approvedBy, 'reviewer');

  const { promptPackage, state } = runner.promptsCommand({ actor: 'operator' });
  assert.equal(state.state, 'PROMPTS_READY');
  assert.equal(promptPackage.prompts.length, 6);
  assert.equal(promptPackage.proposalDigest, approved.state.proposal.digest);
  assert.deepEqual(readJson(dir, 'prompt-package.json'), promptPackage);
});

test('editing the proposal file after approval blocks prompt generation', async () => {
  const { dir, copyPath, runner } = await sandbox();
  runner.planCommand({ copyPath, aspectRatio: '9:16', theme: 'dark', title: '', actor: 'operator' });
  runner.approveCommand({ actor: 'reviewer' });

  const proposal = readJson(dir, 'proposal.json');
  proposal.scenes[1].cameraMove = 'whip pan the other way';
  fs.writeFileSync(path.join(dir, 'proposal.json'), `${JSON.stringify(proposal, null, 2)}\n`);

  assert.throws(() => runner.promptsCommand({ actor: 'operator' }), /changed after approval/);
  assert.equal(fs.existsSync(path.join(dir, 'prompt-package.json')), false);
});

test('approve fails when no proposal has been planned', async () => {
  const { runner } = await sandbox();
  assert.throws(() => runner.approveCommand({ actor: 'reviewer' }), /missing .*proposal\.json/);
});

test('a title override flows into the short id', async () => {
  const { copyPath, runner } = await sandbox();
  const { state } = runner.planCommand({ copyPath, aspectRatio: '1:1', theme: 'light', title: 'Grid Down', actor: 'operator' });
  assert.match(state.short_id, /grid-down$/);
});
