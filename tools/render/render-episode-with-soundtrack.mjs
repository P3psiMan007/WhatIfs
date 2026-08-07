#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {ffmpegPath} from "../lib/ffmpegBinaries.mjs";
import {runProcess} from "../lib/runProcess.mjs";
import {renderEpisode} from "./render-episode.mjs";

export const renderEpisodeWithSoundtrack = async ({episodeId = process.env.EPISODE_ID} = {}) => {
  if (!episodeId) throw new Error("EPISODE_ID env var is required");
  const audioDir = path.join("episodes", episodeId, "audio");
  const narrationPath = path.join(audioDir, "narration.wav");
  const soundtrackPath = path.join(audioDir, "soundtrack.m4a");
  const voiceBackupPath = path.join(audioDir, ".narration-voice-only.wav");

  if (!fs.existsSync(narrationPath)) throw new Error(`narration missing: ${narrationPath}`);
  if (!fs.existsSync(soundtrackPath)) throw new Error(`soundtrack missing: ${soundtrackPath}`);
  if (fs.existsSync(voiceBackupPath)) fs.rmSync(voiceBackupPath, {force: true});

  fs.renameSync(narrationPath, voiceBackupPath);
  try {
    const decode = await runProcess(ffmpegPath, [
      "-y",
      "-i", soundtrackPath,
      "-vn",
      "-c:a", "pcm_s16le",
      "-ar", "48000",
      "-ac", "2",
      narrationPath,
    ]);
    if (decode.code !== 0 || !fs.existsSync(narrationPath)) {
      throw new Error(`failed to stage soundtrack for Remotion: ${decode.stderr.slice(-4000)}`);
    }
    return await renderEpisode();
  } finally {
    fs.rmSync(narrationPath, {force: true});
    if (fs.existsSync(voiceBackupPath)) fs.renameSync(voiceBackupPath, narrationPath);
  }
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  renderEpisodeWithSoundtrack().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
