import type { QAStatus } from "./qa";

export type TTSProvider = "kokoro";

export interface VoiceConfig {
  provider: TTSProvider;
  model: string;
  voiceId: string;
  speed: number;
  language: string;
  settings: Record<string, unknown>;
}

export interface MechanicalAudioChecks {
  fileExists: QAStatus;
  nonZeroDuration: QAStatus;
  silenceDetected: QAStatus;
  clippingDetected: QAStatus;
  generationFailed: boolean;
  detail: string;
}

export interface VoiceCandidate {
  candidateId: string;
  voice: VoiceConfig;
  hookText: string;
  audioPath: string;
  durationSeconds: number | null;
  generatedAt: string;
  mechanicalChecks: MechanicalAudioChecks;
}

export interface VoiceAuditionManifest {
  episodeId: string;
  stateRevision: number;
  hookText: string;
  generatedAt: string;
  candidates: VoiceCandidate[];
}

export interface ChannelNarratorConfig {
  selected: boolean;
  episodeIdSelectedFrom: string | null;
  selectedAt: string | null;
  voice: VoiceConfig | null;
  notes: string | null;
}
