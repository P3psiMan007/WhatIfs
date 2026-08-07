export interface NarrationSegment {
  index: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
  isKeyWord: boolean;
}

export interface NarrationTiming {
  episodeId: string;
  voiceAssetPath: string;
  totalDurationSeconds: number;
  segments: NarrationSegment[];
}

export interface PronunciationEntry {
  term: string;
  ipa: string | null;
  respelling: string | null;
  notes: string | null;
}
