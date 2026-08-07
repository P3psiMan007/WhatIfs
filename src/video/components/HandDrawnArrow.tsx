import React, { useMemo } from "react";
import { useChannelStyle } from "../style/StyleContext";

export interface HandDrawnArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  curved?: boolean;
  drawProgress?: number;
  color?: string;
}

/**
 * Analytical arc-length approximation for a quadratic bezier (sampled
 * polyline sum). No DOM measurement - this must give the same answer during
 * Remotion's Node-side rendering as it does in a browser.
 */
const estimateQuadraticBezierLength = (
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  segments = 24,
): number => {
  let length = 0;
  let prevX = x0;
  let prevY = y0;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * x0 + 2 * oneMinusT * t * cx + t * t * x1;
    const y = oneMinusT * oneMinusT * y0 + 2 * oneMinusT * t * cy + t * t * y1;
    length += Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
  }
  return length;
};

export const HandDrawnArrow: React.FC<HandDrawnArrowProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  curved = false,
  drawProgress = 1,
  color,
}) => {
  const style = useChannelStyle();
  const arrowColor = color || style.strokeColor;

  const controlPoint = useMemo(() => {
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    return { cx: (fromX + toX) / 2 + deltaY * 0.15, cy: (fromY + toY) / 2 - deltaX * 0.15 };
  }, [fromX, fromY, toX, toY]);

  const pathData = curved
    ? `M ${fromX} ${fromY} Q ${controlPoint.cx} ${controlPoint.cy} ${toX} ${toY}`
    : `M ${fromX} ${fromY} L ${toX} ${toY}`;

  const totalLength = useMemo(() => {
    if (curved) {
      return estimateQuadraticBezierLength(fromX, fromY, controlPoint.cx, controlPoint.cy, toX, toY);
    }
    return Math.hypot(toX - fromX, toY - fromY);
  }, [fromX, fromY, toX, toY, curved, controlPoint]);

  const dashOffset = totalLength * (1 - Math.max(0, Math.min(1, drawProgress)));

  const arrowheadDistance = 30;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowPoint1X = toX - arrowheadDistance * Math.cos(angle - Math.PI / 6);
  const arrowPoint1Y = toY - arrowheadDistance * Math.sin(angle - Math.PI / 6);
  const arrowPoint2X = toX - arrowheadDistance * Math.cos(angle + Math.PI / 6);
  const arrowPoint2Y = toY - arrowheadDistance * Math.sin(angle + Math.PI / 6);

  const arrowheadOpacity = drawProgress > 0.7 ? (drawProgress - 0.7) / 0.3 : 0;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1920 1080"
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      {/* Arrow line */}
      <path
        d={pathData}
        fill="none"
        stroke={arrowColor}
        strokeWidth={style.lineWeight}
        strokeLinecap="round"
        strokeDasharray={totalLength}
        strokeDashoffset={dashOffset}
      />

      {/* Arrowhead */}
      <polyline
        points={`${toX},${toY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
        fill="none"
        stroke={arrowColor}
        strokeWidth={style.lineWeight}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={arrowheadOpacity}
      />
    </svg>
  );
};
