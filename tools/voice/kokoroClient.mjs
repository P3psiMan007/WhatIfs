import { KokoroTTS, TextSplitterStream } from "kokoro-js";

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DTYPE = "q8";

let cachedModel = null;

/** Loads (and caches) the Kokoro model. First call downloads/quantizes weights - can take a while. */
export const loadKokoro = async () => {
  if (!cachedModel) {
    cachedModel = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, { dtype: DTYPE, device: "cpu" });
  }
  return cachedModel;
};

/**
 * Maps a VoiceConfig (src/video/types/voice.ts, keyed by `voiceId`) to
 * Kokoro's own generate/stream options shape (keyed by `voice`). Kept as its
 * own pure, directly-testable function: an earlier version of this file
 * destructured `{voice, speed}` straight off the VoiceConfig object, which
 * has no `.voice` property, so `voice` was silently `undefined` and Kokoro
 * silently fell back to its default speaker for every call - confirmed by
 * generating two "different" voices end-to-end and diffing the output
 * bytes, which were identical. Every caller must go through this function.
 */
export const toKokoroGenerateOptions = (voiceConfig) => ({
  voice: voiceConfig.voiceId,
  speed: voiceConfig.speed ?? 1,
});

/**
 * @param {{ voiceId: string, speed?: number }} voiceConfig a VoiceConfig
 * @returns {Promise<{ ok: boolean, error: string|null }>}
 */
export const synthesizeToFile = async (text, voiceConfig, outputPath) => {
  try {
    const tts = await loadKokoro();
    const audio = await tts.generate(text, toKokoroGenerateOptions(voiceConfig));
    await audio.save(outputPath);
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Streams narration in Kokoro's natural (sentence-level) chunks, yielding
 * each chunk's real measured duration - this is the source of real timing
 * data for buildNarrationTimingFromChunks, not a guess.
 *
 * Must use an explicit TextSplitterStream (push then close) rather than
 * passing a plain string straight to tts.stream(): passing a string directly
 * reliably hangs forever after the last chunk in kokoro-js 1.2.1 (the
 * generator never observes a "no more input" signal and the process exits
 * with "Detected unsettled top-level await" instead of completing).
 * Confirmed by direct testing - see docs/FACTORY_ARCHITECTURE.md.
 *
 * @param {{ voiceId: string, speed?: number }} voiceConfig a VoiceConfig
 * @returns {AsyncGenerator<{ text: string, durationSeconds: number, audio: Float32Array, samplingRate: number }>}
 */
export async function* streamSynthesize(text, voiceConfig) {
  const tts = await loadKokoro();
  const splitter = new TextSplitterStream();
  const inner = tts.stream(splitter, toKokoroGenerateOptions(voiceConfig));

  splitter.push(text);
  splitter.close();

  for await (const chunk of inner) {
    yield {
      text: chunk.text,
      durationSeconds: chunk.audio.audio.length / chunk.audio.sampling_rate,
      audio: chunk.audio.audio,
      samplingRate: chunk.audio.sampling_rate,
    };
  }
}
