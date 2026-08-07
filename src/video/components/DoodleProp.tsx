import React from "react";
import { useChannelStyle } from "../style/StyleContext";

export type PropKind =
  | "arrow-sign"
  | "book"
  | "lightbulb"
  | "question-mark"
  | "clock"
  | "coin"
  | "chart"
  | "phone"
  | "door"
  | "briefcase";

export interface DoodlePropProps {
  kind: PropKind;
  size?: number;
  rotationDeg?: number;
}

export const DoodleProp: React.FC<DoodlePropProps> = ({
  kind,
  size = 120,
  rotationDeg = 0,
}) => {
  const style = useChannelStyle();
  const lineColor = style.strokeColor;

  const renderArrowSign = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Pole */}
        <line x1="60" y1="60" x2="60" y2="110" stroke={lineColor} strokeWidth={8} />
        {/* Arrow rectangle */}
        <rect
          x="20"
          y="30"
          width="80"
          height="30"
          rx="8"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        {/* Arrow point */}
        <polygon
          points="100,45 120,45 110,60"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );

  const renderBook = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        <rect
          x="20"
          y="30"
          width="80"
          height="60"
          rx="4"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        <line x1="60" y1="30" x2="60" y2="90" stroke={lineColor} strokeWidth={6} />
      </g>
    </svg>
  );

  const renderLightbulb = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Bulb */}
        <circle
          cx="60"
          cy="45"
          r="25"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        {/* Filament */}
        <path
          d="M 50 35 Q 55 25 60 35 Q 65 45 60 55"
          fill="none"
          stroke={lineColor}
          strokeWidth={4}
          strokeLinecap="round"
        />
        {/* Base */}
        <rect
          x="50"
          y="68"
          width="20"
          height="25"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
      </g>
    </svg>
  );

  const renderQuestionMark = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Circle background */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        {/* Question mark */}
        <path
          d="M 50 40 Q 50 30 60 30 Q 70 30 70 40 Q 70 50 60 55"
          fill="none"
          stroke={lineColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="75" r="5" fill={lineColor} />
      </g>
    </svg>
  );

  const renderClock = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Circle */}
        <circle
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        {/* Hour hand */}
        <line x1="60" y1="60" x2="60" y2="35" stroke={lineColor} strokeWidth={6} />
        {/* Minute hand */}
        <line x1="60" y1="60" x2="75" y2="60" stroke={lineColor} strokeWidth={6} />
        {/* Center dot */}
        <circle cx="60" cy="60" r="4" fill={lineColor} />
      </g>
    </svg>
  );

  const renderCoin = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Circle */}
        <circle
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        {/* Currency symbol */}
        <text
          x="60"
          y="70"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="40"
          fontWeight="bold"
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
        >
          $
        </text>
      </g>
    </svg>
  );

  const renderChart = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Bars */}
        <rect
          x="20"
          y="50"
          width="15"
          height="40"
          fill="none"
          stroke={lineColor}
          strokeWidth={5}
        />
        <rect
          x="50"
          y="30"
          width="15"
          height="60"
          fill="none"
          stroke={lineColor}
          strokeWidth={5}
        />
        <rect
          x="80"
          y="45"
          width="15"
          height="45"
          fill="none"
          stroke={lineColor}
          strokeWidth={5}
        />
        {/* Baseline */}
        <line x1="15" y1="92" x2="100" y2="92" stroke={lineColor} strokeWidth={6} />
      </g>
    </svg>
  );

  const renderPhone = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Phone body */}
        <rect
          x="35"
          y="20"
          width="50"
          height="80"
          rx="6"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        {/* Screen */}
        <rect
          x="40"
          y="30"
          width="40"
          height="45"
          fill="none"
          stroke={lineColor}
          strokeWidth={4}
        />
        {/* Speaker hole */}
        <circle cx="60" cy="82" r="3" fill={lineColor} />
      </g>
    </svg>
  );

  const renderDoor = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Door frame */}
        <rect
          x="25"
          y="20"
          width="70"
          height="80"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        {/* Door panel line */}
        <line x1="25" y1="20" x2="90" y2="100" stroke={lineColor} strokeWidth={4} />
        {/* Door knob */}
        <circle cx="80" cy="60" r="6" fill={lineColor} />
      </g>
    </svg>
  );

  const renderBriefcase = () => (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <g transform={`rotate(${rotationDeg} 60 60)`}>
        {/* Case body */}
        <rect
          x="20"
          y="40"
          width="80"
          height="50"
          rx="4"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
        />
        {/* Handle */}
        <path
          d="M 40 40 Q 40 20 80 20 Q 80 40 80 40"
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Lock */}
        <circle cx="60" cy="65" r="6" fill="none" stroke={lineColor} strokeWidth={4} />
      </g>
    </svg>
  );

  const renderProp = () => {
    switch (kind) {
      case "arrow-sign":
        return renderArrowSign();
      case "book":
        return renderBook();
      case "lightbulb":
        return renderLightbulb();
      case "question-mark":
        return renderQuestionMark();
      case "clock":
        return renderClock();
      case "coin":
        return renderCoin();
      case "chart":
        return renderChart();
      case "phone":
        return renderPhone();
      case "door":
        return renderDoor();
      case "briefcase":
        return renderBriefcase();
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  };

  return renderProp();
};
