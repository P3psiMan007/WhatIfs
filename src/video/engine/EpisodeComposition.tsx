import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { EpisodeVideo } from "./EpisodeVideo";
import type { SceneManifest } from "../types/scene";
import type { NarrationTiming } from "../types/narration";
import { defaultChannelStyle } from "../style/channelStyle";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const DEFAULT_TARGET_LENGTH_MINUTES = 8;

/**
 * This file is bundled by webpack for headless-Chrome execution - it must
 * never import Node built-ins (fs/path), even inside calculateMetadata.
 * All episode data is read from disk up front by the plain-Node render
 * script (tools/render/render-episode.mjs) and passed in fully resolved
 * via --props. calculateMetadata only does prop-based math here.
 */
export type EpisodeCompositionProps = {
  episodeId: string;
  sceneManifest: SceneManifest | null;
  narrationTiming: NarrationTiming | null;
  narrationAudioSrc: string | null;
  fallbackTotalSeconds: number;
};

export const EPISODE_COMPOSITION_DEFAULT_PROPS: EpisodeCompositionProps = {
  episodeId: "",
  sceneManifest: null,
  narrationTiming: null,
  narrationAudioSrc: null,
  fallbackTotalSeconds: DEFAULT_TARGET_LENGTH_MINUTES * 60,
};

const calculateMetadata: CalculateMetadataFunction<EpisodeCompositionProps> = ({ props }) => {
  if (!props.sceneManifest || props.sceneManifest.scenes.length === 0) {
    return { durationInFrames: FPS * 3, fps: FPS, width: WIDTH, height: HEIGHT };
  }

  const durationInFrames = props.narrationTiming
    ? Math.max(1, Math.round(props.narrationTiming.totalDurationSeconds * FPS))
    : Math.max(1, Math.round(props.fallbackTotalSeconds * FPS));

  return { durationInFrames, fps: FPS, width: WIDTH, height: HEIGHT };
};

const NoEpisodePlaceholder: React.FC<{ episodeId: string }> = ({ episodeId }) => (
  <AbsoluteFill
    style={{
      backgroundColor: defaultChannelStyle.textureDefaults.paperColor,
      color: defaultChannelStyle.strokeColor,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: defaultChannelStyle.captionTypography.fontFamily,
      fontSize: 36,
      textAlign: "center",
      padding: 80,
    }}
  >
    <div>No renderable episode found for id &quot;{episodeId || "(none supplied)"}&quot;.</div>
    <div style={{ fontSize: 24, marginTop: 16, opacity: 0.7 }}>
      Expected fully-resolved scene manifest props from tools/render/render-episode.mjs.
    </div>
  </AbsoluteFill>
);

const EpisodeCompositionRoot: React.FC<EpisodeCompositionProps> = (props) => {
  if (!props.sceneManifest) return <NoEpisodePlaceholder episodeId={props.episodeId} />;

  return (
    <EpisodeVideo
      sceneManifest={props.sceneManifest}
      narrationTiming={props.narrationTiming}
      narrationAudioSrc={props.narrationAudioSrc}
      fallbackTotalSeconds={props.fallbackTotalSeconds}
    />
  );
};

export const EpisodeComposition: React.FC = () => (
  <Composition
    id="Episode"
    component={EpisodeCompositionRoot}
    durationInFrames={FPS * 3}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={EPISODE_COMPOSITION_DEFAULT_PROPS}
    calculateMetadata={calculateMetadata}
  />
);
