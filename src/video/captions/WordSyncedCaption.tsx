import React from "react";
import { useChannelStyle } from "../style/StyleContext";
import type { CaptionPhrase } from "./types";

export interface WordSyncedCaptionProps {
  phrase: CaptionPhrase;
  nowSeconds: number;
}

const isActive = (word: CaptionPhrase["words"][number], nowSeconds: number): boolean =>
  nowSeconds >= word.startSeconds && nowSeconds < word.endSeconds;

export const WordSyncedCaption: React.FC<WordSyncedCaptionProps> = ({ phrase, nowSeconds }) => {
  const style = useChannelStyle();
  const { captionTypography, safeMargins } = style;

  return (
    <div
      style={{
        position: "absolute",
        left: safeMargins.leftPx,
        right: safeMargins.rightPx,
        bottom: safeMargins.bottomPx,
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        columnGap: "0.35em",
        rowGap: "0.1em",
        fontFamily: captionTypography.fontFamily,
        fontSize: captionTypography.fontSizePx,
        fontWeight: 800,
        lineHeight: 1.15,
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {phrase.words.map((word, index) => {
        const active = isActive(word, nowSeconds);
        const color = active ? captionTypography.highlightColor : captionTypography.baseColor;
        return (
          <span
            key={`${phrase.startSeconds}-${index}`}
            style={{
              color,
              WebkitTextStroke: `2px ${captionTypography.outlineColor}`,
              paintOrder: "stroke fill",
              textShadow: `0 4px 10px ${captionTypography.outlineColor}80`,
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
