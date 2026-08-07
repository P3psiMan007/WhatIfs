import type { SceneManifestEntry } from "../types/scene";
import type { ResolvedSceneTiming } from "./sceneTiming";

export const DISSOLVE_DURATION_FRAMES = 15;

export interface ActiveSceneLayer {
  sceneIndex: number;
  opacity: number;
}

/**
 * hard-cut and match-cut both render as an instant swap at the engine level
 * - a true match-cut (shared visual anchor across the cut) is a
 * content-authoring concern the manifest doesn't carry yet, not something
 * this generic engine can synthesize. dissolve crossfades the outgoing and
 * incoming scene over DISSOLVE_DURATION_FRAMES.
 */
export const computeActiveLayers = (
  scenes: SceneManifestEntry[],
  timings: ResolvedSceneTiming[],
  frame: number,
  dissolveFrames = DISSOLVE_DURATION_FRAMES,
): ActiveSceneLayer[] => {
  if (timings.length === 0) return [];

  let index = timings.findIndex((t) => frame >= t.startFrame && frame < t.endFrame);
  if (index === -1) {
    index = frame < timings[0].startFrame ? 0 : timings.length - 1;
  }

  const scene = scenes[index];
  const timing = timings[index];
  const framesIntoScene = frame - timing.startFrame;

  if (scene.transitionIn === "dissolve" && index > 0 && framesIntoScene < dissolveFrames) {
    const localProgress = framesIntoScene / dissolveFrames;
    return [
      { sceneIndex: index - 1, opacity: 1 - localProgress },
      { sceneIndex: index, opacity: localProgress },
    ];
  }

  return [{ sceneIndex: index, opacity: 1 }];
};
