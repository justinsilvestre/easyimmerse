import type { RootState } from "../../app/createAppStore.ts";
import type { ReaderLocation } from "../../storedPlaces/readingLocation.ts";
import { selectLookupCursor } from "../lookup/lookupSelectors.ts";
import { selectSpokenSpan } from "./readerAudioSelectors.ts";

/**
 * Selects a place in the sentence the reader's keys act on, or null when there is none: the sentence of the word under the lookup cursor,
 * which the mouse pointer or the keyboard places, as L looks up from it, else the sentence highlighted as spoken
 * by the audio the book is aligned with.
 */
export function selectReaderCurrentSentence(
  root: RootState,
): ReaderLocation | null {
  const chosen = selectLookupCursor(root.app)?.chosen;
  if (chosen?.source?.kind === "text") return chosen.source.location;
  const spoken = selectSpokenSpan(root);
  return spoken === null
    ? null
    : {
        chapterIndex: spoken.chapter_index,
        paragraphIndex: spoken.paragraph_index,
        offset: spoken.start,
      };
}
