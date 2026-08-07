export type BrainSleepSceneFamily =
  | "switch-paradox"
  | "mouse-local"
  | "stadium-local"
  | "fatigue-human"
  | "mouse-experiment"
  | "dolphin"
  | "frigatebird"
  | "human-first-night"
  | "distributed-brain"
  | "future-caveat"
  | "evolution-finale"
  | "fallback";

export const getBrainSleepSceneFamily = (sceneId: string): BrainSleepSceneFamily => {
  const match = /^s(\d{2})$/.exec(sceneId);
  if (!match) return "fallback";
  const n = Number(match[1]);
  if (n >= 1 && n <= 3) return "switch-paradox";
  if (n >= 4 && n <= 6) return "mouse-local";
  if (n >= 7 && n <= 10) return "stadium-local";
  if (n >= 11 && n <= 13) return "fatigue-human";
  if (n >= 14 && n <= 21) return "mouse-experiment";
  if (n >= 22 && n <= 25) return "dolphin";
  if (n >= 26 && n <= 29) return "frigatebird";
  if (n >= 30 && n <= 34) return "human-first-night";
  if (n >= 35 && n <= 37) return "distributed-brain";
  if (n >= 38 && n <= 40) return "future-caveat";
  if (n >= 41 && n <= 42) return "evolution-finale";
  return "fallback";
};
