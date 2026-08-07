import type { EnvironmentSetting } from "../components/DoodleEnvironment";
import type { PropKind } from "../components/DoodleProp";

/**
 * These are best-effort keyword heuristics for turning free-text scene
 * manifest fields into a concrete visual choice when no explicit visual
 * direction has been authored for the scene yet. They are a reasonable
 * default renderer, not an art-direction system - a real content/art
 * pipeline should eventually author explicit per-scene visual directives
 * instead of relying on keyword matching. See docs/FACTORY_ARCHITECTURE.md.
 */

const ENVIRONMENT_KEYWORDS: Array<[EnvironmentSetting, RegExp]> = [
  ["city", /\b(city|street|urban|skyline|downtown)\b/i],
  ["office", /\b(office|desk|meeting|workplace|corporate)\b/i],
  ["nature", /\b(forest|nature|outdoor|park|tree|mountain|field)\b/i],
  ["space", /\b(space|galaxy|planet|orbit|universe|cosmos)\b/i],
  ["home", /\b(home|house|living room|kitchen|bedroom|couch)\b/i],
  ["abstract-graph", /\b(graph|chart|data|trend|statistics)\b/i],
];

export const mapEnvironmentHint = (text: string): EnvironmentSetting => {
  for (const [setting, pattern] of ENVIRONMENT_KEYWORDS) {
    if (pattern.test(text)) return setting;
  }
  return "void";
};

const PROP_KEYWORDS: Array<[PropKind, RegExp]> = [
  ["arrow-sign", /\barrow\b/i],
  ["book", /\bbook\b/i],
  ["lightbulb", /\b(idea|lightbulb|bulb)\b/i],
  ["question-mark", /\b(question|mystery|unknown)\b/i],
  ["clock", /\b(clock|time|timer|deadline)\b/i],
  ["coin", /\b(coin|money|cash|dollar|currency)\b/i],
  ["chart", /\bchart\b/i],
  ["phone", /\bphone\b/i],
  ["door", /\bdoor\b/i],
  ["briefcase", /\b(briefcase|job|career|business)\b/i],
];

export const mapPropHint = (text: string): PropKind | null => {
  for (const [kind, pattern] of PROP_KEYWORDS) {
    if (pattern.test(text)) return kind;
  }
  return null;
};

export interface ExtractedHeroNumber {
  value: number;
  prefix: string;
  suffix: string;
}

// Unit words are \b-terminated so "5 minutes"/"5 meters" can't be
// misread as "5 million"/"5 m" - only a whole standalone unit token counts.
const NUMBER_WITH_CONTEXT_RE = /([$€£]?)\s*(\d[\d,]*(?:\.\d+)?)\s*(%|k\b|m\b|bn\b|billion\b|million\b|thousand\b)?/i;
const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  thousand: 1_000,
  million: 1_000_000,
  bn: 1_000_000_000,
  billion: 1_000_000_000,
};

/** Extracts the first number-like token from text for a HeroNumber scene, or null if none is found. */
export const extractHeroNumber = (text: string): ExtractedHeroNumber | null => {
  const match = text.match(NUMBER_WITH_CONTEXT_RE);
  if (!match) return null;

  const [, currencySymbol, numberPart, unit] = match;
  const numeric = Number.parseFloat(numberPart.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return null;

  const unitKey = unit?.toLowerCase();
  const multiplier = unitKey && MULTIPLIERS[unitKey] ? MULTIPLIERS[unitKey] : 1;
  const suffix = unitKey === "%" ? "%" : "";

  return {
    value: Math.round(numeric * multiplier),
    prefix: currencySymbol ?? "",
    suffix,
  };
};
