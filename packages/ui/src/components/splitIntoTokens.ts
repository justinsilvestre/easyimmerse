export type TextToken = { kind: "word" | "other"; text: string };

/**
 * Splits text into words and everything between them. A word is a run of letters, digits,
 * or marks, so punctuation next to a word stays outside it. The tokens concatenate back to
 * the original text.
 */
export function splitIntoTokens(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  for (const match of text.matchAll(
    /[\p{L}\p{N}\p{M}'’]+|[^\p{L}\p{N}\p{M}'’]+/gu,
  )) {
    tokens.push({ kind: isWord(match[0]) ? "word" : "other", text: match[0] });
  }
  return tokens;
}

function isWord(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}
