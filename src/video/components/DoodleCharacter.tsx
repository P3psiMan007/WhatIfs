import React from "react";
import { random } from "remotion";
import { useChannelStyle } from "../style/StyleContext";
import type { CharacterPoseType } from "./CharacterPose";
import { getLimbTransform } from "./CharacterPose";
import type { FaceExpressionType } from "./FaceExpression";
import { FaceExpression } from "./FaceExpression";

export interface DoodleCharacterProps {
  characterId: string;
  pose: CharacterPoseType;
  expression: FaceExpressionType;
  colorway?: string;
  scale?: number;
  flipX?: boolean;
}

export const DoodleCharacter: React.FC<DoodleCharacterProps> = ({
  characterId,
  pose,
  expression,
  colorway,
  scale = 1,
  flipX = false,
}) => {
  const style = useChannelStyle();
  const limbTransform = getLimbTransform(pose);

  const bodyColor = colorway || style.palette[2];
  const wobbleSeed = random(characterId);
  const wobbleAmount = wobbleSeed * 3;

  const headRadius = 45;
  const bodyWidth = 60;
  const bodyHeight = 80;
  const bodyX = 0;
  const bodyY = headRadius + 30;
  const limbThickness = style.characterProportions.limbThickness;

  const limbLength = 70;
  const shoulderY = bodyY - 20;
  const hipY = bodyY + bodyHeight / 2;

  const renderLimb = (
    startX: number,
    startY: number,
    angle: number,
    length: number,
    thickness: number
  ) => {
    const wobbledAngle = angle + (wobbleAmount - 1.5);
    const rad = (wobbledAngle * Math.PI) / 180;
    const endX = startX + length * Math.cos(rad);
    const endY = startY + length * Math.sin(rad);

    return (
      <line
        key={`limb-${startX}-${startY}`}
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={style.strokeColor}
        strokeWidth={thickness}
        strokeLinecap="round"
      />
    );
  };

  const transform = `${flipX ? `scaleX(-1) translateX(${-220})` : ""} scale(${scale})`;

  // The actual drawn content (head top to feet) spans roughly y=-30..200 -
  // crop the viewBox to that so the character fills its box instead of
  // floating in the top half of a much taller box.
  return (
    <svg viewBox="0 -30 220 230" width={220 * scale} height={230 * scale}>
      <g transform={transform}>
        {/* Left arm */}
        {renderLimb(
          bodyX - bodyWidth / 3,
          shoulderY,
          limbTransform.leftArmDeg,
          limbLength,
          limbThickness
        )}

        {/* Right arm */}
        {renderLimb(
          bodyX + bodyWidth / 3,
          shoulderY,
          limbTransform.rightArmDeg,
          limbLength,
          limbThickness
        )}

        {/* Left leg */}
        {renderLimb(
          bodyX - bodyWidth / 3,
          hipY,
          limbTransform.leftLegDeg + 90,
          limbLength,
          limbThickness
        )}

        {/* Right leg */}
        {renderLimb(
          bodyX + bodyWidth / 3,
          hipY,
          limbTransform.rightLegDeg + 90,
          limbLength,
          limbThickness
        )}

        {/* Body */}
        <rect
          x={bodyX - bodyWidth / 2}
          y={bodyY - bodyHeight / 2}
          width={bodyWidth}
          height={bodyHeight}
          rx={bodyWidth / 4}
          fill="none"
          stroke={bodyColor}
          strokeWidth={style.lineWeight}
        />

        {/* Head */}
        <circle
          cx={bodyX}
          cy={bodyY - bodyHeight / 2 - headRadius - 15}
          r={headRadius}
          fill="none"
          stroke={bodyColor}
          strokeWidth={style.lineWeight}
          transform={`rotate(${limbTransform.headTiltDeg} ${bodyX} ${bodyY - bodyHeight / 2 - headRadius - 15})`}
        />

        {/* Face expression */}
        <g transform={`translate(${bodyX}, ${bodyY - bodyHeight / 2 - headRadius - 15})`}>
          <FaceExpression expression={expression} size={60} />
        </g>
      </g>
    </svg>
  );
};
