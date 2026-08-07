#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { RawAudio } from "@huggingface/transformers";
import { streamSynthesize } from "./kokoroClient.mjs";
import { stripMarkdownToPlainText } from "./extractHook.mjs";
import { concatenateAudioChunks } from "./concatenateAudio.mjs";
import { buildNarrationTimingFromChunks } from "./narrationTiming.mjs";
import { resolveNarratorVoice } from "./channelNarrator.mjs";
import { runMechanicalAudioChecks } from "./auditionChecks.mjs";

/** Production owns VOICE_SELECTED->VOICE_READY; VOICE_BLOCKED allows a retry after a prior failed generation. */
const ALLOWED_STATES = ["VOICE_SELECTED", "VOICE_BLOCKED"];

const readState = (statePath) => JSON.parse(fs.readFileSync(statePath, "utf8"));

const runStateCli = (args, statePath) => {
  const stdout = execFileSync("node", ["tools/episode-state.mjs", ...args], {
    env: { ...process.env, EPISODE_STATE_PATH: statePath },
  });
  return JSON.parse(stdout.toString());
};

/**
 * @param {{ stream?: typeof streamSynthesize }} deps injection point for tests
 */
export const runGenerateNarration = async (deps = {}) => {
  const stream = deps.stream ?? streamSynthesize;
  const statePath = process.env.EPISODE_STATE_PATH || "episodes/current/episode-state.json";
  const episodeId = process.env.EPISODE_ID;
  const episodesRoot = process.env.EPISODES_ROOT || "episodes";
  const channelVoicePath = process.env.CHANNEL_VOICE_PATH;

  if (!episodeId) throw new Error("EPISODE_ID env var is required");

  const state = readState(statePath);
  if (state.episode_id !== episodeId) {
    throw new Error(`episode mismatch: state has "${state.episode_id}", requested "${episodeId}"`);
  }
  if (!ALLOWED_STATES.includes(state.state)) {
    throw new Error(`refusing to generate narration: state is "${state.state}", must be one of ${ALLOWED_STATES.join(", ")}`);
  }

  const voice = resolveNarratorVoice(state, channelVoicePath);
  if (!voice) {
    throw new Error("no narrator voice resolved - set production.selected_voice on the episode or configure config/channel-voice.json");
  }

  const episodeDir = path.join(episodesRoot, episodeId);
  const scriptPath = path.join(episodeDir, "script.md");
  if (!fs.existsSync(scriptPath)) throw new Error(`script not found: ${scriptPath}`);
  const scriptText = stripMarkdownToPlainText(fs.readFileSync(scriptPath, "utf8"));
  if (!scriptText) throw new Error(`script at ${scriptPath} is empty after stripping markdown`);

  const chunks = [];
  for await (const chunk of stream(scriptText, voice)) chunks.push(chunk);
  if (chunks.length === 0) throw new Error("narration generation produced zero audio chunks - not advancing state");

  const audioDir = path.join(episodeDir, "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  const audioPath = path.join(audioDir, "narration.wav");

  const combined = concatenateAudioChunks(chunks.map((c) => ({ audio: c.audio, samplingRate: c.samplingRate })));
  await new RawAudio(combined.audio, combined.samplingRate).save(audioPath);

  const timing = buildNarrationTimingFromChunks(
    chunks.map((c) => ({ text: c.text, durationSeconds: c.durationSeconds })),
    episodeId,
    audioPath,
  );
  const timingPath = path.join(audioDir, "narration-timing.json");
  fs.writeFileSync(timingPath, JSON.stringify(timing, null, 2) + "\n");

  const mechanicalChecks = await runMechanicalAudioChecks(audioPath, { failed: false });
  const usable = mechanicalChecks.fileExists === "PASS" && mechanicalChecks.nonZeroDuration === "PASS";
  if (!usable) {
    throw new Error(`narration failed mechanical QA, not advancing state: ${mechanicalChecks.detail}`);
  }

  const afterPatch = runStateCli(
    ["patch", String(state.state_revision), episodeId, "factory", JSON.stringify({ production: { voice_asset: audioPath, qa_inputs_ready: true } })],
    statePath,
  );
  runStateCli(["transition", String(afterPatch.state_revision), episodeId, "VOICE_READY", "factory", "narration generated and passed mechanical QA"], statePath);

  console.log(`Narration ready: ${audioPath} (${timing.totalDurationSeconds.toFixed(1)}s, ${chunks.length} chunks)`);
  return { audioPath, timingPath, timing, mechanicalChecks };
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  runGenerateNarration().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
