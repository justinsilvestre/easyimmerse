import { useEffect } from "react";
import { characterLength } from "../components/characterLength.ts";
import { clearWordHighlight, highlightWord } from "./readerWordHighlight.ts";
import type { ReaderWord } from "./wordAtPoint.ts";

/**
 * Highlights the word the dictionary pop-up shows, as the subtitles do:
 * a word written with spaces whole, and in a script without spaces the characters the lookup matched,
 * or, until the lookup answers, the character it looks up from.
 */
export function useLookedUpHighlight(
  highlighted: { word: ReaderWord; matchedLength?: number } | undefined,
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
      return;
    highlightWord({ chapterIndex, paragraphIndex, offset }, length);
    return clearWordHighlight;
  }, [chapterIndex, paragraphIndex, offset, length]);
}

function highlightedLength({
  word,
  matchedLength,
}: {
  word: ReaderWord;
  matchedLength?: number;
}): number {
  if (!word.isUnspaced) return word.text.length;
  return matchedLength ?? characterLength(word.text, 0);
}
