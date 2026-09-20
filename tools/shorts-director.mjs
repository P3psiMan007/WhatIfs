import crypto from 'node:crypto';
import { planSemanticShot } from '../video/src/semantic-shot-planner.mjs';

export const SHORTS_DIRECTOR_VERSION = 'shorts-director-v2';
export const PROMPT_PACKAGE_VERSION = 'shorts-prompt-package-v2';
export const PROMPT_TARGET = 'gemini-omni-flash';

export const SCENE_COUNT = 6;
export const SCENE_SECONDS = 10;
export const MIN_VOICEOVER_WORDS = 130;
export const MAX_VOICEOVER_WORDS = 150;
export const MIN_VISUAL_DEVICES = 4;

export const ASPECT_RATIOS = ['9:16', '16:9', '1:1'];
export const THEMES_AVAILABLE = ['dark', 'light'];

const ASPECT_SET = new Set(ASPECT_RATIOS);

// Style 1 Classic Minimalist. The canvas is stated in words because the theme
// polarity has to survive into the prompt, where hex is forbidden.
const THEMES = {
  dark: {
    canvas: 'flat, uniform, pitch-black canvas with no gradient, texture, bloom, fog or 3D depth',
    line: 'pure white line art at uniform medium weight',
    background: '#000000',
    foreground: '#ffffff',
  },
  light: {
    canvas: 'flat, uniform, digitally pure-white canvas with no gray tint, paper texture, gradient, shadow, lighting or 3D depth',
    line: 'pure black line art at uniform medium weight',
    background: '#ffffff',
    foreground: '#000000',
  },
};

// Repeated verbatim in every prompt. Without it the model renders scenery with
// no actor, which reads as a diagram rather than a story.
const CHARACTER_DNA =
  'A minimalist 2D stick figure with a hollow circular head, no facial features, no hair, no clothing, no filled body, uniform medium line weight.';

// Identical in all six prompts, or independently generated clips each invent
// their own voice. Mirrors the episode pipeline's locked female narrator.
const NARRATOR_LOCK =
  'Identical narrator: calm, articulate, warm adult female voice, measured explanatory tone, unhurried delivery, voice-first mix.';

// At most three saturated accents, named in ordinary words, with a fixed role
// each so the meaning of a colour never changes between scenes.
const ACCENT_ROLES = [
  { color: 'warm gold', role: 'the energy or signal that moves' },
  { color: 'vivid red', role: 'failure, overload or the wrong state' },
  { color: 'electric blue', role: 'protection, correction or the restored state' },
];

const RATIO_STAGING = {
  '9:16': 'depth, stacked vertical motion and top-to-bottom reveals, with the subject kept clear of the extreme top and bottom edges',
  '16:9': 'left, centre and right staging with lateral tracking and deliberate negative space',
  '1:1': 'compact central composition with short travel paths',
};

// Four devices per shot kind, so every clip clears the density floor and the
// figure always has something concrete to do.
const DEVICES_BY_KIND = {
  contrast: [
    'a hard dividing line splitting the frame in two',
    'the intuitive wrong model drawn first, then struck through',
    'the actual mechanism drawn beside it at the same scale',
    'the stick figure stepping from the wrong side to the right one',
  ],
  process: [
    'three stage markers drawn along a single path',
    'a travelling pulse moving from stage to stage',
    'the stick figure walking the pulse forward with a hand on it',
    'each stage redrawing as the pulse passes through it',
  ],
  cutaway: [
    'an outer shell hinged open to expose the inside',
    'internal layers drawn in clean section',
    'the stick figure leaning in through the opening to look',
    'a pointer line tracing the internal path',
  ],
  'cause-effect': [
    'the cause staged at the top of the frame',
    'a bridging line falling from cause to effect',
    'the stick figure bracing as the effect lands',
    'the effect spreading outward from the impact point',
  ],
  network: [
    'a central node with radiating spokes',
    'dependent nodes going dark one after another',
    'the stick figure running between nodes trying to hold them',
    'a visible failure front sweeping across the network',
  ],
  scale: [
    'two objects drawn at their true relative size',
    'the stick figure standing beside the smaller object for scale',
    'a measuring bracket drawn between the two',
    'the larger object crowding the edges of the frame',
  ],
  timeline: [
    'a time rail drawn across the frame',
    'state markers placed along the rail',
    'the stick figure stepping forward from marker to marker',
    'each state redrawing as the figure reaches it',
  ],
  'object-focus': [
    'the object drawn large against open negative space',
    'the stick figure physically handling the object',
    'a detail callout opening on the part that matters',
    'the object visibly changing state on the final beat',
  ],
};

