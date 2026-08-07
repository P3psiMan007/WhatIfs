import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneIllustrationFrame } from "../components/SceneIllustrationFrame";
import { DoodleEnvironment } from "../components/DoodleEnvironment";
import { DoodleCharacter } from "../components/DoodleCharacter";
import { DoodleProp } from "../components/DoodleProp";
import { HeroNumber } from "../components/HeroNumber";
import { WordSyncedCaption } from "../captions/WordSyncedCaption";
import type { CaptionPhrase } from "../captions/types";
import type { SceneManifestEntry } from "../types/scene";
import { mapEnvironmentHint, mapPropHint, extractHeroNumber } from "./contentHints";

export interface SceneRendererProps {
  scene: SceneManifestEntry;
  cameraProgress: number;
  revealProgress: number;
  activeCaptionPhrase: CaptionPhrase | null;
  nowSeconds: number;
}

/**
 * Default heuristic renderer: turns a scene's free-text manifest fields into
 * a plausible visual using keyword matching (see contentHints.ts). This is a
 * reasonable fallback, not a real art-direction system - a future content
 * pipeline should be able to author explicit per-scene visual directives
 * (character pose/expression/position, prop placement) instead.
 */
export const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  cameraProgress,
  revealProgress,
  activeCaptionPhrase,
  nowSeconds,
}) => {
  const heroNumber = scene.visualPurpose === "reveal-number" ? extractHeroNumber(scene.newInformation) : null;
  // A hero number needs a clean backdrop - an environment's own illustration
  // (e.g. abstract-graph's axis/line) would otherwise compete with it for
  // the same screen space.
  const environment = heroNumber ? "void" : mapEnvironmentHint(`${scene.environment} ${scene.focalSubject}`);
  const propKinds = scene.props.map(mapPropHint).filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <AbsoluteFill>
      <SceneIllustrationFrame cameraIntent={scene.cameraIntent} cameraProgress={cameraProgress}>
        <AbsoluteFill>
          <DoodleEnvironment setting={environment} />
        </AbsoluteFill>

        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {heroNumber ? (
            <HeroNumber value={heroNumber.value} prefix={heroNumber.prefix} suffix={heroNumber.suffix} progress={revealProgress} />
          ) : (
            <DoodleCharacter characterId={scene.sceneId} pose="standing" expression="neutral" />
          )}
        </AbsoluteFill>

        {propKinds.length > 0 && (
          <AbsoluteFill style={{ alignItems: "flex-end", justifyContent: "flex-start", flexDirection: "row", gap: 24, padding: 40 }}>
            {propKinds.map((kind, i) => (
              <DoodleProp key={`${kind}-${i}`} kind={kind} size={110} />
            ))}
          </AbsoluteFill>
        )}
      </SceneIllustrationFrame>

      {activeCaptionPhrase && <WordSyncedCaption phrase={activeCaptionPhrase} nowSeconds={nowSeconds} />}
    </AbsoluteFill>
  );
};
