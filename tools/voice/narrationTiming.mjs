/**
 * Kokoro's stream() yields real measured audio per chunk at whatever
 * granularity its splitter produces (sentence-level by default) - genuine
 * timing, not guessed. True per-word timestamps aren't available from the
 * model, so within each chunk, word boundaries are interpolated
 * proportionally to word length. This is an approximation *within* a
 * chunk; chunk boundaries themselves are exact.
 */
export const interpolateWordTimingWithinChunk = (chunkText, chunkStartSeconds, chunkDurationSeconds, startIndex) => {
  const words = chunkText.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const totalChars = words.reduce((sum, w) => sum + w.length, 0) || words.length;
  let cursor = chunkStartSeconds;

  return words.map((text, i) => {
    const share = (text.length / totalChars) * chunkDurationSeconds;
    const startSeconds = cursor;
    const endSeconds = i === words.length - 1 ? chunkStartSeconds + chunkDurationSeconds : cursor + share;
    cursor = endSeconds;
    return { index: startIndex + i, text, startSeconds, endSeconds, isKeyWord: false };
  });
};

/**
 * @param {Array<{ text: string, durationSeconds: number }>} chunks in narration order, each with a real measured duration
 */
export const buildNarrationTimingFromChunks = (chunks, episodeId, voiceAssetPath) => {
  let cursor = 0;
  let index = 0;
  const segments = [];

  for (const chunk of chunks) {
    const words = interpolateWordTimingWithinChunk(chunk.text, cursor, chunk.durationSeconds, index);
    segments.push(...words);
    index += words.length;
    cursor += chunk.durationSeconds;
  }

  return { episodeId, voiceAssetPath, totalDurationSeconds: cursor, segments };
};