const SFX_BY_KIND = {
  contrast: 'dry buzzer on the wrong state, soft chime on the correct one',
  process: 'three ascending clicks, one per stage',
  cutaway: 'low mechanical slide as the shell opens',
  'cause-effect': 'impact thud on the cause, rising tail on the effect',
  network: 'sequential taps radiating from centre',
  scale: 'deep swell as the larger object resolves',
  timeline: 'metronome ticks under the state changes',
  'object-focus': 'single soft whoosh on entry, hard click on the state change',
};

const BGM_BY_TONE = {
  'curious escalation': { mood: 'minimal pulse that tightens every ten seconds', reference: 'sparse synth ostinato with no melody' },
  'plain explainer': { mood: 'steady low pad with no percussion', reference: 'warm sustained drone' },
  'urgent brief': { mood: 'driving sixteenth-note pulse', reference: 'muted staccato bass figure' },
};

const NEGATIVE_CONSTRAINTS = [
  'no visible words, letters, numbers, captions, subtitles, interface copy, palette labels, logos or watermarks',
  'no speech bubbles, comic balloons or visual text boxes',
  'no altered, omitted, repeated, reordered or added dialogue',
  'no photorealism, 3D humanoid rendering or recognisable real people',
  'no facial features, pupils, realistic eyes, lips or hair on the figure',
  'no extra limbs, malformed anatomy, disconnected lines or changed proportions',
  'no broken or changing line weight',
  'no inverted theme polarity and no colours outside the stated accents',
  'no abstract liquid or shape morphing between unrelated objects',
  'no camera shake, lens flare or film grain',
];

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

// "Never select an aspect ratio or style silently" — every missing item is
// reported at once rather than one refusal at a time.
export function missingSetup({ aspectRatio, theme } = {}) {
  const missing = [];
  if (!ASPECT_SET.has(aspectRatio)) missing.push(`aspectRatio (one of ${ASPECT_RATIOS.join(', ')})`);
  if (!THEMES[theme]) missing.push(`theme (one of ${THEMES_AVAILABLE.join(', ')})`);
  return missing;
}

function deriveTone(sentences) {
  const joined = sentences.join(' ').toLowerCase();
  if (/\bwhat if\b|\bimagine\b|\bwhy\b/.test(joined)) return 'curious escalation';
  if (/\bcollapse\b|\bfail(?:s|ure)?\b|\bdanger\b|\bwithin (?:hours|minutes)\b/.test(joined)) return 'urgent brief';
  return 'plain explainer';
}

function deriveTitle(sentences) {
  const stripped = (sentences[0] || '').replace(/[.!?]+$/, '');
  return titleCase(stripped.split(' ').slice(0, 9).join(' ')).slice(0, 60);
}

function deriveHook(sentences) {
  const first = sentences[0] || '';
  const clause = first.split(/[,;:]/)[0].replace(/[.!?]+$/, '');
  return countWords(clause) >= 4 ? clause : first.replace(/[.!?]+$/, '');
}

