import type { RootState } from "../../app/createAppStore.ts";
import type { ReaderLocation } from "../../storedPlaces/readingLocation.ts";
import { selectLookup } from "../lookup/lookupSelectors.ts";
import type { AnchorRect } from "../lookup/lookupState.ts";
import { selectSpokenSpan } from "./readerAudioSelectors.ts";
import { selectReaderScreen } from "./readerScreenSelectors.ts";

/** A sentence of the book the reader's keys act on: a place inside it, and where its word is drawn, when a pop-up stands there. */
export type ReaderSentence = {
  location: ReaderLocation;
  anchor: AnchorRect | null;
};

/**
 * Selects the sentence the reader's keys act on, or null when there is none: the sentence whose translation is shown,
 * else the sentence of the word the dictionary pop-up shows, which is the word last looked up,
 * else the sentence highlighted as spoken by the audio the book is aligned with.
 * Each of these is on screen, so that the user can see which sentence a key will act on.
 */
export function selectReaderCurrentSentence(
  root: RootState,
): ReaderSentence | null {
  const popup = selectReaderScreen(root).translationPopup;
  if (popup !== null) return popup;
  const chosen = selectLookup(root.app)?.popup?.chosen;
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
