export type CameraIntent =
  | "static"
  | "push-in"
  | "pull-out"
  | "pan-left"
  | "pan-right"
  | "parallax-drift"
  | "camera-follow";

export type MotionIntent =
  | "none"
  | "subtle-idle"
  | "character-gesture"
  | "prop-enter"
  | "prop-exit"
  | "expression-change"
  | "camera-follow";

export type TransitionType = "hard-cut" | "match-cut" | "dissolve";

export type VisualPurpose =
  | "establish-premise"
  | "introduce-character"
  | "explain-mechanism"
  | "reveal-number"
  | "show-consequence"
  | "compare-options"
  | "build-tension"
  | "resolve-paradox"
  | "call-to-action";

export interface NarrationSpan {
  text: string;
  segmentStartIndex: number | null;
  segmentEndIndex: number | null;
}

export interface SceneTiming {
  startSeconds: number | null;
  endSeconds: number | null;
}

export interface SceneManifestEntry {
  sceneId: string;
  order: number;
  narration: NarrationSpan;
  timing: SceneTiming;
  visualPurpose: VisualPurpose;
  focalSubject: string;
  environment: string;
  props: string[];
  cameraIntent: CameraIntent;
  motionIntent: MotionIntent[];
  caption: string;
  sfxIntent: string | null;
  transitionIn: TransitionType;
  requiredAssets: string[];
  newInformation: string;
}

export interface SceneManifest {
  episodeId: string;
  fps: number;
  scenes: SceneManifestEntry[];
}