function condenseVoiceover(sentences) {
  const total = countWords(sentences.join(' '));
  if (total < MIN_VOICEOVER_WORDS) {
    fail(`copy is ${total} words; need ${MIN_VOICEOVER_WORDS}-${MAX_VOICEOVER_WORDS} to fill ${SCENE_COUNT} scenes`);
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
// which can land mid-word and can double the sentence period.
function tidyObjective(objective, narration) {
  const match = objective.match(/^(.*?: )(.+?)\.*$/);
  if (!match) return objective;
  const [, prefix, fragment] = match;
  const cleaned = cleanText(narration).replace(/\.*$/, '');
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
  const suffix = shot.kind === 'object-focus' ? 'IN FOCUS' : shot.kind.toUpperCase().replaceAll('-', ' ');
  return `${shot.subject.label} ${suffix}`.slice(0, 40);
}

const closingStateFor = (subject, index) =>
  index === SCENE_COUNT - 1
    ? `${subject} held at rest, accent fading to nothing, frame settling empty`
    : `${subject} held at rest centre frame with its accent still lit, everything else cleared`;

const openingStateFor = (scene, previous) =>
  previous
    ? `inherit exactly: ${previous.closingState}. Begin from that held frame.`
    : 'cold open on the empty canvas; the first element is drawn on within the first half second.';

// Beats run [0-3s] / [3-7s] / [7-10s] so something changes every two to three
// seconds rather than one slow event filling the clip.
function sceneBeats(scene) {
  const span = scene.endSeconds - scene.startSeconds;
  const a = (span * 0.3).toFixed(0);
  const b = (span * 0.7).toFixed(0);
  return [
    `[0-${a}s] establish or inherit the premise: ${scene.visualDevices[0]}, with ${scene.subject} entering on ${scene.composition}.`,
    `[${a}-${b}s] transform and escalate through character action: ${scene.visualDevices[1]}, then ${scene.visualDevices[2]}.`,
    `[${b}-${span}s] deliver the climax and hand off: ${scene.visualDevices[3]}, then ${scene.transition}.`,
  ];
}

const TRANSITIONS = [
  'hard cut on the accent beat',
  'accent wipe across the frame',
  'match cut on the subject silhouette',
  'quick dip to the background colour',
  'scale-through push on the subject',
  'hold, then hard cut to an empty canvas',
];

export function planShortsProposal({ copy, aspectRatio, theme, title = '' } = {}) {
  const missing = missingSetup({ aspectRatio, theme });
  if (missing.length) fail(`setup incomplete; supply: ${missing.join('; ')}`);

  const sentences = condenseVoiceover(splitSentences(copy));
  const narrations = distributeScenes(sentences);
  const tone = deriveTone(sentences);
  const themeSpec = THEMES[theme];

  const scenes = [];
  narrations.forEach((narration, index) => {
    const shot = planSemanticShot({ text: narration, sceneHeadline: '', index });
    const devices = DEVICES_BY_KIND[shot.kind] || DEVICES_BY_KIND['object-focus'];
    const scene = {
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
      visualDevices: [...devices],
      transition: TRANSITIONS[index % TRANSITIONS.length],
      sfx: SFX_BY_KIND[shot.kind] || SFX_BY_KIND['object-focus'],
    };
    scene.openingState = openingStateFor(scene, scenes[index - 1]);
    scene.closingState = closingStateFor(scene.subject, index);
    scene.beats = sceneBeats(scene);
    scenes.push(scene);
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
    canvas: themeSpec.canvas,
    lineTreatment: themeSpec.line,
    characterDna: CHARACTER_DNA,
    narratorLock: NARRATOR_LOCK,
    accentRoles: ACCENT_ROLES.map((entry) => ({ ...entry })),
    // Hex is kept for human review of the proposal only; it is never allowed
    // into a generation prompt.
    reviewSwatch: { background: themeSpec.background, foreground: themeSpec.foreground },
    bgm: BGM_BY_TONE[tone],
    voiceover: {
      text: voiceoverText,
      wordCount: countWords(voiceoverText),
      estimatedSeconds: SCENE_COUNT * SCENE_SECONDS,
    },
    scenes,
    totalSeconds: SCENE_COUNT * SCENE_SECONDS,
  };
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
  const missing = missingSetup(proposal);
  if (missing.length) fail(`setup incomplete; supply: ${missing.join('; ')}`);
  if (!cleanText(proposal.title)) fail('proposal title is empty');
  if (!cleanText(proposal.hook)) fail('proposal hook is empty');
  if (proposal.characterDna !== CHARACTER_DNA) fail('character DNA lock is missing or altered');
  if (proposal.narratorLock !== NARRATOR_LOCK) fail('narrator lock is missing or altered');
  if (!Array.isArray(proposal.accentRoles) || proposal.accentRoles.length > 3 || !proposal.accentRoles.length) {
    fail('accentRoles must carry between one and three accents');
  }
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
    if (!Array.isArray(scene.visualDevices) || scene.visualDevices.length < MIN_VISUAL_DEVICES) {
      fail(`scene ${index} needs at least ${MIN_VISUAL_DEVICES} visual devices`);
    }
    if (!Array.isArray(scene.beats) || scene.beats.length !== 3) fail(`scene ${index} needs three timed beats`);
    if (!cleanText(scene.openingState)) fail(`scene ${index} has no opening state`);
    if (!cleanText(scene.closingState)) fail(`scene ${index} has no closing state`);
    // Every cut must name the same frame on both sides or the clips do not join.
    if (index > 0 && !scene.openingState.includes(proposal.scenes[index - 1].closingState)) {
      fail(`scene ${index} opening state does not inherit scene ${index - 1} closing state`);
    }
  });
  return true;
}

export function approveProposal(proposal, { actor, at = new Date().toISOString() } = {}) {
  validateProposal(proposal);
  if (!cleanText(actor)) fail('approval requires an actor');
  const { approval: _ignored, ...directed } = proposal;
  return { ...directed, approval: { approved: true, actor: cleanText(actor), at, digest: proposalDigest(directed) } };
}

const accentSentence = (accentRoles) =>
  accentRoles.map((entry) => `${entry.color} marks ${entry.role}`).join('; ');

// Order follows the upstream production contract: output spec, environment,
// character, palette, composition, inherited frame, beats, dialogue, narrator,
// audio, handoff frame, negatives. Each prompt is standalone.
function scenePromptText(scene, proposal) {
  const isFirst = scene.index === 0;
  const span = scene.endSeconds - scene.startSeconds;
  return [
    `Output: approximately ${span} seconds, ${proposal.aspectRatio}, 720p, 24 FPS, synchronized audio.`,
    `Environment: ${proposal.canvas}; ${proposal.lineTreatment}.`,
    `Character: ${proposal.characterDna} Keep this design identical to every other clip.`,
    `Palette: ${accentSentence(proposal.accentRoles)}. Use no other colours, and use an accent only on the beat that earns it.`,
    `Composition: ${scene.composition}, staged for ${proposal.aspectRatio} using ${RATIO_STAGING[proposal.aspectRatio]}. Camera: ${scene.cameraMove}.`,
    `Opening frame: ${scene.openingState}`,
    `Scene ${scene.index + 1} of ${SCENE_COUNT} — ${scene.headline}. ${scene.visualObjective}`,
    ...scene.beats,
    `Include all of these devices: ${scene.visualDevices.join('; ')}. Something must visibly change every two to three seconds and the figure is never idle.`,
    `Audio voiceover only, strictly no speech bubbles, no dialogue boxes. The narrator says exactly: "${scene.narration}" Do not add, omit, paraphrase, repeat, reorder, caption, subtitle or visually transcribe these words.`,
    proposal.narratorLock,
    isFirst
      ? `Music: ${proposal.bgm.mood} — this clip establishes the theme for the whole piece. Synchronized crisp SFX on physical actions: ${scene.sfx}.`
      : `Music: seamlessly continue the identical ${proposal.bgm.reference} from clip 1, maintaining identical tempo, instrumentation and momentum. Synchronized crisp SFX on physical actions: ${scene.sfx}.`,
    `Closing frame: ${scene.closingState}`,
    `Do not include: ${NEGATIVE_CONSTRAINTS.join('; ')}.`,
  ].join('\n');
}

// Both sides of every cut name the same frame, which is what makes the six
// independently generated clips join without a visible seam.
function stitchingGuide(scenes) {
  return scenes.slice(0, -1).map((scene) => ({
    cut: `${scene.index + 1} -> ${scene.index + 2}`,
    atSeconds: scene.endSeconds,
    matchedState: scene.closingState,
    note: `${scene.transition}; short audio crossfade under the voiceover, which runs continuously across the cut.`,
  }));
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
  const prompts = proposal.scenes.map((scene) => ({
    index: scene.index,
    sceneHeadline: scene.headline,
    durationSeconds: scene.endSeconds - scene.startSeconds,
    prompt: scenePromptText(scene, proposal),
    timeBeats: [...scene.beats],
    visualDevices: [...scene.visualDevices],
    sfx: scene.sfx,
    negativeConstraints: [...NEGATIVE_CONSTRAINTS],
  }));
  // Technical colour notation in a prompt gets rendered literally as interface
  // text by some models, so it is checked rather than merely avoided.
  for (const entry of prompts) {
    const notation = entry.prompt.match(/#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(|\bpantone\b/i);
    if (notation) fail(`prompt ${entry.index} contains technical colour notation: ${notation[0]}`);
  }
  return {
    version: PROMPT_PACKAGE_VERSION,
    target: PROMPT_TARGET,
    aspectRatio: proposal.aspectRatio,
    proposalDigest: digest,
    approvedBy: approval.actor,
    approvedAt: approval.at,
    globalContinuity: {
      aspectRatio: proposal.aspectRatio,
      style: `Style 1 Classic Minimalist, ${proposal.theme} theme`,
      canvas: proposal.canvas,
      character: proposal.characterDna,
      accents: proposal.accentRoles.map((entry) => entry.color),
      narrator: proposal.narratorLock,
      audioArc: proposal.bgm,
    },
    voiceover: proposal.voiceover.text,
    prompts,
    stitchingGuide: stitchingGuide(proposal.scenes),
  };
}
