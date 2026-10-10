import { actions, type ChosenWord, selectLookup } from "@easyimmerse/state";
import { useId } from "react";
import type { WordHit } from "../components/useWordGestures.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { hoverMatchLength } from "./hoverMatchLength.ts";
import { lookupPopupProps, matchedLengthOf } from "./lookupPopupProps.ts";
import { lookupWordOf } from "./lookupWordOf.ts";
import { popupFlashcardOf } from "./popupFlashcardOf.ts";
import { useLookupDisplay } from "./useLookupDisplay.ts";
import {
  type LookupFlashcardStarts,
  useLookupFlashcardHandoff,
} from "./useLookupFlashcardHandoff.ts";

/**
 * Drives the dictionary pop-up for words in a text, such as subtitles or an ebook, through the screen's lookup in the store:
 * a click opens it at the word, or closes it when it shows that word already;
 * a hover looks the word up ahead of a click, and once that lookup answers an open pop-up moves to the word;
 * and a double-click or held tap turns the word into a flashcard filled from its lookup, started through `starts`.
 * Words inside the pop-up are looked up in it with a double-click, or turned into flashcards with a held tap.
 */
export function useWordLookup(
  languages: { target: string; translation: string },
  starts: LookupFlashcardStarts,
) {
  const dispatch = useAppDispatch();
  const lookup = useAppSelector(selectLookup);
  const display = useLookupDisplay(lookup?.popup ?? null, languages.target);
  useLookupFlashcardHandoff(starts, languages, display.dictionaries);
  const popupId = useId();
  const chosen = lookup?.popup?.chosen ?? null;
  const wordOf = (term: string, text: Parameters<typeof lookupWordOf>[1]) =>
    lookupWordOf(term, text, languages.target, display.isCovered);
  /** A word inside the pop-up, at the place of the word the pop-up shows. */
  const inPopup = (term: string): ChosenWord => ({
    word: wordOf(term, { text: term }),
    source: chosen?.source ?? null,
    occurrence: null,
    anchor: chosen?.anchor ?? null,
  });
  return {
    popup: lookupPopupProps(lookup, popupId, display, {
      onSearch: (term) =>
        dispatch(actions.lookupTermSearched(inPopup(term.trim()).word)),
      wordActions: {
        onFlashcard: (term) =>
          dispatch(actions.lookupFlashcardRequested(inPopup(term), "save")),
      },
      onCreateFlashcard: (entryIndex) => {
        const { results, dictionaries } = display;
        const flashcard = popupFlashcardOf(
          results,
          entryIndex,
          chosen,
          languages,
          dictionaries,
        );
        dispatch(actions.lookupSetAside());
        starts.save(flashcard.word, flashcard.place, flashcard.fields);
      },
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
    restOnWord: (word: ChosenWord) =>
      dispatch(actions.lookupWordRestedOn(word)),
    startFlashcardFor: (
      word: ChosenWord,
      destination: "save" | "editor" = "save",
    ) => dispatch(actions.lookupFlashcardRequested(word, destination)),
    hoverWord: (word: ChosenWord) =>
      hoverMatchLength(dispatch, word.word.query),
    openSearch: () => dispatch(actions.lookupSearchOpened()),
    close: () => dispatch(actions.lookupClosed()),
    /** Closes the pop-up for something else that keeps playback paused, such as the dictionaries settings. */
    setAsideFor: (next: () => void) => {
      dispatch(actions.lookupSetAside());
      next();
    },
  };
}
