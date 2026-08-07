import type { SceneManifestEntry } from "../types/scene";

export interface ResolvedSceneTiming {
  sceneId: string;
  startSeconds: number;
  endSeconds: number;
  startFrame: number;
  endFrame: number;
}

/**
 * Narration timing is the source of truth once a real narration WAV exists:
 * if every scene already carries real timing.startSeconds/endSeconds, use it
 * verbatim. Otherwise (no narration yet - SCRIPTED but not VOICE_READY),
 * fall back to an even split across fallbackTotalSeconds so the pipeline can
 * still preview/render something before real audio exists.
 */
export const resolveSceneTimings = (
  scenes: SceneManifestEntry[],
  fps: number,
  fallbackTotalSeconds: number,
): ResolvedSceneTiming[] => {
  if (scenes.length === 0) return [];

  const allHaveRealTiming = scenes.every((s) => s.timing.startSeconds !== null && s.timing.endSeconds !== null);

  if (allHaveRealTiming) {
    return scenes.map((s) => {
      const startSeconds = s.timing.startSeconds as number;
      const endSeconds = s.timing.endSeconds as number;
      return {
        sceneId: s.sceneId,
        startSeconds,
        endSeconds,
        startFrame: Math.round(startSeconds * fps),
        endFrame: Math.round(endSeconds * fps),
      };
    });
  }

  const perScene = fallbackTotalSeconds / scenes.length;
  return scenes.map((s, i) => {
    const startSeconds = i * perScene;
    const endSeconds = (i + 1) * perScene;
    return {
      sceneId: s.sceneId,
      startSeconds,
      endSeconds,
      startFrame: Math.round(startSeconds * fps),
      endFrame: Math.round(endSeconds * fps),
    };
  });
};

export const totalDurationInFrames = (timings: ResolvedSceneTiming[]): number =>
  timings.length === 0 ? 0 : Math.max(...timings.map((t) => t.endFrame));

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Reveal animations (HeroNumber, graphs) finish early in the scene rather than dragging across its whole duration. */
export const computeRevealProgress = (framesIntoScene: number, sceneDurationFrames: number): number => {
  if (sceneDurationFrames <= 0) return 1;
  return clamp01(framesIntoScene / (sceneDurationFrames * 0.4));
};
