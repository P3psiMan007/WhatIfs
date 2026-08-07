const WORDS_PER_SECOND = 170 / 60;

/** Strips markdown heading/list markers so script.md reads as plain narration text. */
export const stripMarkdownToPlainText = (scriptText) =>
  scriptText
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Extracts roughly `targetSeconds` worth of spoken text (170wpm estimate)
 * from the start of a script for use as the shared audition hook.
 */
export const extractHookText = (scriptText, targetSeconds = 22.5) => {
  const plain = stripMarkdownToPlainText(scriptText);
  if (!plain) return "";

  const words = plain.split(" ");
  const wordCount = Math.max(1, Math.round(targetSeconds * WORDS_PER_SECOND));
  return words.slice(0, wordCount).join(" ");
};
