import type { NarrationSegment } from "../types/narration";
import type { CaptionPhrase, CaptionWord } from "./types";

const MIN_WORDS_PER_PHRASE = 2;
const MAX_WORDS_PER_PHRASE = 7;
const SENTENCE_END_RE = /[.!?]["')\]]?$/;
const CLAUSE_BREAK_RE = /[,;:]["')\]]?$/;
/** A gap this large between two spoken words means a natural pause; break the phrase there. */
const PAUSE_BREAK_SECONDS = 0.5;

const toCaptionWord = (segment: NarrationSegment): CaptionWord => ({
  text: segment.text,
  startSeconds: segment.startSeconds,
  endSeconds: segment.endSeconds,
  isKeyWord: segment.isKeyWord,
});

const flushPhrase = (words: CaptionWord[]): CaptionPhrase => ({
  text: words.map((w) => w.text).join(" "),
  startSeconds: words[0].startSeconds,
  endSeconds: words[words.length - 1].endSeconds,
  words,
});

/**
 * Groups word-level narration timing into caption phrases of roughly
 * MIN_WORDS_PER_PHRASE..MAX_WORDS_PER_PHRASE words, preferring to break on
 * sentence/clause punctuation or a natural pause once the minimum length is
 * met, and forcing a break at the maximum so no phrase runs on too long.
 */
export const segmentIntoPhrases = (segments: NarrationSegment[]): CaptionPhrase[] => {
  const phrases: CaptionPhrase[] = [];
  let current: CaptionWord[] = [];

  for (let i = 0; i < segments.length; i++) {
    const word = toCaptionWord(segments[i]);
    current.push(word);

    const next = segments[i + 1];
    const isLast = !next;
    const atMax = current.length >= MAX_WORDS_PER_PHRASE;
    const atMin = current.length >= MIN_WORDS_PER_PHRASE;
    const endsSentence = SENTENCE_END_RE.test(word.text);
    const endsClause = CLAUSE_BREAK_RE.test(word.text);
    const pausesAfter = next ? next.startSeconds - word.endSeconds >= PAUSE_BREAK_SECONDS : false;

    const shouldBreak = isLast || atMax || (atMin && (endsSentence || endsClause || pausesAfter));

    if (shouldBreak) {
      phrases.push(flushPhrase(current));
      current = [];
    }
  }

  return phrases;
};
