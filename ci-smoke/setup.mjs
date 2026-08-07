// Phase 7 smoke-test scaffolding. Builds a purely synthetic episode package
// in a temp dir. Never touches episodes/current/episode-state.json.
import fs from "node:fs";
import path from "node:path";

const root = process.env.SMOKE_ROOT;
if (!root) throw new Error("SMOKE_ROOT required");
const episodeId = "smoke-ep";
const episodesRoot = path.join(root, "episodes");
const episodeDir = path.join(episodesRoot, episodeId);
fs.mkdirSync(episodeDir, { recursive: true });

// Real IDLE template, mutated in the temp copy only.
const template = JSON.parse(fs.readFileSync("episodes/current/episode-state.json", "utf8"));
template.episode_id = episodeId;
template.state = "SCRIPTED";
template.state_revision = 1;
fs.writeFileSync(path.join(root, "episode-state.json"), JSON.stringify(template, null, 2) + "\n");

fs.writeFileSync(
  path.join(episodeDir, "episode.json"),
  JSON.stringify(
    {
      episodeId,
      pipelineVersion: "2.1",
      title: "Smoke test episode",
      premise: "A synthetic premise used only to exercise the factory.",
      coreParadox: "The obvious answer is wrong.",
      hookPromise: "You will know the real number by the end.",
      targetLengthMinutes: 8,
      opportunityScore: 50,
      whyThisWins: "It is a test.",
      researchQuestions: [],
      factRisks: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    null,
    2,
  ) + "\n",
);

const SENTENCES = [
  "What if every bank in the world closed its doors tomorrow morning?",
  "Most people picture empty streets and long queues at the cash machine.",
  "The real number is closer to five hundred billion dollars a day.",
  "That money does not vanish, it simply stops moving between accounts.",
  "Within about seventy two hours, the shortage would reach ordinary shops.",
  "The answer turns out to be stranger, and far quieter, than the panic.",
];

fs.writeFileSync(
  path.join(episodeDir, "script.md"),
  `# Smoke test episode\n\n${SENTENCES.join(" ")}\n`,
);

const VISUAL_PURPOSES = [
  "establish-premise",
  "introduce-character",
  "explain-mechanism",
  "reveal-number",
  "show-consequence",
  "resolve-paradox",
];
const CAMERAS = ["push-in", "static", "pan-left", "static", "pan-right", "pull-out"];
const TRANSITIONS = ["hard-cut", "dissolve", "hard-cut", "dissolve", "hard-cut", "dissolve"];
const ENVIRONMENTS = ["city street", "quiet home", "abstract-graph trend", "abstract-graph trend", "city street", "quiet home"];
const PROPS = [[], ["clock"], ["chart"], ["chart"], ["lightbulb"], []];

const scenes = SENTENCES.map((text, i) => ({
  sceneId: `s${i + 1}`,
  order: i,
  narration: { text, segmentStartIndex: null, segmentEndIndex: null },
  timing: { startSeconds: null, endSeconds: null },
  visualPurpose: VISUAL_PURPOSES[i],
  focalSubject: i === 3 ? "a hero number" : "narrator explaining",
  environment: ENVIRONMENTS[i],
  props: PROPS[i],
  cameraIntent: CAMERAS[i],
  motionIntent: [i % 2 === 0 ? "subtle-idle" : "character-gesture"],
  caption: text,
  sfxIntent: null,
  transitionIn: TRANSITIONS[i],
  requiredAssets: [],
  newInformation: `beat ${i + 1}`,
}));

fs.writeFileSync(
  path.join(episodeDir, "scene-manifest.json"),
  JSON.stringify({ episodeId, fps: 30, scenes }, null, 2) + "\n",
);

console.log(`smoke episode ready at ${episodeDir}`);
