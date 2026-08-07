import { KOKORO_MODEL_ID } from "./kokoroClient.mjs";

/**
 * Default audition roster: 4 distinct, well-graded Kokoro voices spanning
 * gender and accent so a human has a real choice. Overridable via the
 * AUDITION_VOICES env var (comma-separated Kokoro voice ids) for a one-off
 * custom roster.
 */
export const DEFAULT_AUDITION_VOICE_IDS = ["af_heart", "af_bella", "am_fenrir", "bm_george"];
const MIN_CANDIDATES = 2;
const MAX_CANDIDATES = 5;

export const resolveAuditionVoiceIds = (envOverride) => {
  const ids = envOverride
    ? envOverride.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_AUDITION_VOICE_IDS;

  if (ids.length < MIN_CANDIDATES || ids.length > MAX_CANDIDATES) {
    throw new Error(`voice audition roster must have ${MIN_CANDIDATES}-${MAX_CANDIDATES} candidates, got ${ids.length}`);
  }
  return ids;
};

export const buildVoiceConfig = (voiceId, speed = 1) => ({
  provider: "kokoro",
  model: KOKORO_MODEL_ID,
  voiceId,
  speed,
  language: voiceId.startsWith("b") ? "en-GB" : "en-US",
  settings: {},
});
