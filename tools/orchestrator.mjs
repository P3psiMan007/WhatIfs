#!/usr/bin/env node
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { determineNextAction } from "./orchestratorRouting.mjs";
import { runVoiceAuditions } from "./voice/generate-auditions.mjs";
import { runGenerateNarration } from "./voice/generate-narration.mjs";
import { renderEpisode } from "./render/render-episode.mjs";

export const parseEpisodeArg = (argv) => {
  const index = argv.indexOf("--episode");
  return index !== -1 && argv[index + 1] ? argv[index + 1] : null;
};

/**
 * Inspects current state and dispatches to whichever tool owns the next
 * step. Every dispatched tool re-reads and re-validates state itself
 * (revision + episode id) before acting - the orchestrator's own state read
 * here is only to pick a route, never a substitute for that check. Never
 * publishes; NOOPs safely on states with no automated action.
 *
 * @param {{ runVoiceAuditions?, runGenerateNarration?, renderEpisode? }} deps
 */
export const runOrchestrator = async (deps = {}) => {
  const runVoiceAuditionsFn = deps.runVoiceAuditions ?? runVoiceAuditions;
  const runGenerateNarrationFn = deps.runGenerateNarration ?? runGenerateNarration;
  const renderEpisodeFn = deps.renderEpisode ?? renderEpisode;

  const statePath = process.env.EPISODE_STATE_PATH || "episodes/current/episode-state.json";
  const requestedEpisodeId = parseEpisodeArg(process.argv.slice(2)) || process.env.EPISODE_ID || null;

  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

  if (requestedEpisodeId && state.episode_id && requestedEpisodeId !== state.episode_id) {
    throw new Error(`episode mismatch: state has "${state.episode_id}", requested "${requestedEpisodeId}"`);
  }
  // Downstream tools read EPISODE_ID from the environment - make sure it is set for them.
  if (!process.env.EPISODE_ID && state.episode_id) process.env.EPISODE_ID = state.episode_id;

  const action = determineNextAction(state);
  console.log(`Episode ${state.episode_id ?? "(none)"} is in state ${state.state}. Next action: ${action.kind}.`);

  switch (action.kind) {
    case "voice-audition":
      return { action: action.kind, result: await runVoiceAuditionsFn() };
    case "narration":
      return { action: action.kind, result: await runGenerateNarrationFn() };
    case "render":
      return { action: action.kind, result: await renderEpisodeFn() };
    case "prepare-rerender": {
      console.log("QA_FAILED - summarizing what a targeted rerender needs to fix:");
      const requiredFixes = state.qa?.required_fixes ?? [];
      const topIssues = state.qa?.top_issues ?? [];
      if (requiredFixes.length === 0 && topIssues.length === 0) {
        console.log("  (qa.required_fixes/qa.top_issues are empty - check episodes/<id>/qa/qa-report.json manually)");
      }
      for (const fix of requiredFixes) console.log(`  required fix: ${fix}`);
      for (const issue of topIssues) console.log(`  issue: ${issue}`);
      console.log("This orchestrator does not re-render automatically after QA_FAILED - fix the episode, then re-run render manually.");
      return { action: action.kind, result: { requiredFixes, topIssues } };
    }
    case "noop":
    default:
      console.log(`NOOP: ${action.reason}`);
      return { action: "noop", reason: action.reason };
  }
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  runOrchestrator().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
