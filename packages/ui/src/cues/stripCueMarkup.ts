const characterReferences: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&lrm;": "‎",
  "&rlm;": "‏",
};

/**
 * Returns the plain text of a cue: tags such as `<i>` or WebVTT's `<c.yellow>`, and
 * SubStation Alpha override blocks such as `{\an8}`, are removed, and the character
 * references WebVTT allows are decoded. Line breaks are kept.
 */
export function stripCueMarkup(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\{\\[^}]*\}/g, "")
    .replace(
      /&(?:amp|lt|gt|nbsp|lrm|rlm);/g,
      (reference) => characterReferences[reference] ?? reference,
    );
}
