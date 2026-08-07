/**
 * Joins sequential mono Float32Array audio chunks (all sharing one sampling
 * rate) into a single buffer. Pure and DOM/Node-free so it's trivially
 * testable without any audio library.
 */
export const concatenateAudioChunks = (chunks) => {
  if (chunks.length === 0) return { audio: new Float32Array(0), samplingRate: 0 };

  const samplingRate = chunks[0].samplingRate;
  const mismatched = chunks.find((c) => c.samplingRate !== samplingRate);
  if (mismatched) {
    throw new Error(`cannot concatenate audio chunks with mismatched sampling rates: ${samplingRate} vs ${mismatched.samplingRate}`);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.audio.length, 0);
  const combined = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk.audio, offset);
    offset += chunk.audio.length;
  }

  return { audio: combined, samplingRate };
};
