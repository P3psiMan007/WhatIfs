import React from "react";
import { useChannelStyle } from "../style/StyleContext";

export type FaceExpressionType =
  | "neutral"
  | "happy"
  | "surprised"
  | "thinking"
  | "concerned"
  | "excited";

export interface FaceExpressionProps {
  expression: FaceExpressionType;
  size?: number;
}

export const FaceExpression: React.FC<FaceExpressionProps> = ({
  expression,
  size = 80,
}) => {
  const style = useChannelStyle();

  const eyeRadius = size * 0.08;
  const eyeSpacing = size * 0.22;
  const eyeY = -size * 0.08;

  const renderEyes = () => {
    if (expression === "surprised") {
      return (
        <>
          <circle
            cx={-eyeSpacing}
            cy={eyeY}
            r={eyeRadius * 1.3}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
          />
          <circle
            cx={eyeSpacing}
            cy={eyeY}
            r={eyeRadius * 1.3}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
          />
          <circle
            cx={-eyeSpacing}
            cy={eyeY}
            r={eyeRadius * 0.6}
            fill={style.strokeColor}
          />
          <circle
            cx={eyeSpacing}
            cy={eyeY}
            r={eyeRadius * 0.6}
            fill={style.strokeColor}
          />
        </>
      );
    }

    if (expression === "thinking") {
      return (
        <>
          <path
            d={`M ${-eyeSpacing - eyeRadius} ${eyeY} Q ${-eyeSpacing} ${eyeY + eyeRadius} ${-eyeSpacing + eyeRadius} ${eyeY}`}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
            strokeLinecap="round"
          />
          <path
            d={`M ${eyeSpacing - eyeRadius} ${eyeY} Q ${eyeSpacing} ${eyeY + eyeRadius} ${eyeSpacing + eyeRadius} ${eyeY}`}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
            strokeLinecap="round"
          />
        </>
      );
    }

    if (expression === "excited") {
      return (
        <>
          <circle
            cx={-eyeSpacing}
            cy={eyeY}
            r={eyeRadius}
            fill={style.strokeColor}
          />
          <circle
            cx={eyeSpacing}
            cy={eyeY}
            r={eyeRadius}
            fill={style.strokeColor}
          />
          <circle
            cx={-eyeSpacing}
            cy={eyeY}
            r={eyeRadius * 0.4}
            fill={style.palette[0]}
          />
          <circle
            cx={eyeSpacing}
            cy={eyeY}
            r={eyeRadius * 0.4}
            fill={style.palette[0]}
          />
        </>
      );
    }

    return (
      <>
        <circle
          cx={-eyeSpacing}
          cy={eyeY}
          r={eyeRadius}
          fill={style.strokeColor}
        />
        <circle
          cx={eyeSpacing}
          cy={eyeY}
          r={eyeRadius}
          fill={style.strokeColor}
        />
      </>
    );
  };

  const renderEyebrows = () => {
    const browY = eyeY - eyeRadius * 2;
    const browLength = eyeRadius * 1.4;

    if (expression === "happy" || expression === "excited") {
      return (
        <>
          <path
            d={`M ${-eyeSpacing - browLength} ${browY} Q ${-eyeSpacing} ${browY + eyeRadius * 0.8} ${-eyeSpacing + browLength} ${browY}`}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
            strokeLinecap="round"
          />
          <path
            d={`M ${eyeSpacing - browLength} ${browY} Q ${eyeSpacing} ${browY + eyeRadius * 0.8} ${eyeSpacing + browLength} ${browY}`}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
            strokeLinecap="round"
          />
        </>
      );
    }

    if (expression === "surprised") {
      return (
        <>
          <path
            d={`M ${-eyeSpacing - browLength} ${browY - eyeRadius * 0.5} L ${-eyeSpacing} ${browY - eyeRadius * 1.2} L ${-eyeSpacing + browLength} ${browY - eyeRadius * 0.5}`}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={`M ${eyeSpacing - browLength} ${browY - eyeRadius * 0.5} L ${eyeSpacing} ${browY - eyeRadius * 1.2} L ${eyeSpacing + browLength} ${browY - eyeRadius * 0.5}`}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    }

    if (expression === "concerned") {
      return (
        <>
          <path
            d={`M ${-eyeSpacing - browLength} ${browY} Q ${-eyeSpacing} ${browY - eyeRadius * 0.6} ${-eyeSpacing + browLength} ${browY - eyeRadius * 0.4}`}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
            strokeLinecap="round"
          />
          <path
            d={`M ${eyeSpacing - browLength} ${browY - eyeRadius * 0.4} Q ${eyeSpacing} ${browY - eyeRadius * 0.6} ${eyeSpacing + browLength} ${browY}`}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.lineWeight}
            strokeLinecap="round"
          />
        </>
      );
    }

    return (
      <>
        <line
          x1={-eyeSpacing - browLength}
          y1={browY}
          x2={-eyeSpacing + browLength}
          y2={browY}
          stroke={style.strokeColor}
          strokeWidth={style.lineWeight}
          strokeLinecap="round"
        />
        <line
          x1={eyeSpacing - browLength}
          y1={browY}
          x2={eyeSpacing + browLength}
          y2={browY}
          stroke={style.strokeColor}
          strokeWidth={style.lineWeight}
          strokeLinecap="round"
        />
      </>
    );
  };

  const renderMouth = () => {
    const mouthY = size * 0.15;

    if (expression === "happy" || expression === "excited") {
      return (
        <path
          d={`M ${-size * 0.12} ${mouthY} Q 0 ${mouthY + size * 0.08} ${size * 0.12} ${mouthY}`}
          fill="none"
          stroke={style.strokeColor}
          strokeWidth={style.lineWeight}
          strokeLinecap="round"
        />
      );
    }

    if (expression === "surprised") {
      return (
        <circle
          cx={0}
          cy={mouthY}
          r={size * 0.06}
          fill="none"
          stroke={style.strokeColor}
          strokeWidth={style.lineWeight}
        />
      );
    }

    if (expression === "thinking") {
      return (
        <path
          d={`M ${-size * 0.12} ${mouthY} Q 0 ${mouthY - size * 0.04} ${size * 0.12} ${mouthY}`}
          fill="none"
          stroke={style.strokeColor}
          strokeWidth={style.lineWeight}
          strokeLinecap="round"
        />
      );
    }

    if (expression === "concerned") {
      return (
        <path
          d={`M ${-size * 0.12} ${mouthY - size * 0.04} Q 0 ${mouthY - size * 0.08} ${size * 0.12} ${mouthY - size * 0.04}`}
          fill="none"
          stroke={style.strokeColor}
          strokeWidth={style.lineWeight}
          strokeLinecap="round"
        />
      );
    }

    return (
      <line
        x1={-size * 0.08}
        y1={mouthY}
        x2={size * 0.08}
        y2={mouthY}
        stroke={style.strokeColor}
        strokeWidth={style.lineWeight}
        strokeLinecap="round"
      />
    );
  };

  return (
    <svg
      viewBox={`${-size * 0.5} ${-size * 0.4} ${size} ${size}`}
      width={size}
      height={size}
      style={{ overflow: "visible" }}
    >
      {renderEyebrows()}
      {renderEyes()}
      {renderMouth()}
    </svg>
  );
};
