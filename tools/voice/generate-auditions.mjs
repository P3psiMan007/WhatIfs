#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { synthesizeToFile } from "./kokoroClient.mjs";
import { resolveAuditionVoiceIds, buildVoiceConfig } from "./voiceCatalog.mjs";
import { extractHookText } from "./extractHook.mjs";
import { runMechanicalAudioChecks } from "./auditionChecks.mjs";
import { probeMedia } from "../qa/probeMedia.mjs";

/** Production owns SCRIPTED->VOICE_AUDITIONS_READY; VOICE_BLOCKED allows a retry after a prior failed batch. */
const ALLOWED_STATES = ["SCRIPTED", "VOICE_BLOCKED"];

const readState = (statePath) => JSON.parse(fs.readFileSync(statePath, "utf8"));

const transitionState = (statePath, episodeId, expectedRevision, reason) => {
  execFileSync(
    "node",
    ["tools/episode-state.mjs", "transition", String(expectedRevision), episodeId, "VOICE_AUDITIONS_READY", "factory", reason],
    { stdio: "inherit", env: { ...process.env, EPISODE_STATE_PATH: statePath } },
  );
};

/**
 * @param {{ synthesize?: typeof synthesizeToFile }} deps injection point for
 * tests - defaults to the real Kokoro client.
 */
export const runVoiceAuditions = async (deps = {}) => {
  const synthesize = deps.synthesize ?? synthesizeToFile;
  const statePath = process.env.EPISODE_STATE_PATH || "episodes/current/episode-state.json";
  const episodeId = process.env.EPISODE_ID;
  const hookPathOverride = process.env.HOOK_PATH || null;
  const episodesRoot = process.env.EPISODES_ROOT || "episodes";

  if (!episodeId) throw new Error("EPISODE_ID env var is required");

  const state = readState(statePath);
  if (state.episode_id !== episodeId) {
    throw new Error(`episode mismatch: state has "${state.episode_id}", requested "${episodeId}"`);
  }
  if (!ALLOWED_STATES.includes(state.state)) {
    throw new Error(`refusing to run voice auditions: state is "${state.state}", must be one of ${ALLOWED_STATES.join(", ")}`);
  }

  const episodeDir = path.join(episodesRoot, episodeId);
  const hookSourcePath = hookPathOverride || path.join(episodeDir, "script.md");
  if (!fs.existsSync(hookSourcePath)) throw new Error(`hook source not found: ${hookSourcePath}`);
  const hookText = extractHookText(fs.readFileSync(hookSourcePath, "utf8"));
  if (!hookText) throw new Error(`extracted hook text is empty from ${hookSourcePath}`);

  const voiceIds = resolveAuditionVoiceIds(process.env.AUDITION_VOICES);
  const auditionsDir = path.join(episodeDir, "audio", "auditions");
  fs.mkdirSync(auditionsDir, { recursive: true });

  const candidates = [];
  for (const voiceId of voiceIds) {
    const voice = buildVoiceConfig(voiceId);
    const audioPath = path.join(auditionsDir, `${voiceId}.wav`);
    console.log(`Generating audition candidate "${voiceId}"...`);

    const generation = await synthesize(hookText, voice, audioPath);
    const mechanicalChecks = await runMechanicalAudioChecks(audioPath, { failed: !generation.ok, error: generation.error });

    let durationSeconds = null;
    if (generation.ok && fs.existsSync(audioPath)) {
      const probe = await probeMedia(audioPath);
      durationSeconds = probe.ok && probe.format?.duration ? Number.parseFloat(probe.format.duration) : null;
    }

    candidates.push({
      candidateId: voiceId,
      voice,
      hookText,
      audioPath,
      durationSeconds,
      generatedAt: new Date().toISOString(),
      mechanicalChecks,
    });

    console.log(generation.ok ? `  -> ok (${durationSeconds ?? "?"}s)` : `  -> FAILED: ${generation.error}`);
  }

  const successCount = candidates.filter((c) => !c.mechanicalChecks.generationFailed && c.mechanicalChecks.fileExists === "PASS").length;
  if (successCount === 0) {
    throw new Error("all voice audition candidates failed to generate - not advancing state");
  }

  const manifest = {
    episodeId,
    stateRevision: state.state_revision,
    hookText,
    generatedAt: new Date().toISOString(),
    candidates,
  };
  const manifestPath = path.join(episodeDir, "audio", "voice-audition-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  transitionState(statePath, episodeId, state.state_revision, `${successCount}/${voiceIds.length} audition candidates generated`);
  console.log(`Voice auditions ready: ${successCount}/${voiceIds.length} candidates succeeded. Manifest: ${manifestPath}`);
  return manifest;
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  runVoiceAuditions().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
