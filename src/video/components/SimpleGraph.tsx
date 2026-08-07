import React, { useMemo } from "react";
import { useChannelStyle } from "../style/StyleContext";

export type GraphKind = "bar" | "line";

export interface SimpleGraphDatum {
  label: string;
  value: number;
}

export interface SimpleGraphProps {
  kind: GraphKind;
  data: SimpleGraphDatum[];
  width?: number;
  height?: number;
  revealProgress?: number;
  accentColor?: string;
}

export const SimpleGraph: React.FC<SimpleGraphProps> = ({
  kind,
  data,
  width = 800,
  height = 500,
  revealProgress = 1,
  accentColor,
}) => {
  const style = useChannelStyle();
  const chartAccentColor = accentColor || style.palette[3];

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value)), [data]);
  const padding = 80;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const renderBarChart = () => {
    const barWidth = chartWidth / (data.length * 1.2);
    const gap = barWidth * 0.2;

    return data.map((datum, i) => {
      const normalized = datum.value / maxValue;
      const displayHeight = chartHeight * normalized * Math.min(1, revealProgress);
      const x = padding + i * (barWidth + gap) + gap;
      const y = height - padding - displayHeight;

      return (
        <g key={`bar-${i}`}>
          <rect
            x={x}
            y={y}
            width={barWidth}
            height={displayHeight}
            fill="none"
            stroke={chartAccentColor}
            strokeWidth={style.lineWeight}
          />
          <text
            x={x + barWidth / 2}
            y={height - padding + 40}
            textAnchor="middle"
            fontSize="14"
            fill={style.strokeColor}
            fontFamily={style.captionTypography.fontFamily}
          >
            {datum.label}
          </text>
        </g>
      );
    });
  };

  const renderLineChart = () => {
    const points = data.map((datum, i) => {
      const normalized = datum.value / maxValue;
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = height - padding - normalized * chartHeight;
      return [x, y];
    });

    const displayPoints = Math.ceil(points.length * revealProgress);
    const displayedPoints = points.slice(0, displayPoints);

    return (
      <>
        <polyline
          points={displayedPoints.map((p) => `${p[0]},${p[1]}`).join(" ")}
          fill="none"
          stroke={chartAccentColor}
          strokeWidth={style.lineWeight * 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {displayedPoints.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={p[0]}
            cy={p[1]}
            r={style.lineWeight * 1.5}
            fill={chartAccentColor}
          />
        ))}
        {data.map((datum, i) => (
          <text
            key={`label-${i}`}
            x={padding + (i / (data.length - 1)) * chartWidth}
            y={height - padding + 40}
            textAnchor="middle"
            fontSize="14"
            fill={style.strokeColor}
            fontFamily={style.captionTypography.fontFamily}
          >
            {datum.label}
          </text>
        ))}
      </>
    );
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Background */}
      <rect width={width} height={height} fill={style.textureDefaults.paperColor} />

      {/* Y axis */}
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke={style.strokeColor}
        strokeWidth={style.lineWeight}
      />

      {/* X axis */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke={style.strokeColor}
        strokeWidth={style.lineWeight}
      />

      {/* Chart content */}
      {kind === "bar" ? renderBarChart() : renderLineChart()}
    </svg>
  );
};
