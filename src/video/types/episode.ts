export interface EpisodePackage {
  episodeId: string;
  pipelineVersion: "2.1";
  title: string;
  premise: string;
  coreParadox: string;
  hookPromise: string;
  targetLengthMinutes: number;
  opportunityScore: number | null;
  whyThisWins: string | null;
  researchQuestions: string[];
  factRisks: string[];
  createdAt: string;
  updatedAt: string;
}
