export interface FactSource {
  title: string;
  url: string;
  publisher: string | null;
  retrievedAt: string | null;
}

export type FactConfidence = "verified" | "likely" | "disputed" | "speculative";
export type FactRiskLevel = "low" | "medium" | "high";

export interface FactEntry {
  id: string;
  claim: string;
  sources: FactSource[];
  confidence: FactConfidence;
  riskLevel: FactRiskLevel;
  usedInScenes: string[];
  notes: string | null;
}

export interface FactLedger {
  episodeId: string;
  generatedAt: string;
  facts: FactEntry[];
}
