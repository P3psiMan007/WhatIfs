export interface RenderManifest {
  episodeId: string;
  stateRevision: number;
  renderedAt: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  durationSeconds: number;
  videoPath: string;
  narrationPath: string;
  contactSheetPath: string | null;
  compositionId: string;
  remotionVersion: string;
  gitCommit: string | null;
}
