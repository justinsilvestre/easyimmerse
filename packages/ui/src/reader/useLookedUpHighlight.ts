import { useEffect } from "react";
import { runLookupEnd } from "../components/runLookupStarts.ts";
import { clearWordHighlight, highlightWord } from "./readerWordHighlight.ts";
import type { ReaderWord } from "./wordAtPoint.ts";

/** What highlighting a word of the text needs: its text, where it begins, and whether its script is written without spaces. */
export type HighlightedWord = Pick<
  ReaderWord,
  "text" | "location" | "isUnspaced"
>;

/**
 * Highlights the word the dictionary pop-up shows, as the subtitles do, once its lookup has answered:
 * a word written with spaces whole, and in a script without spaces the characters the lookup matched,
 * or the character it looked up from with its marks when nothing matched. Until the lookup answers, nothing is highlighted.
 */
export function useLookedUpHighlight(
  highlighted:
    | { word: HighlightedWord; matchedLength?: number | null }
    | undefined,
) {
  const location = highlighted?.word.location;
  const length = highlighted && highlightedLength(highlighted);
  const chapterIndex = location?.chapterIndex;
  const paragraphIndex = location?.paragraphIndex;
  const offset = location?.offset;
  useEffect(() => {
    if (
      chapterIndex === undefined ||
      paragraphIndex === undefined ||
      offset === undefined ||
      length === undefined
    )
      return clearWordHighlight();
    highlightWord({ chapterIndex, paragraphIndex, offset }, length);
    return clearWordHighlight;
  }, [chapterIndex, paragraphIndex, offset, length]);
}

/** How many characters to highlight, or undefined while the lookup has not answered. */
function highlightedLength({
  word,
  matchedLength,
}: {
  word: HighlightedWord;
  matchedLength?: number | null;
}): number | undefined {
  if (matchedLength === undefined) return undefined;
  if (!word.isUnspaced) return word.text.length;
  return matchedLength ?? runLookupEnd(word.text, 0);
}
