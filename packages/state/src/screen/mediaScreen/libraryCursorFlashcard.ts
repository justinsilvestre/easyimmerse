import type { LibraryText } from "@easyimmerse/types";
import { dispatch } from "../../app/dispatchEffect.ts";
import { flashcardActions } from "../../flashcards/flashcardActions.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { cachedLibraryText } from "../cachedLibrary.ts";
import { cuesOfLibraryText, libraryFlashcardPlaceOf } from "../libraryText.ts";
import type { OpenMediaScreen } from "./mediaScreenSelectors.ts";
import { shownCueOf } from "./selectShownCue.ts";

/**
 * Returns the library flashcard that the C or E key asks for on a library media file, which is saved at once whichever key it was:
 * one for the lookup cursor's word, or, when there is no cursor, one for the whole cue shown now.
 * Nothing is asked for while the cache lacks the item's text or no segment lies there.
 */
export function libraryCursorFlashcard(
  { screen, route }: OpenMediaScreen,
  itemId: string,
  backend: ServerCacheSlice,
) {
  const text = cachedLibraryText(backend, itemId);
  const place = text && placeAtCursor(text, screen);
  if (!place) return [];
  const { projectId, mediaFileId } = route;
  return [
    dispatch(
      flashcardActions.libraryFlashcardRequested({
        projectId,
        mediaFileId,
        ...place,
      }),
    ),
  ];
}

function placeAtCursor(text: LibraryText, screen: OpenMediaScreen["screen"]) {
  const chosen = screen.lookup.cursor?.chosen;
  if (chosen) return libraryFlashcardPlaceOf(text, chosen);
  const cue = shownCueOf(screen.playing.player, cuesOfLibraryText(text).cues);
  return cue && { segmentIndex: cue.index, wordStart: null };
}
