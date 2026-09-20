import crypto from 'node:crypto';
import { planSemanticShot } from '../video/src/semantic-shot-planner.mjs';

export const SHORTS_DIRECTOR_VERSION = 'shorts-director-v1';
export const PROMPT_PACKAGE_VERSION = 'shorts-prompt-package-v1';
export const PROMPT_TARGET = 'gemini-omni-flash';

export const SCENE_COUNT = 6;
export const SCENE_SECONDS = 10;
export const MIN_VOICEOVER_WORDS = 110;
export const MAX_VOICEOVER_WORDS = 170;

const ASPECT_RATIOS = new Set(['9:16', '16:9', '1:1']);

const THEMES = {
  dark: { background: '#0b0d12', foreground: '#eae7e1', accent: '#ffb340' },
  light: { background: '#f4f1ea', foreground: '#14161c', accent: '#c2410c' },
};

// Every clip is generated in isolation, so each prompt has to re-state the
// house style or Gemini drifts between scenes.
const NEGATIVE_CONSTRAINTS = [
  'no on-screen text, captions, subtitles, or watermarks',
  'no photorealistic humans, faces, or recognisable real people',
  'no brand logos, trademarks, or copyrighted characters',
  'no extra limbs, warped anatomy, or flickering figure geometry',
  'no camera shake, lens flare, or film grain',
  'no palette drift away from the stated background and accent colours',
];

const TRANSITIONS = [
  'hard cut on the accent beat',
  'accent-colour wipe left to right',
  'match cut on the subject silhouette',
  'quick dip to background colour',
  'scale-through push on the subject',
  'hold, then hard cut to black',
];

const SFX_BY_KIND = {
  contrast: 'dry buzzer on the wrong state, soft chime on the correct one',
  process: 'three ascending clicks, one per stage',
  cutaway: 'low mechanical slide as the layer opens',
  'cause-effect': 'impact thud on the cause, rising tail on the effect',
  network: 'sequential taps radiating from centre',
  scale: 'deep swell as the larger object resolves',
  timeline: 'metronome ticks under the state changes',
  'object-focus': 'single soft whoosh on entry',
};

const BGM_BY_TONE = {
  'curious escalation': { mood: 'minimal pulse that tightens every 10 seconds', reference: 'sparse synth ostinato, no melody' },
  'plain explainer': { mood: 'steady low pad, no percussion', reference: 'warm sustained drone' },
  'urgent brief': { mood: 'driving sixteenth-note pulse', reference: 'muted staccato bass' },
};

const fail = (message) => {
  throw new Error(message);
};

const cleanText = (value) =>
  String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const countWords = (value) => (cleanText(value).match(/[^\s]+/g) || []).length;

const splitSentences = (value) =>
  cleanText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const titleCase = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());

function deriveTone(sentences) {
  const joined = sentences.join(' ').toLowerCase();
  if (/\bwhat if\b|\bimagine\b|\bwhy\b/.test(joined)) return 'curious escalation';
  if (/\bcollapse\b|\bfail(?:s|ure)?\b|\bdanger\b|\bwithin (?:hours|minutes)\b/.test(joined)) return 'urgent brief';
  return 'plain explainer';
}

function deriveTitle(sentences) {
  const first = sentences[0] || '';
  const stripped = first.replace(/[.!?]+$/, '');
  const words = stripped.split(' ').slice(0, 9).join(' ');
  return titleCase(words).slice(0, 60);
}

function deriveHook(sentences) {
  const first = sentences[0] || '';
  const clause = first.split(/[,;:]/)[0].replace(/[.!?]+$/, '');
  return countWords(clause) >= 4 ? clause : first.replace(/[.!?]+$/, '');
}

// Gemini bills per clip, so the voiceover is trimmed to the band the six
// 10-second scenes can actually carry rather than being padded out.
function condenseVoiceover(sentences) {
  const total = countWords(sentences.join(' '));
  if (total < MIN_VOICEOVER_WORDS) {
    fail(`copy is ${total} words; need at least ${MIN_VOICEOVER_WORDS} to fill ${SCENE_COUNT} scenes`);
  }
  if (total <= MAX_VOICEOVER_WORDS) return sentences;
  const kept = [];
  let running = 0;
  for (const sentence of sentences) {
    const next = running + countWords(sentence);
    if (next > MAX_VOICEOVER_WORDS && kept.length >= SCENE_COUNT) break;
    kept.push(sentence);
    running = next;
  }
  if (kept.length < SCENE_COUNT) {
    fail(`copy condenses to ${kept.length} sentences; need at least ${SCENE_COUNT}`);
  }
  // Six short sentences followed by one very long one can leave the kept set
  // under the floor, so the band is re-checked rather than assumed.
  const keptWords = countWords(kept.join(' '));
  if (keptWords < MIN_VOICEOVER_WORDS) {
    fail(`copy condenses to ${keptWords} words; rewrite so the first ${SCENE_COUNT} sentences carry at least ${MIN_VOICEOVER_WORDS}`);
  }
  return kept;
}

