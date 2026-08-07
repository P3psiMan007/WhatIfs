import type { ChannelStyleConfig } from "../types/style";
import type { QACheckResult } from "../types/qa";
import type { CaptionPhrase } from "./types";

/**
 * There is no DOM/canvas available where this runs (Node test process or
 * server-side render), so exact glyph metrics aren't available. This ratio
 * approximates average glyph advance width for a typical condensed sans at
 * a given font size — good enough to flag phrases that are clearly too long
 * for the safe-margin width, not a pixel-perfect layout engine.
 */
const AVG_CHAR_WIDTH_RATIO = 0.56;

export interface CaptionBoundsInput {
  text: string;
  fontSizePx: number;
  canvasWidth: number;
  safeMarginLeftPx: number;
  safeMarginRightPx: number;
}

export interface CaptionBoundsResult {
  estimatedWidthPx: number;
  availableWidthPx: number;
  fitsWithinSafeWidth: boolean;
  overflowPx: number;
}

export const estimateCaptionBounds = (input: CaptionBoundsInput): CaptionBoundsResult => {
  const estimatedWidthPx = input.text.length * input.fontSizePx * AVG_CHAR_WIDTH_RATIO;
  const availableWidthPx = input.canvasWidth - input.safeMarginLeftPx - input.safeMarginRightPx;
  const overflowPx = Math.max(0, estimatedWidthPx - availableWidthPx);
  return {
    estimatedWidthPx,
    availableWidthPx,
    fitsWithinSafeWidth: overflowPx === 0,
    overflowPx,
  };
};

export const checkPhrasesWithinSafeBounds = (
  phrases: CaptionPhrase[],
  style: ChannelStyleConfig,
  canvasWidth: number,
): QACheckResult => {
  if (phrases.length === 0) {
    return { name: "caption-safe-bounds", status: "UNVERIFIED", detail: "no caption phrases supplied" };
  }

  const overflowing = phrases
    .map((phrase) => ({
      phrase,
      bounds: estimateCaptionBounds({
        text: phrase.text,
        fontSizePx: style.captionTypography.fontSizePx,
        canvasWidth,
        safeMarginLeftPx: style.safeMargins.leftPx,
        safeMarginRightPx: style.safeMargins.rightPx,
      }),
    }))
    .filter((entry) => !entry.bounds.fitsWithinSafeWidth);

  if (overflowing.length > 0) {
    const detail = overflowing
      .map((entry) => `"${entry.phrase.text}" overflows by ~${Math.round(entry.bounds.overflowPx)}px`)
      .join("; ");
    return { name: "caption-safe-bounds", status: "FAIL", detail };
  }

  return {
    name: "caption-safe-bounds",
    status: "PASS",
    detail: `${phrases.length} phrase(s) estimated within safe width`,
  };
};
