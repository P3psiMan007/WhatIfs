#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ffmpegPath } from "../lib/ffmpegBinaries.mjs";
import { runProcess } from "../lib/runProcess.mjs";
import { probeMedia } from "../qa/probeMedia.mjs";
import { mixAudio } from "./mixAudio.mjs";
import { buildCuePlan } from "./episodeSoundDesign.mjs";

const ensureOk = (label, result) => {
  if (result.code !== 0) throw new Error(`${label} failed: ${result.stderr.slice(-4000)}`);
};

const generateLavfiAudio = async ({input, filter, duration, outputPath}) => {
  const args = ["-y", "-f", "lavfi", "-i", input];
  if (filter) args.push("-af", filter);
  args.push("-t", String(duration), "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "192k", outputPath);
  const result = await runProcess(ffmpegPath, args);
  ensureOk(`generate ${path.basename(outputPath)}`, result);
};

const generateCue = async ({kind, outputPath}) => {
  const defs = {
    click: {
      input: "sine=frequency=1650:sample_rate=48000:duration=0.08",
      filter: "volume=0.7,afade=t=out:st=0.02:d=0.06",
    },
    whoosh: {
      input: "anoisesrc=color=white:amplitude=0.75:sample_rate=48000:duration=0.45",
      filter: "highpass=f=700,lowpass=f=6500,volume=0.32,afade=t=in:st=0:d=0.03,afade=t=out:st=0.18:d=0.27",
    },
    hit: {
      input: "sine=frequency=72:sample_rate=48000:duration=0.45",
      filter: "volume=0.75,lowpass=f=700,afade=t=out:st=0.06:d=0.39",
    },
    pulse: {
      input: "sine=frequency=285:sample_rate=48000:duration=0.20",
      filter: "volume=0.55,afade=t=in:st=0:d=0.015,afade=t=out:st=0.05:d=0.15",
    },
  };
  const def = defs[kind];
  if (!def) throw new Error(`unknown cue kind ${kind}`);
  await generateLavfiAudio({input: def.input, filter: def.filter, duration: 1, outputPath});
};

export const buildEpisodeSoundtrack = async ({episodeId = process.env.EPISODE_ID} = {}) => {
  if (!episodeId) throw new Error("EPISODE_ID env var is required");
  const episodeDir = path.join("episodes", episodeId);
  const audioDir = path.join(episodeDir, "audio");
  const narrationPath = path.join(audioDir, "narration.wav");
  const scenePath = path.join(episodeDir, "scene-manifest.json");
  if (!fs.existsSync(narrationPath)) throw new Error(`narration missing: ${narrationPath}`);
  if (!fs.existsSync(scenePath)) throw new Error(`scene manifest missing: ${scenePath}`);

  const probe = await probeMedia(narrationPath);
  const duration = Number.parseFloat(probe?.format?.duration ?? "0");
  if (!probe.ok || !Number.isFinite(duration) || duration <= 1) throw new Error("could not measure narration duration");

  const scenes = JSON.parse(fs.readFileSync(scenePath, "utf8")).scenes;
  const cuePlan = buildCuePlan(scenes);
  fs.mkdirSync(audioDir, {recursive: true});
  const workDir = path.join(audioDir, ".sound-design-tmp");
  fs.rmSync(workDir, {recursive: true, force: true});
  fs.mkdirSync(workDir, {recursive: true});

  const musicPath = path.join(workDir, "ambient-pad.m4a");
  const ambiencePath = path.join(workDir, "room-tone.m4a");
  const fadeOutStart = Math.max(1, duration - 3);

  await generateLavfiAudio({
    input: `aevalsrc=0.22*sin(2*PI*110*t)+0.10*sin(2*PI*164.81*t)+0.06*sin(2*PI*220*t):s=48000:d=${duration}`,
    filter: `lowpass=f=1500,tremolo=f=0.12:d=0.22,volume=0.65,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3`,
    duration,
    outputPath: musicPath,
  });

  await generateLavfiAudio({
    input: `anoisesrc=color=pink:amplitude=0.45:sample_rate=48000:duration=${duration}`,
    filter: `highpass=f=90,lowpass=f=1000,volume=0.18,afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOutStart}:d=3`,
    duration,
    outputPath: ambiencePath,
  });

  const cuePaths = {};
  for (const cue of [...new Set(cuePlan.map((x) => x.cue))]) {
    const cuePath = path.join(workDir, `${cue}.m4a`);
    await generateCue({kind: cue, outputPath: cuePath});
    cuePaths[cue] = cuePath;
  }

  const soundtrackPath = path.join(audioDir, "soundtrack.m4a");
  const mixed = await mixAudio({
    narrationPath,
    musicPath,
    ambiencePath,
    sfx: cuePlan.map((cue) => ({path: cuePaths[cue.cue], offsetSeconds: cue.offsetSeconds})),
    levels: {
      narrationGainDb: 0,
      musicDuckDb: -24,
      ambienceDuckDb: -28,
      sfxGainDb: -13,
    },
    outputPath: soundtrackPath,
  });
  if (!mixed.ok) throw new Error(`soundtrack mix failed: ${mixed.stderr.slice(-4000)}`);

  const manifest = {
    episodeId,
    generatedAt: new Date().toISOString(),
    durationSeconds: duration,
    sourceNarration: narrationPath,
    soundtrack: soundtrackPath,
    design: "copyright-safe deterministic synthesized ambient pad + room tone + sparse authored cues",
    levels: {musicDuckDb: -24, ambienceDuckDb: -28, sfxGainDb: -13},
    cueCount: cuePlan.length,
    cues: cuePlan,
  };
  fs.writeFileSync(path.join(audioDir, "sound-design-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  fs.rmSync(workDir, {recursive: true, force: true});
  console.log(`Soundtrack ready: ${soundtrackPath} (${cuePlan.length} cues, ${duration.toFixed(1)}s)`);
  return manifest;
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  buildEpisodeSoundtrack().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
