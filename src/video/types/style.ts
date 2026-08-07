export interface ChannelStyleConfig {
  lineWeight: number;
  strokeColor: string;
  characterProportions: {
    headToBodyRatio: number;
    limbThickness: number;
  };
  faceDesign: {
    eyeStyle: "dot" | "oval";
    mouthStyle: "line" | "curve";
  };
  captionTypography: {
    fontFamily: string;
    fontSizePx: number;
    highlightColor: string;
    baseColor: string;
    outlineColor: string;
  };
  safeMargins: {
    topPx: number;
    bottomPx: number;
    leftPx: number;
    rightPx: number;
  };
  motionDefaults: {
    pushPullDistancePx: number;
    parallaxDepthFactor: number;
    springDamping: number;
  };
  textureDefaults: {
    grainOpacity: number;
    paperColor: string;
  };
  palette: string[];
}
