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

export const SceneRenderer: React.FC<SceneRendererProps> = ({
  episodeId,
  scene,
  cameraProgress,
  revealProgress,
  activeCaptionPhrase,
  nowSeconds,
}) => {
  if (episodeId === "20260807-brain-sleeps-awake") {
    return (
      <AbsoluteFill>
        <BrainSleepSceneArt scene={scene} cameraProgress={cameraProgress} revealProgress={revealProgress} />
        {activeCaptionPhrase && <WordSyncedCaption phrase={activeCaptionPhrase} nowSeconds={nowSeconds} />}
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
