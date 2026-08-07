import React from "react";
import { useChannelStyle } from "../style/StyleContext";

export interface TextureOverlayProps {
  opacity?: number;
  seed?: number;
}

export const TextureOverlay: React.FC<TextureOverlayProps> = ({
  opacity,
  seed = 42,
}) => {
  const style = useChannelStyle();
  const finalOpacity = opacity ?? style.textureDefaults.grainOpacity;

  return (
    <svg
      width="1920"
      height="1080"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        opacity: finalOpacity,
      }}
      viewBox="0 0 1920 1080"
    >
      <defs>
        <filter id={`paper-texture-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="4"
            seed={seed}
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="saturate"
            values="0"
            result="desaturated"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="desaturated"
            scale="1"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      <rect
        width="1920"
        height="1080"
        fill={style.strokeColor}
        filter={`url(#paper-texture-${seed})`}
      />
    </svg>
  );
};
