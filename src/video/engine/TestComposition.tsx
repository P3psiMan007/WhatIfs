import React from "react";
import { Composition } from "remotion";
import { EpisodeVideo } from "./EpisodeVideo";
import type { SceneManifest } from "../types/scene";
import type { NarrationSegment, NarrationTiming } from "../types/narration";

/**
 * Entirely synthetic fixture data - no episode file reads, no episode state
 * access. Exercises every camera intent, a dissolve transition, the
 * reveal-number heuristic, and word-synced captions so the whole rendering
 * chain can be smoke-tested without a real SELECTED episode.
 */
const FPS = 30;

const FIXTURE_SCENE_MANIFEST: SceneManifest = {
  episodeId: "_factory-test",
  fps: FPS,
  scenes: [
    {
      sceneId: "test-1",
      order: 0,
      narration: { text: "What if money vanished overnight?", segmentStartIndex: 0, segmentEndIndex: 4 },
      timing: { startSeconds: 0, endSeconds: 2.5 },
      visualPurpose: "establish-premise",
      focalSubject: "narrator standing in a city street",
      environment: "city street",
      props: [],
      cameraIntent: "push-in",
      motionIntent: ["subtle-idle"],
      caption: "What if money vanished overnight?",
      sfxIntent: null,
      transitionIn: "hard-cut",
      requiredAssets: [],
      newInformation: "sets up the premise",
    },
    {
      sceneId: "test-2",
      order: 1,
      narration: { text: "That's about $500 billion changing hands.", segmentStartIndex: 5, segmentEndIndex: 10 },
      timing: { startSeconds: 2.5, endSeconds: 4.5 },
      visualPurpose: "reveal-number",
      focalSubject: "a hero number",
      environment: "abstract-graph trend",
      props: ["chart"],
      cameraIntent: "static",
      motionIntent: ["expression-change"],
      caption: "That's about $500 billion changing hands.",
      sfxIntent: "chime",
      transitionIn: "dissolve",
      requiredAssets: [],
      newInformation: "$500 billion changes hands",
    },
    {
      sceneId: "test-3",
      order: 2,
      narration: { text: "The answer might surprise you.", segmentStartIndex: 11, segmentEndIndex: 14 },
      timing: { startSeconds: 4.5, endSeconds: 6.5 },
      visualPurpose: "resolve-paradox",
      focalSubject: "narrator with an idea",
      environment: "quiet home",
      props: ["lightbulb"],
      cameraIntent: "pan-left",
      motionIntent: ["character-gesture"],
      caption: "The answer might surprise you.",
      sfxIntent: null,
      transitionIn: "hard-cut",
      requiredAssets: [],
      newInformation: "resolves the hook",
    },
  ],
};

const words = (sentence: string, startSeconds: number, wordDuration: number, startIndex: number): NarrationSegment[] =>
  sentence.split(" ").map((text, i) => ({
    index: startIndex + i,
    text,
    startSeconds: startSeconds + i * wordDuration,
    endSeconds: startSeconds + (i + 1) * wordDuration - 0.02,
    isKeyWord: i === 0,
  }));

const FIXTURE_NARRATION_TIMING: NarrationTiming = {
  episodeId: "_factory-test",
  voiceAssetPath: "",
  totalDurationSeconds: 6.5,
  segments: [
    ...words("What if money vanished overnight?", 0, 0.5, 0),
    ...words("That's about $500 billion changing hands.", 2.5, 0.4, 5),
    ...words("The answer might surprise you.", 4.5, 0.5, 11),
  ],
};

const TestCompositionRoot: React.FC = () => (
  <EpisodeVideo
    sceneManifest={FIXTURE_SCENE_MANIFEST}
    narrationTiming={FIXTURE_NARRATION_TIMING}
    narrationAudioSrc={null}
    fallbackTotalSeconds={6.5}
  />
);

export const TestComposition: React.FC = () => (
  <Composition
    id="FactoryTest"
    component={TestCompositionRoot}
    durationInFrames={Math.round(6.5 * FPS)}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
