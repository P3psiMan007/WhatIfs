import fs from "node:fs";
import path from "node:path";

const DEFAULT_CONFIG_PATH = "config/channel-voice.json";

export const getChannelNarrator = (configPath = process.env.CHANNEL_VOICE_PATH || DEFAULT_CONFIG_PATH) => {
  if (!fs.existsSync(configPath)) return null;
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return config.selected ? config : null;
};

/** Explicit, human-triggered action - never called automatically by production/audition tooling. */
export const setChannelNarrator = (voiceConfig, episodeIdSelectedFrom, notes = "", configPath = process.env.CHANNEL_VOICE_PATH || DEFAULT_CONFIG_PATH) => {
  const config = {
    selected: true,
    episodeIdSelectedFrom,
    selectedAt: new Date().toISOString(),
    voice: voiceConfig,
    notes,
  };
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  return config;
};

/** production.selected_voice (episode-specific) wins over the permanent channel narrator when both exist. */
export const resolveNarratorVoice = (episodeState, configPath) => {
  if (episodeState?.production?.selected_voice) return episodeState.production.selected_voice;
  const channelNarrator = getChannelNarrator(configPath);
  if (channelNarrator?.voice) return channelNarrator.voice;
  return null;
};
