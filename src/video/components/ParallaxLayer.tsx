import React from "react";

export interface ParallaxLayerProps {
  depthFactor: number;
  cameraOffsetX: number;
  cameraOffsetY: number;
  children: React.ReactNode;
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  depthFactor,
  cameraOffsetX,
  cameraOffsetY,
  children,
}) => {
  const offsetX = cameraOffsetX * depthFactor;
  const offsetY = cameraOffsetY * depthFactor;

  const style: React.CSSProperties = {
    transform: `translate(${offsetX}px, ${offsetY}px)`,
    transformOrigin: "center center",
    willChange: "transform",
  };

  return <div style={style}>{children}</div>;
};