// Sentences are never evenly divisible by six, so scenes are filled greedily
// against a running word budget while reserving enough sentences for every
// scene that has not been opened yet.
function distributeScenes(sentences) {
  if (sentences.length < SCENE_COUNT) {
    fail(`copy has ${sentences.length} sentences; need at least ${SCENE_COUNT}`);
  }
  const buckets = Array.from({ length: SCENE_COUNT }, () => []);
  const targetPerScene = countWords(sentences.join(' ')) / SCENE_COUNT;
  let index = 0;
  let running = 0;
  for (let i = 0; i < sentences.length; i += 1) {
    const unplaced = sentences.length - i;
    const unopened = SCENE_COUNT - index - 1;
    // Keeping this sentence in the current scene must still leave one
    // sentence for each scene that has not been opened yet.
    const mustAdvance = unplaced - 1 < unopened;
    const wantAdvance = running >= targetPerScene;
    if (index < SCENE_COUNT - 1 && (mustAdvance || wantAdvance)) {
      index += 1;
      running = 0;
    }
    buckets[index].push(sentences[i]);
    running += countWords(sentences[i]);
  }
  if (buckets.some((bucket) => !bucket.length)) fail('scene distribution left an empty scene');
  return buckets.map((bucket) => bucket.join(' '));
}

// The shared planner quotes object-focus narration sliced at 90 characters,
// which can land mid-word and can double the sentence period. Each clip is
// generated in isolation from its prompt text, so either artefact would be read
// literally as part of the shot brief.
function tidyObjective(objective, narration) {
  const match = objective.match(/^(.*?: )(.+?)\.*$/);
  if (!match) return objective;
  const [, prefix, fragment] = match;
  // The fragment was captured without its trailing period, so the narration is
  // compared the same way; otherwise a whole, untruncated sentence looks short
  // by one character and gets cut anyway.
  const cleaned = cleanText(narration).replace(/\.*$/, '');
  // Only the narration-quoting branch yields a fragment that is a prefix of the
  // scene's own narration; the templated objectives are left alone.
  if (!cleaned.startsWith(fragment)) return objective;
  let kept = fragment;
  if (cleaned.length > fragment.length) {
    const sentenceEnd = fragment.lastIndexOf('.');
    const cut = sentenceEnd > 0 ? sentenceEnd : fragment.lastIndexOf(' ');
    if (cut <= 0) return objective;
    kept = fragment.slice(0, cut);
  }
  return `${prefix}${kept.trim().replace(/\.*$/, '')}.`;
}

function sceneHeadline(shot) {
  return `${shot.subject.label} ${shot.kind === 'object-focus' ? 'IN FOCUS' : shot.kind.toUpperCase().replace('-', ' ')}`.slice(0, 40);
}

export function planShortsProposal({ copy, aspectRatio = '9:16', theme = 'dark', title = '' } = {}) {
  if (!ASPECT_RATIOS.has(aspectRatio)) fail(`unsupported aspectRatio: ${aspectRatio}`);
  if (!THEMES[theme]) fail(`unsupported theme: ${theme}`);

  const sentences = condenseVoiceover(splitSentences(copy));
  const narrations = distributeScenes(sentences);
  const tone = deriveTone(sentences);
  const colorDirection = THEMES[theme];

  const scenes = narrations.map((narration, index) => {
    const shot = planSemanticShot({ text: narration, sceneHeadline: '', index });
    return {
      index,
      startSeconds: index * SCENE_SECONDS,
      endSeconds: (index + 1) * SCENE_SECONDS,
      headline: sceneHeadline(shot),
      narration,
      shotKind: shot.kind,
      subject: shot.subject.label,
      secondary: shot.secondary.label,
      visualObjective: tidyObjective(shot.visualObjective, narration),
      composition: shot.composition,
      cameraMove: shot.camera,
      transition: TRANSITIONS[index % TRANSITIONS.length],
      sfx: SFX_BY_KIND[shot.kind] || SFX_BY_KIND['object-focus'],
    };
  });

  const voiceoverText = narrations.join(' ');
  const proposal = {
    version: SHORTS_DIRECTOR_VERSION,
    title: cleanText(title) || deriveTitle(sentences),
    coreIdea: sentences[0],
    hook: deriveHook(sentences),
    tone,
    aspectRatio,
    theme,
    colorDirection,
    bgm: BGM_BY_TONE[tone],
    voiceover: {
      text: voiceoverText,
      wordCount: countWords(voiceoverText),
      estimatedSeconds: SCENE_COUNT * SCENE_SECONDS,
    },
    scenes,
    totalSeconds: SCENE_COUNT * SCENE_SECONDS,
  };
  // Self-check: nothing downstream should ever receive a proposal that would
  // fail the same validation at approval time.
  validateProposal(proposal);
  return proposal;
}

