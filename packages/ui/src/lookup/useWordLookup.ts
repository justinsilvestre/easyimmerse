import { actions, type ChosenWord, selectLookup } from "@easyimmerse/state";
import { useId } from "react";
import type { WordHit } from "../components/useWordGestures.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { lookupPopupProps, matchedLengthOf } from "./lookupPopupProps.ts";
import { lookupWordOf } from "./lookupWordOf.ts";
import { useLookupDisplay } from "./useLookupDisplay.ts";
import { useLookupFlashcards } from "./useLookupFlashcards.ts";
import type { WordFlashcards } from "./wordFlashcards.ts";

/**
 * Drives the dictionary pop-up for words in a text, such as subtitles or an ebook, through the screen's lookup in the store:
 * a click opens it at the word, or closes it when it shows that word already;
 * and a double-click or held tap turns the word into a flashcard filled from its lookup, made as `flashcards` says.
 * Words inside the pop-up are looked up in it with a double-click, or turned into flashcards with a held tap.
 */
export function useWordLookup(
  languages: { target: string; translation: string },
  flashcards: WordFlashcards,
) {
  const dispatch = useAppDispatch();
  const lookup = useAppSelector(selectLookup);
  const display = useLookupDisplay(lookup?.popup ?? null, languages.target);
  const popupId = useId();
  const chosen = lookup?.popup?.chosen ?? null;
  const made = useLookupFlashcards(flashcards, chosen, {
    languages,
    dictionaries: display.dictionaries,
  });
  const wordOf = (term: string, text: Parameters<typeof lookupWordOf>[1]) =>
    lookupWordOf(term, text, languages.target, display.isCovered);
  return {
    popup: lookupPopupProps(lookup, popupId, display, {
      onSearch: (term) => {
        const trimmed = term.trim();
        dispatch(
          actions.lookupTermSearched(wordOf(trimmed, { text: trimmed })),
        );
      },
      onWordHold: made.holdWord,
      onCreateFlashcard: (entryIndex) =>
        made.createFromPopup(display.results, entryIndex),
      onClose: () => dispatch(actions.lookupClosed()),
      onToggleSize: () => dispatch(actions.lookupSizeToggled()),
      onPointerInsideChange: (isInside) =>
        dispatch(actions.lookupPointerInsideChanged(isInside)),
    }),
    /**
     * The occurrence the pop-up shows, if it shows a word from the text, with the pop-up's id,
     * and the length of the text its best result matched once the lookup has answered, or null when nothing matched.
     */
    activeOccurrence: chosen?.occurrence && {
      ...chosen.occurrence,
      source: chosen.source,
      popupId,
      length: matchedLengthOf(display.state, display.results),
    },
    /** The word the pop-up shows, or the empty string while it shows none. */
    shownTerm: chosen?.word.term ?? "",
    wordOf,
    clickWord: (word: ChosenWord, input: WordHit["input"]) =>
      dispatch(actions.lookupWordClicked(word, input)),
    startFlashcardFor: made.startFlashcardFor,
    startWordlessFlashcard: made.startWordlessFlashcard,
    openSearch: () => dispatch(actions.lookupSearchOpened()),
    close: () => dispatch(actions.lookupClosed()),
    /** Closes the pop-up for something else that keeps playback paused, such as the dictionaries settings. */
    setAsideFor: (next: () => void) => {
      dispatch(actions.lookupSetAside());
      next();
    },
  };
}
