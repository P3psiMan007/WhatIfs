/**
 * States where no automation exists (or should exist) - the orchestrator
 * NOOPs and says why, rather than guessing an action.
 */
const NOOP_STATES = new Set([
  "IDLE",
  "VOICE_AUDITIONS_READY",
  "RENDERED",
  "QA_PASSED_AWAITING_USER_APPROVAL",
  "PUBLISHED",
  "ANALYZED",
]);

const NOOP_REASONS = {
  IDLE: "no episode is SELECTED yet - that is Growth's job, not this orchestrator's",
  VOICE_AUDITIONS_READY: "auditions are ready for a human to listen to and pick a winner - this orchestrator never selects a voice",
  RENDERED: "technical + creative QA is the Critic/Analytics role's job, not this orchestrator's",
  QA_PASSED_AWAITING_USER_APPROVAL: "publication requires explicit user approval - the highest autonomous state",
  PUBLISHED: "already published, nothing left to automate",
  ANALYZED: "episode lifecycle complete - a new episode can now be SELECTED from here",
  RESEARCH_BLOCKED: "blocked - needs manual intervention before research automation can continue",
  VOICE_BLOCKED: "blocked - needs manual intervention before voice automation can continue",
  QA_FAILED_VOICE: "the selected voice was rejected in QA - run a new voice audition batch manually with adjusted candidates",
  SELECTED: "research/fact-checking is a content-generation step (Growth/LLM automation), not mechanical factory tooling",
  RESEARCHED: "script writing is a content-generation step (Episode Factory/LLM automation), not mechanical factory tooling",
};

/**
 * Pure state -> next-action routing table. No I/O - testable without a
 * real episode-state.json or any of the tools it would dispatch to.
 */
export const determineNextAction = (state) => {
  switch (state.state) {
    case "SCRIPTED":
      return { kind: "voice-audition" };
    case "VOICE_SELECTED":
      return { kind: "narration" };
    case "VOICE_READY":
      return { kind: "render" };
    case "QA_FAILED":
      return { kind: "prepare-rerender" };
    default: {
      const reason = NOOP_REASONS[state.state] ?? `unrecognized state "${state.state}" - no action defined`;
      return { kind: "noop", reason };
    }
  }
};

export const isNoopState = (stateName) => NOOP_STATES.has(stateName);
