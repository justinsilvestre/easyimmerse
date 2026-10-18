import type { RootState } from "../../app/createAppStore.ts";
import type { ReaderLocation } from "../../storedPlaces/readingLocation.ts";
import { selectLookupCursor } from "../lookup/lookupSelectors.ts";
import type { AnchorRect } from "../lookup/lookupState.ts";
import { selectSpokenSpan } from "./readerAudioSelectors.ts";

/** A sentence of the book the reader's keys act on: a place inside it, and where its word is drawn, when a pop-up stands there. */
export type ReaderSentence = {
  location: ReaderLocation;
  anchor: AnchorRect | null;
};

/**
 * Selects the sentence the reader's keys act on, or null when there is none: the sentence of the word under the lookup cursor,
 * which the mouse pointer or the keyboard places, as L looks up from it, else the sentence highlighted as spoken
 * by the audio the book is aligned with.
 */
export function selectReaderCurrentSentence(
  root: RootState,
): ReaderSentence | null {
  const chosen = selectLookupCursor(root.app)?.chosen;
  if (chosen?.source?.kind === "text")
    return {
      location: chosen.source.location,
      anchor:
        chosen.anchor && "rect" in chosen.anchor ? chosen.anchor.rect : null,
    };
  const spoken = selectSpokenSpan(root);
  return spoken === null
    ? null
    : {
        location: {
          chapterIndex: spoken.chapter_index,
          paragraphIndex: spoken.paragraph_index,
          offset: spoken.start,
        },
        anchor: null,
      };
}
