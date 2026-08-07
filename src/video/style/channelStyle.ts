import type { ChannelStyleConfig } from "../types/style";

export const defaultChannelStyle: ChannelStyleConfig = {
  lineWeight: 6,
  strokeColor: "#1a1a1a",
  characterProportions: {
    headToBodyRatio: 0.32,
    limbThickness: 10,
  },
  faceDesign: {
    eyeStyle: "dot",
    mouthStyle: "curve",
  },
  captionTypography: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    fontSizePx: 64,
    highlightColor: "#ffd23f",
    baseColor: "#ffffff",
    outlineColor: "#1a1a1a",
  },
  safeMargins: {
    topPx: 140,
    bottomPx: 220,
    leftPx: 120,
    rightPx: 120,
  },
  motionDefaults: {
    pushPullDistancePx: 60,
    parallaxDepthFactor: 0.15,
    springDamping: 200,
  },
  textureDefaults: {
    grainOpacity: 0.05,
    paperColor: "#f6f1e7",
  },
  palette: ["#f6f1e7", "#1a1a1a", "#ff5a5f", "#ffd23f", "#3a86ff", "#06a77d"],
};
