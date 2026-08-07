/**
 * PASS/FAIL require the check to have actually run. A check that could not
 * be performed (missing tool, unsupported platform, skipped dependency)
 * must report UNVERIFIED, never a silent PASS.
 */
export type QAStatus = "PASS" | "FAIL" | "UNVERIFIED";

export interface QACheckResult {
  name: string;
  status: QAStatus;
  detail: string;
}

export interface QAReport {
  episodeId: string;
  stateRevision: number;
  generatedAt: string;
  overallStatus: QAStatus;
  checks: QACheckResult[];
}
