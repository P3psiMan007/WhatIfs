import React from "react";
import { useChannelStyle } from "../style/StyleContext";

export interface HeroNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  progress: number;
}

export const HeroNumber: React.FC<HeroNumberProps> = ({
  value,
  prefix = "",
  suffix = "",
  label = "",
  progress,
}) => {
  const style = useChannelStyle();

  const displayValue = Math.round(value * Math.min(1, progress));
  const scale = 0.8 + 0.2 * Math.min(1, progress);
  const opacity = Math.min(1, progress * 2);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale})`,
        opacity: opacity,
        transformOrigin: "center",
      }}
    >
      <div
        style={{
          fontSize: style.captionTypography.fontSizePx * 2.5,
          fontWeight: "bold",
          color: style.captionTypography.baseColor,
          textShadow: `
            -${style.lineWeight / 2}px -${style.lineWeight / 2}px 0 ${style.strokeColor},
            ${style.lineWeight / 2}px -${style.lineWeight / 2}px 0 ${style.strokeColor},
            -${style.lineWeight / 2}px ${style.lineWeight / 2}px 0 ${style.strokeColor},
            ${style.lineWeight / 2}px ${style.lineWeight / 2}px 0 ${style.strokeColor}
          `,
          fontFamily: style.captionTypography.fontFamily,
          lineHeight: 1,
        }}
      >
        {prefix}
        {displayValue.toLocaleString()}
        {suffix}
      </div>
      {label && (
        <div
          style={{
            fontSize: style.captionTypography.fontSizePx * 0.8,
            color: style.captionTypography.baseColor,
            marginTop: "20px",
            fontFamily: style.captionTypography.fontFamily,
            textShadow: `
              -2px -2px 0 ${style.strokeColor},
              2px -2px 0 ${style.strokeColor},
              -2px 2px 0 ${style.strokeColor},
              2px 2px 0 ${style.strokeColor}
            `,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
