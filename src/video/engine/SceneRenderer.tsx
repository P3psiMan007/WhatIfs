import React from "react";
import {AbsoluteFill} from "remotion";
import {SceneIllustrationFrame} from "../components/SceneIllustrationFrame";
import {DoodleEnvironment} from "../components/DoodleEnvironment";
import {DoodleCharacter} from "../components/DoodleCharacter";
import {DoodleProp} from "../components/DoodleProp";
import {HeroNumber} from "../components/HeroNumber";
import {WordSyncedCaption} from "../captions/WordSyncedCaption";
import type {CaptionPhrase} from "../captions/types";
import type {SceneManifestEntry} from "../types/scene";
import {BrainSleepSceneArt} from "../episodes/BrainSleepSceneArt";
import {mapEnvironmentHint, mapPropHint, extractHeroNumber} from "./contentHints";

export interface SceneRendererProps {
  episodeId: string;
  scene: SceneManifestEntry;
  cameraProgress: number;
  revealProgress: number;
  activeCaptionPhrase: CaptionPhrase | null;
  nowSeconds: number;
}

const directedFocusOrigin = (sceneId: string): string => {
  const n = Number(sceneId.slice(1));
  if (!Number.isFinite(n)) return "50% 50%";
  const mode = n % 3;
  if (mode === 1) return "34% 48%";
  if (mode === 2) return "66% 48%";
  return "50% 46%";
};

export const SceneRenderer: React.FC<SceneRendererProps> = ({
  episodeId,
  scene,
  cameraProgress,
  revealProgress,
  activeCaptionPhrase,
  nowSeconds,
}) => {
  if (episodeId === "20260807-brain-sleeps-awake") {
    // Each authored scene has a second editorial framing at ~52% progress.
    // The deliberate jump creates a real shot change (wide -> focused crop)
    // without duplicating narration or making the scene manifest brittle.
    // 42 authored scenes therefore yield ~84 meaningful visual framings.
    const secondBeat = cameraProgress >= 0.52;
    const beatProgress = secondBeat ? Math.min(1, Math.max(0, (cameraProgress - 0.52) / 0.48)) : 0;
    const beatScale = secondBeat ? 1.085 + beatProgress * 0.035 : 1;

    return (
      <AbsoluteFill style={{overflow: "hidden"}}>
        <AbsoluteFill
          style={{
            transform: `scale(${beatScale})`,
            transformOrigin: directedFocusOrigin(scene.sceneId),
          }}
        >
          <BrainSleepSceneArt scene={scene} cameraProgress={cameraProgress} revealProgress={revealProgress} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const heroNumber = scene.visualPurpose === "reveal-number" ? extractHeroNumber(scene.newInformation) : null;
  const environment = heroNumber ? "void" : mapEnvironmentHint(`${scene.environment} ${scene.focalSubject}`);
  const propKinds = scene.props.map(mapPropHint).filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <AbsoluteFill>
      <SceneIllustrationFrame cameraIntent={scene.cameraIntent} cameraProgress={cameraProgress}>
        <AbsoluteFill><DoodleEnvironment setting={environment} /></AbsoluteFill>
        <AbsoluteFill style={{alignItems: "center", justifyContent: "center"}}>
          {heroNumber ? (
            <HeroNumber value={heroNumber.value} prefix={heroNumber.prefix} suffix={heroNumber.suffix} progress={revealProgress} />
          ) : (
            <DoodleCharacter characterId={scene.sceneId} pose="standing" expression="neutral" />
          )}
        </AbsoluteFill>
        {propKinds.length > 0 && (
          <AbsoluteFill style={{alignItems: "flex-end", justifyContent: "flex-start", flexDirection: "row", gap: 24, padding: 40}}>
            {propKinds.map((kind, i) => <DoodleProp key={`${kind}-${i}`} kind={kind} size={110} />)}
          </AbsoluteFill>
        )}
      </SceneIllustrationFrame>
      {activeCaptionPhrase && <WordSyncedCaption phrase={activeCaptionPhrase} nowSeconds={nowSeconds} />}
    </AbsoluteFill>
  );
};
