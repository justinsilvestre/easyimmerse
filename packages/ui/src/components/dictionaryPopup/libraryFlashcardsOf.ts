import {
  type AppDispatch,
  actions,
  type ChosenWord,
  type FlashcardDestination,
  type LookupSource,
} from "@easyimmerse/state";
import type { LookupResult } from "@easyimmerse/types";
import type { LookupPlace } from "../wordLookup/lookupPlace.ts";
import {
  type LibraryWords,
  libraryFlashcardPlace,
  wordlessChosenWord,
} from "./libraryWords.ts";

/**
 * Asks for library flashcards, which the server fills from the item's text and which are always saved at once:
 * from a word of the text, from the word the pop-up shows when the pop-up asks for one, and for no word from the passage given,
 * or else from `library.wordlessSource`. The returned functions take the same arguments as those of `useLookupFlashcards`.
 */
export function libraryFlashcardsOf(
  library: LibraryWords,
  shown: ChosenWord | null,
  dispatch: AppDispatch,
) {
  const request = (chosen: ChosenWord | null) => {
    const place = chosen && libraryFlashcardPlace(library, chosen);
    if (place) dispatch(actions.libraryFlashcardRequested(place));
  };
  const requestWordless = (source: LookupSource | null) =>
    request(source && wordlessChosenWord(source));
  return {
    startFlashcardFor: (
      word: ChosenWord,
      _destination?: FlashcardDestination,
    ) => request(word),
    holdWord: (_term: string) => request(shown),
    createFromPopup: (
      _results: readonly LookupResult[],
      _entryIndex: number | null,
    ) => {
      dispatch(actions.lookupSetAside());
      request(shown);
    },
    startFlashcardAtCursor: (
      cursorWord: ChosenWord | null,
      _destination: FlashcardDestination,
      wordlessPlace: LookupPlace | null,
    ) =>
      cursorWord
        ? request(cursorWord)
        : requestWordless(wordlessPlace?.source ?? library.wordlessSource),
    startWordlessFlashcard: (_destination: FlashcardDestination) =>
      requestWordless(library.wordlessSource),
  };
}
