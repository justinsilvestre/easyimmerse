import {
  actions,
  type ChosenWord,
  type FlashcardDestination,
  type LookupFieldsContext,
} from "@easyimmerse/state";
import type { LookupResult, NewFlashcard } from "@easyimmerse/types";
import { createFlashcardId } from "../flashcards/createFlashcardId.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { type LookupPlace, placeOf } from "./lookupPlace.ts";
import { popupFlashcardOf } from "./popupFlashcardOf.ts";
import type { WordFlashcards } from "./wordFlashcards.ts";

/**
 * Asks for flashcards from words, each with an id and a draft made here, as `flashcards` says the screen makes them:
 * from a word of the text or held in the pop-up, filled from its lookup once it answers;
 * from the pop-up's flashcard buttons, filled from what the pop-up shows; from the cursor's word or, without a cursor, for no word; and for no word.
 * `shown` is the word the pop-up shows, and `context` sorts definitions into the fields.
 */
export function useLookupFlashcards(
  flashcards: WordFlashcards,
  shown: ChosenWord | null,
  context: LookupFieldsContext,
) {
  const dispatch = useAppDispatch();
  const destinationOf = (asked: FlashcardDestination) =>
    flashcards.savesAtOnce ? asked : "editor";
  const newFlashcard = (
    word: string,
    place: LookupPlace | null,
  ): NewFlashcard | null => {
    const draft = flashcards.draftFor(word, place);
    return draft && { id: createFlashcardId(), draft };
  };
  return {
    /** Starts a flashcard for a word once its lookup answers, saved at once or opened in the form as the screen and `destination` say. */
    startFlashcardFor: (
      word: ChosenWord,
      destination: FlashcardDestination = "save",
    ) => {
      const flashcard = newFlashcard(word.word.term, placeOf(word));
      if (flashcard)
        dispatch(
          actions.lookupFlashcardRequested(
            word,
            destinationOf(destination),
            flashcard,
            context,
          ),
        );
    },
    /** Starts a flashcard for a word held inside the pop-up, with the passage of the word the pop-up shows. */
    holdWord: (term: string) => {
      const place = shown?.source
        ? { source: shown.source, start: null }
        : null;
      const flashcard = newFlashcard(term, place);
      if (flashcard)
        dispatch(
          actions.lookupPopupWordHeld(
            term,
            destinationOf("save"),
            flashcard,
            context,
          ),
        );
    },
    /** Makes a flashcard from what the pop-up shows: every result, or the one at `entryIndex`. */
    createFromPopup: (
      results: readonly LookupResult[],
      entryIndex: number | null,
    ) => {
      const made = popupFlashcardOf(results, entryIndex, shown, context);
      const flashcard = newFlashcard(made.word, made.place);
      dispatch(actions.lookupSetAside());
      if (!flashcard) return;
      const { draft } = flashcard;
      const content = { ...draft.content, ...made.fields };
      dispatch(
        actions.flashcardStarted(
          { ...flashcard, draft: { ...draft, content } },
          destinationOf("save"),
        ),
      );
    },
    /**
     * Starts a flashcard for the lookup cursor's word `cursorWord` once its lookup answers, or for no word when there is no cursor
     * or no flashcard can be made for its word, saved at once or opened in the form as `destination` says.
     */
    startFlashcardAtCursor: (
      cursorWord: ChosenWord | null,
      destination: FlashcardDestination,
    ) => {
      const flashcard =
        cursorWord && newFlashcard(cursorWord.word.term, placeOf(cursorWord));
      dispatch(
        actions.lookupCursorFlashcardRequested(
          destinationOf(destination),
          flashcard,
          newFlashcard("", null),
          context,
        ),
      );
    },
    /** Makes a flashcard for no word, saved at once or opened in the form as `destination` says. */
    startWordlessFlashcard: (destination: FlashcardDestination) => {
      const flashcard = newFlashcard("", null);
      if (flashcard)
        dispatch(
          actions.flashcardStarted(flashcard, destinationOf(destination)),
        );
    },
  };
}
