import React from "react";
import type { CameraIntent } from "../types/scene";
import { useChannelStyle } from "../style/StyleContext";

export interface SceneIllustrationFrameProps {
  cameraIntent: CameraIntent;
  cameraProgress: number;
  children: React.ReactNode;
}

export const SceneIllustrationFrame: React.FC<SceneIllustrationFrameProps> = ({
  cameraIntent,
  cameraProgress,
  children,
}) => {
  const style = useChannelStyle();
  const progress = Math.max(0, Math.min(1, cameraProgress));

  const getTransform = (): string => {
    switch (cameraIntent) {
      case "static":
        return "none";

      case "push-in": {
        const pushScale = 1.0 + 0.08 * progress;
        return `scale(${pushScale})`;
      }

      case "pull-out": {
        const pullScale = 1.08 - 0.08 * progress;
        return `scale(${pullScale})`;
      }

      case "pan-left": {
        const panLeftX = 40 - 80 * progress;
        return `translateX(${panLeftX}px)`;
      }

      case "pan-right": {
        const panRightX = -40 + 80 * progress;
        return `translateX(${panRightX}px)`;
      }

      case "parallax-drift": {
        const driftScale = 1.0 + 0.04 * Math.sin(progress * Math.PI);
        const driftX = Math.sin(progress * Math.PI * 2) * 20;
        const driftY = Math.cos(progress * Math.PI * 2) * 10;
        return `scale(${driftScale}) translate(${driftX}px, ${driftY}px)`;
      }

      default: {
        const _exhaustive: never = cameraIntent;
        return _exhaustive;
      }
    }
  };

  const containerStyle: React.CSSProperties = {
    width: 1920,
    height: 1080,
    position: "relative",
    overflow: "hidden",
    backgroundColor: style.textureDefaults.paperColor,
  };

  const contentStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    padding: `${style.safeMargins.topPx}px ${style.safeMargins.rightPx}px ${style.safeMargins.bottomPx}px ${style.safeMargins.leftPx}px`,
    boxSizing: "border-box",
    transform: getTransform(),
    transformOrigin: "center center",
    willChange: "transform",
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>{children}</div>
    </div>
  );
};
