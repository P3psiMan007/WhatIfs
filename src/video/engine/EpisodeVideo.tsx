import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ChannelStyleProvider } from "../style/StyleContext";
import { defaultChannelStyle } from "../style/channelStyle";
import { TextureOverlay } from "../components/TextureOverlay";
import { segmentIntoPhrases } from "../captions/phraseSegmentation";
import { findActivePhrase } from "../captions/findActivePhrase";
import { SceneRenderer } from "./SceneRenderer";
import { resolveSceneTimings, clamp01, computeRevealProgress } from "./sceneTiming";
import { computeActiveLayers } from "./activeLayers";
import type { SceneManifest } from "../types/scene";
import type { NarrationTiming } from "../types/narration";
import type { ChannelStyleConfig } from "../types/style";

export interface EpisodeVideoProps {
  sceneManifest: SceneManifest;
  narrationTiming: NarrationTiming | null;
  /**
   * Path relative to the Remotion project's public/ directory (resolved
   * here via staticFile()), NOT an absolute filesystem path or arbitrary
   * URL - Remotion's <Audio> can only load http(s) URLs or public-relative
   * paths. The render pipeline (tools/render/render-episode.mjs) stages
   * episodes/<id>/audio/narration.wav into public/ before rendering and
   * passes the resulting relative path here.
   */
  narrationAudioSrc: string | null;
  fallbackTotalSeconds: number;
  style?: ChannelStyleConfig;
}

export const EpisodeVideo: React.FC<EpisodeVideoProps> = ({
  sceneManifest,
  narrationTiming,
  narrationAudioSrc,
  fallbackTotalSeconds,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSeconds = frame / fps;
  const activeStyle = style ?? defaultChannelStyle;

  const timings = useMemo(
    () => resolveSceneTimings(sceneManifest.scenes, fps, fallbackTotalSeconds),
    [sceneManifest, fps, fallbackTotalSeconds],
  );
  const phrases = useMemo(
    () => (narrationTiming ? segmentIntoPhrases(narrationTiming.segments) : []),
    [narrationTiming],
  );
  const activePhrase = useMemo(() => findActivePhrase(phrases, nowSeconds), [phrases, nowSeconds]);
  const layers = useMemo(
    () => computeActiveLayers(sceneManifest.scenes, timings, frame),
    [sceneManifest, timings, frame],
  );

  return (
    <ChannelStyleProvider style={style}>
      <AbsoluteFill style={{ backgroundColor: activeStyle.textureDefaults.paperColor }}>
        {layers.map((layer) => {
          const scene = sceneManifest.scenes[layer.sceneIndex];
          const timing = timings[layer.sceneIndex];
          const sceneDurationFrames = timing.endFrame - timing.startFrame;
          const framesIntoScene = frame - timing.startFrame;
          const cameraProgress = clamp01(framesIntoScene / Math.max(1, sceneDurationFrames));
          const revealProgress = computeRevealProgress(framesIntoScene, sceneDurationFrames);

          return (
            <AbsoluteFill key={scene.sceneId} style={{ opacity: layer.opacity }}>
              <SceneRenderer
                scene={scene}
                cameraProgress={cameraProgress}
                revealProgress={revealProgress}
                activeCaptionPhrase={activePhrase}
                nowSeconds={nowSeconds}
              />
            </AbsoluteFill>
          );
        })}

        <TextureOverlay />
        {narrationAudioSrc && <Audio src={staticFile(narrationAudioSrc)} />}
      </AbsoluteFill>
    </ChannelStyleProvider>
  );
};
