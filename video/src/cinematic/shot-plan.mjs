// The Episode 1 hook shot plan.
//
// Two rules this module exists to enforce, both of which the rejected render
// broke:
//   1. ONE VISUAL OWNER PER SHOT. Every entry names exactly one `shot`
//      component. Nothing composites a second subject on top of a finished one.
//   2. NO UNCOVERED TIME. Shots are stored as boundaries, not durations, and
//      are expanded so that shot N ends exactly where shot N+1 begins, with the
//      last shot running to the end of the film. Narration pauses cannot fall
//      through to an empty canvas.

export const HOOK_SHOTS = Object.freeze([
  {id: 'clock-macro', shot: 'ClockMacro', start: 0.0, intent: 'Last night. A clock nobody will need tomorrow.'},
  {id: 'bedroom-night', shot: 'BedroomNight', start: 3.6, intent: 'The final bedtime, seen once and never again.'},
  {id: 'window-dawn', shot: 'WindowDawn', start: 7.3, intent: 'Night hands over to morning.'},
  {id: 'bedroom-morning', shot: 'BedroomMorning', start: 10.7, intent: 'Match cut: same room, same frame, empty bed.'},
  {id: 'clock-dissolve', shot: 'ClockDissolve', start: 13.1, intent: 'The object that ruled the morning comes apart.'},
  {id: 'city-night', shot: 'CityNight', start: 15.8, intent: 'A city that stopped switching off.'},
  {id: 'city-sweep', shot: 'CitySweep', start: 18.9, intent: 'Day sweeps over it and nothing slows down.'},
  {id: 'hours-graphic', shot: 'HoursGraphic', start: 21.9, intent: 'The single number worth putting on screen.'},
  {id: 'closing-window', shot: 'ClosingWindow', start: 25.6, intent: 'One person, awake, holding the extra hours.'},
]);

/**
 * Expand shot boundaries into gapless frame ranges.
 * Each shot is extended by `overlapFrames` so that consecutive shots share a
 * few frames of coverage; a cut can never expose the empty canvas underneath.
 */
export function buildShotFrames(shots, fps, durationSeconds, overlapFrames = 2) {
  const rate = Math.max(1, Number(fps) || 30);
  const total = Math.max(1, Math.round(Math.max(0, Number(durationSeconds) || 0) * rate));
  const ordered = [...(shots || [])]
    .filter((shot) => Number.isFinite(Number(shot?.start)))
    .sort((a, b) => Number(a.start) - Number(b.start));
  if (!ordered.length) return [];

  return ordered.map((shot, index) => {
    const from = index === 0 ? 0 : Math.max(0, Math.min(total - 1, Math.round(Number(shot.start) * rate)));
    const next = ordered[index + 1];
    const cutAt = next ? Math.max(from + 1, Math.min(total, Math.round(Number(next.start) * rate))) : total;
    const isLast = !next;
    return {
      ...shot,
      from,
      cutAt,
      // Hold past the cut so the incoming shot is already painted underneath.
      durationInFrames: Math.max(1, (isLast ? total : cutAt + overlapFrames) - from),
      shotSeconds: (cutAt - from) / rate,
    };
  });
}

/** Every frame in [0, total) must be owned by at least one shot. */
export function findCoverageGaps(frames, fps, durationSeconds) {
  const rate = Math.max(1, Number(fps) || 30);
  const total = Math.max(1, Math.round(Math.max(0, Number(durationSeconds) || 0) * rate));
  const covered = new Uint8Array(total);
  for (const frame of frames || []) {
    const end = Math.min(total, frame.from + frame.durationInFrames);
    for (let index = Math.max(0, frame.from); index < end; index += 1) covered[index] = 1;
  }
  const gaps = [];
  let open = null;
  for (let index = 0; index < total; index += 1) {
    if (!covered[index] && open === null) open = index;
    if (covered[index] && open !== null) {
      gaps.push({from: open, to: index});
      open = null;
    }
  }
  if (open !== null) gaps.push({from: open, to: total});
  return gaps;
}

// A cue this long still sets on two comfortable lines at 54px on a phone.
const MAX_CUE_CHARS = 52;
const SENTENCE_END = /[.!?]["')\]]?$/;
// Breaking a caption before a connector keeps each cue a readable clause
// instead of chopping a phrase in half.
const CONNECTORS = new Set([
  'and', 'but', 'or', 'so', 'that', 'which', 'while', 'when', 'now', 'because',
  'if', 'then', 'as', 'to', 'for', 'with', 'without', 'after', 'before', 'until',
]);

const cueText = (words) => words.map((word) => word.text).join(' ');

/** Split one sentence into cues that respect the character budget, breaking at
 *  the connector closest to the middle rather than at an arbitrary word. */
function splitSentence(words) {
  if (cueText(words).length <= MAX_CUE_CHARS || words.length < 4) return [words];
  const middle = words.length / 2;
  let best = -1;
  let bestDistance = Infinity;
  for (let index = 1; index < words.length - 1; index += 1) {
    const token = String(words[index].text || '').toLowerCase().replace(/[^a-z']/g, '');
    if (!CONNECTORS.has(token)) continue;
    const distance = Math.abs(index - middle);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  if (best < 0) {
    // No connector: fall back to a comma, then to the midpoint.
    const comma = words.findIndex((word, index) => index > 1 && index < words.length - 2 && /,$/.test(word.text));
    best = comma > 0 ? comma + 1 : Math.round(middle);
  }
  return [...splitSentence(words.slice(0, best)), ...splitSentence(words.slice(best))];
}

/**
 * Turn narration lines into caption cues short enough to read on a phone.
 * Sentences are honoured first, then long sentences are split on structure,
 * and every cue is timed from measured word boundaries.
 */
export function buildCaptionCues(narrationCues, durationSeconds) {
  const limit = Number(durationSeconds) || 0;
  const out = [];
  for (const line of narrationCues || []) {
    const words = line.words || [];
    if (!words.length) continue;
    const sentences = [];
    let group = [];
    for (const word of words) {
      group.push(word);
      if (SENTENCE_END.test(String(word.text || ''))) {
        sentences.push(group);
        group = [];
      }
    }
    if (group.length) sentences.push(group);
    for (const sentence of sentences) {
      for (const chunk of splitSentence(sentence)) {
        if (!chunk.length) continue;
        out.push({text: cueText(chunk), start: chunk[0].start, end: chunk[chunk.length - 1].end});
      }
    }
  }

  // Hold each cue until the next one starts so captions never flicker off
  // between words, and never let the last cue outlive the render.
  return out.map((cue, index) => {
    const next = out[index + 1];
    const naturalEnd = cue.end + 0.28;
    const end = next ? Math.min(naturalEnd, next.start - 0.02) : naturalEnd;
    return {
      text: cue.text,
      start: Math.max(0, Number(cue.start.toFixed(3))),
      end: Number(Math.min(limit || naturalEnd, Math.max(cue.start + 0.35, end)).toFixed(3)),
    };
  });
}

export function toSrt(cues) {
  const stamp = (seconds) => {
    const ms = Math.max(0, Math.round(seconds * 1000));
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${s},${String(ms % 1000).padStart(3, '0')}`;
  };
  return (cues || [])
    .map((cue, index) => `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`)
    .join('\n');
}