// Key order must not change the digest, and every nested field has to be
// covered. JSON.stringify's replacer array cannot do this: it is an allowlist
// applied at every depth, which would silently drop nested scene fields.
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

// The digest covers the directed content only. Approval is stamped alongside
// it, so re-hashing a proposal that carries an approval still reproduces the
// value that was signed.
export function proposalDigest(proposal) {
  if (!proposal || typeof proposal !== 'object') fail('proposal must be an object');
  const { approval: _approval, ...directed } = proposal;
  return `sha256:${crypto.createHash('sha256').update(canonicalize(directed)).digest('hex')}`;
}

export function validateProposal(proposal) {
  if (!proposal || typeof proposal !== 'object') fail('proposal must be an object');
  if (proposal.version !== SHORTS_DIRECTOR_VERSION) fail(`unsupported proposal version: ${proposal.version}`);
  if (!ASPECT_RATIOS.has(proposal.aspectRatio)) fail(`unsupported aspectRatio: ${proposal.aspectRatio}`);
  if (!THEMES[proposal.theme]) fail(`unsupported theme: ${proposal.theme}`);
  if (!cleanText(proposal.title)) fail('proposal title is empty');
  if (!cleanText(proposal.hook)) fail('proposal hook is empty');
  if (!Array.isArray(proposal.scenes) || proposal.scenes.length !== SCENE_COUNT) {
    fail(`proposal must carry exactly ${SCENE_COUNT} scenes`);
  }
  const words = proposal.voiceover?.wordCount;
  if (!Number.isInteger(words) || words < MIN_VOICEOVER_WORDS || words > MAX_VOICEOVER_WORDS) {
    fail(`voiceover wordCount out of band: ${words}`);
  }
  proposal.scenes.forEach((scene, index) => {
    if (scene.index !== index) fail(`scene ${index} has index ${scene.index}`);
    if (scene.startSeconds !== index * SCENE_SECONDS) fail(`scene ${index} has wrong startSeconds`);
    if (scene.endSeconds !== (index + 1) * SCENE_SECONDS) fail(`scene ${index} has wrong endSeconds`);
    if (!cleanText(scene.narration)) fail(`scene ${index} has empty narration`);
    if (!cleanText(scene.visualObjective)) fail(`scene ${index} has empty visualObjective`);
  });
  return true;
}

export function approveProposal(proposal, { actor, at = new Date().toISOString() } = {}) {
  validateProposal(proposal);
  if (!cleanText(actor)) fail('approval requires an actor');
  const { approval: _ignored, ...directed } = proposal;
  return { ...directed, approval: { approved: true, actor: cleanText(actor), at, digest: proposalDigest(directed) } };
}

function sceneTimeBeats(scene) {
  const { startSeconds, endSeconds } = scene;
  const span = endSeconds - startSeconds;
  return [
    `0.0-${(span * 0.2).toFixed(1)}s: ${scene.subject} enters on ${scene.composition}`,
    `${(span * 0.2).toFixed(1)}-${(span * 0.7).toFixed(1)}s: ${scene.visualObjective}`,
    `${(span * 0.7).toFixed(1)}-${span.toFixed(1)}s: settle, then ${scene.transition}`,
  ];
}

function scenePromptText(scene, proposal) {
  const { background, foreground, accent } = proposal.colorDirection;
  return [
    `High-contrast stick-figure animation, ${proposal.aspectRatio}, ${proposal.theme} theme.`,
    `Background ${background}; figures and linework ${foreground}; single accent ${accent} used only on the beat that matters.`,
    `Scene ${scene.index + 1} of ${SCENE_COUNT}: ${scene.headline}.`,
    `Composition: ${scene.composition}.`,
    `Camera: ${scene.cameraMove}.`,
    `Action: ${scene.visualObjective}`,
    `Duration exactly ${scene.endSeconds - scene.startSeconds} seconds, ending on a held frame.`,
  ].join(' ');
}

export function buildPromptPackage(proposal) {
  validateProposal(proposal);
  const approval = proposal.approval;
  if (!approval || approval.approved !== true) {
    fail('proposal is not approved; run approveProposal before generating prompts');
  }
  const digest = proposalDigest(proposal);
  if (approval.digest !== digest) {
    fail(`proposal changed after approval (approved ${approval.digest}, now ${digest})`);
  }
  return {
    version: PROMPT_PACKAGE_VERSION,
    target: PROMPT_TARGET,
    aspectRatio: proposal.aspectRatio,
    proposalDigest: digest,
    approvedBy: approval.actor,
    approvedAt: approval.at,
    voiceover: proposal.voiceover.text,
    bgm: proposal.bgm,
    prompts: proposal.scenes.map((scene) => ({
      index: scene.index,
      sceneHeadline: scene.headline,
      durationSeconds: scene.endSeconds - scene.startSeconds,
      prompt: scenePromptText(scene, proposal),
      timeBeats: sceneTimeBeats(scene),
      sfx: scene.sfx,
      negativeConstraints: NEGATIVE_CONSTRAINTS,
    })),
  };
}
