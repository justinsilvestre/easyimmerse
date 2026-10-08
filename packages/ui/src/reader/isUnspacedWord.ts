import { isUnspacedLetter } from "../components/ClickableText.tsx";

/**
 * Tells whether a word holds a letter of Chinese, Japanese or Bopomofo, so that a lookup can start inside it,
 * as `runLookupStarts` lists, rather than only at its start. A word that begins with digits, as in 2026年, counts too.
 */
export function isUnspacedWord(word: string): boolean {
  return [...word].some(isUnspacedLetter);
}
