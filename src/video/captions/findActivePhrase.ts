import type { CaptionPhrase } from "./types";

export const findActivePhrase = (phrases: CaptionPhrase[], nowSeconds: number): CaptionPhrase | null =>
  phrases.find((p) => nowSeconds >= p.startSeconds && nowSeconds < p.endSeconds) ?? null;
