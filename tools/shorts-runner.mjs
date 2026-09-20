#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { planShortsProposal, approveProposal, buildPromptPackage, proposalDigest } from './shorts-director.mjs';
import { readState, atomicWrite, transition, statePath } from './shorts-state.mjs';

export const DEFAULT_SHORTS_DIR = 'shorts/current';

// Resolved per call for the same reason as the state path.
export const shortsDir = () => process.env.SHORTS_DIR || DEFAULT_SHORTS_DIR;
const PROPOSAL_FILE = 'proposal.json';
const PACKAGE_FILE = 'prompt-package.json';

const fail = (message) => {
  throw new Error(message);
};

const writeJson = (file, value) => {
  fs.mkdirSync(shortsDir(), { recursive: true });
  fs.writeFileSync(path.join(shortsDir(), file), `${JSON.stringify(value, null, 2)}\n`);
};

const readJson = (file) => {
  const full = path.join(shortsDir(), file);
  if (!fs.existsSync(full)) fail(`missing ${full}; run an earlier stage first`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
};

const shortIdFor = (title) =>
  `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)}`;

export function planCommand({ copyPath, aspectRatio, theme, title, actor }) {
  const copy = fs.readFileSync(copyPath, 'utf8');
  const proposal = planShortsProposal({ copy, aspectRatio, theme, title });
  writeJson(PROPOSAL_FILE, proposal);
  const current = readState();
  const drafted = transition(current, { expectedRevision: current.state_revision, to: 'DRAFTED', actor, reason: 'proposal planned' });
  drafted.short_id = shortIdFor(proposal.title);
  const proposed = transition(drafted, { expectedRevision: drafted.state_revision, to: 'PROPOSED', actor, reason: 'awaiting human approval' });
  proposed.proposal = { digest: proposalDigest(proposal), approvedBy: null, approvedAt: null };
  atomicWrite(proposed);
  return { proposal, state: proposed };
}

export function approveCommand({ actor }) {
  const proposal = readJson(PROPOSAL_FILE);
  const approved = approveProposal(proposal, { actor });
  writeJson(PROPOSAL_FILE, approved);
  const current = readState();
  const state = transition(current, { expectedRevision: current.state_revision, to: 'APPROVED', actor, reason: 'human approved the director proposal' });
  state.proposal = { digest: approved.approval.digest, approvedBy: approved.approval.actor, approvedAt: approved.approval.at };
  atomicWrite(state);
  return { proposal: approved, state };
}

export function promptsCommand({ actor }) {
  const proposal = readJson(PROPOSAL_FILE);
  const current = readState();
  if (current.state !== 'APPROVED') fail(`prompts require state APPROVED, found ${current.state}`);
  const promptPackage = buildPromptPackage(proposal);
  if (promptPackage.proposalDigest !== current.proposal.digest) {
    fail(`state digest ${current.proposal.digest} does not match package ${promptPackage.proposalDigest}`);
  }
  writeJson(PACKAGE_FILE, promptPackage);
  const state = transition(current, { expectedRevision: current.state_revision, to: 'PROMPTS_READY', actor, reason: 'prompt package generated' });
  atomicWrite(state);
  return { promptPackage, state };
}

const usage = () => {
  console.error(
    [
      'Usage:',
      '  node tools/shorts-runner.mjs plan --copy <file> [--aspect 9:16] [--theme dark] [--title "..."] --actor <name>',
      '  node tools/shorts-runner.mjs approve --actor <name>',
      '  node tools/shorts-runner.mjs prompts --actor <name>',
      '',
      `State lives in ${statePath()}; artifacts in ${shortsDir()}/.`,
    ].join('\n'),
  );
  process.exit(2);
};

const parseFlags = (argv) => {
  const flags = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) usage();
    flags[argv[i].slice(2)] = argv[i + 1];
  }
  return flags;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const [, , cmd, ...argv] = process.argv;
  try {
    const flags = parseFlags(argv);
    if (!flags.actor) usage();
    if (cmd === 'plan') {
      if (!flags.copy) usage();
      const { proposal, state } = planCommand({
        copyPath: flags.copy,
        aspectRatio: flags.aspect || '9:16',
        theme: flags.theme || 'dark',
        title: flags.title || '',
        actor: flags.actor,
      });
      console.log(`Proposed "${proposal.title}" (${proposal.tone}, ${proposal.voiceover.wordCount} words) -> ${state.state}`);
      proposal.scenes.forEach((scene) => console.log(`  ${scene.startSeconds}-${scene.endSeconds}s ${scene.headline}: ${scene.visualObjective}`));
      console.log(`\nReview ${path.join(shortsDir(), PROPOSAL_FILE)}, then: node tools/shorts-runner.mjs approve --actor <name>`);
    } else if (cmd === 'approve') {
      const { state } = approveCommand({ actor: flags.actor });
      console.log(`Approved ${state.proposal.digest} -> ${state.state}`);
    } else if (cmd === 'prompts') {
      const { promptPackage, state } = promptsCommand({ actor: flags.actor });
      console.log(`Wrote ${promptPackage.prompts.length} ${promptPackage.target} prompts -> ${state.state}`);
    } else {
      usage();
    }
  } catch (error) {
    console.error(`shorts-runner ${cmd || ''}: ${error.message}`);
    process.exit(1);
  }
}
