import {
  actions,
  type FlashcardDestination,
  selectLookupCursor,
} from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { type ComponentProps, useMemo } from "react";
import type { WordHit } from "../components/useWordGestures.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { useStableCallbacks } from "../hooks/useStableCallbacks.ts";
import {
  type ActiveCueWord,
  activeCueWordOf,
  type CueWordGestures,
} from "../media/cueWordGestures.ts";
import { useCuePosition } from "../media/useCuePosition.ts";
import { chosenWordAt } from "./chosenWordAt.ts";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import { matchedLengthAhead } from "./matchedLengthAhead.ts";
import { useWordLookup } from "./useWordLookup.ts";
import type { WordFlashcards } from "./wordFlashcards.ts";

/**
 * Looks up words of the subtitles in the dictionary pop-up, which pauses playback while it is open
 * and resumes it when closed, unless the lookup led on to a flashcard or to the dictionaries settings.
 * Moves the screen's one lookup cursor, which the mouse and the keyboard move alike, wherever the subtitles are shown.
 * Returns the gestures for the subtitles' words, which keep their identity across renders,
 * the word the pop-up shows, which keeps its identity while it shows the same word and is highlighted only while there is no cursor,
 * the cursor's place, highlighted at once when its word's lookup is cached,
 * and the pop-up's props, or null while it is closed.
 */
export function useSubtitleLookup(
  languages: { target: string; translation: string },
  flashcards: WordFlashcards,
) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const lookup = useWordLookup(languages, flashcards);
  const cursor = useCuePosition();
  const cursorWord = useAppSelector((state) =>
    selectLookupCursor(state.app),
  )?.chosen;
  const chosenAt = (hit: WordHit, cue: Cue) =>
    chosenWordAt(hit, cue, lookup.wordOf);
  const startFlashcardAtCursor = (destination: FlashcardDestination) =>
    lookup.startFlashcardAtCursor(cursorWord ?? null, destination);
  const popup = lookup.popup && {
    anchored: lookup.popup.anchored,
    props: {
      ...lookup.popup.props,
      onSetUpDictionary: () =>
        lookup.setAsideFor(() => navigate({ type: "openDictionaries" })),
    } satisfies ComponentProps<typeof DictionaryPopup>,
  };
  const wordGestures = useStableCallbacks<Required<CueWordGestures>>({
    onWordClick: (hit, cue) => lookup.clickWord(chosenAt(hit, cue), hit.input),
    onWordPointed: (hit, input, cue) =>
      dispatch(
        hit
          ? actions.lookupCursorMoved(
              chosenAt(hit, cue),
              input,
              cursor?.matchedLength,
            )
          : actions.lookupCursorLeft(input),
      ),
    onWordHover: (hit, cue) =>
      dispatch(actions.lookupWordHovered(chosenAt(hit, cue))),
    lookUpMatchedLength: (hit, cue) =>
      matchedLengthAhead(dispatch, chosenAt(hit, cue).word.query),
    onWordDoubleClick: (hit, cue) =>
      lookup.startFlashcardFor(chosenAt(hit, cue)),
    onWordHold: (hit, cue) => lookup.startFlashcardFor(chosenAt(hit, cue)),
  });
  return {
    activeWord: useActiveCueWord(lookup.activeOccurrence, cursor !== null),
    cursor,
    popup,
    openSearch: lookup.openSearch,
    /**
     * Starts a flashcard for the word at the cursor once its lookup answers, as a double-click there would,
     * or, when there is no cursor, for no word; saved at once, or opened in the editor, as `destination` says.
     */
    startFlashcardAtCursor,
    /** Saves a flashcard for no word, from the cue shown now, as the New flashcard button does. */
    startWordlessFlashcard: lookup.startWordlessFlashcard,
    wordGestures,
  };
}

/** The word of a cue the pop-up shows, as `activeCueWordOf` gives it, as one object while it stays the same. */
function useActiveCueWord(
  occurrence: ReturnType<typeof useWordLookup>["activeOccurrence"],
  hasCursor: boolean,
): ActiveCueWord | undefined {
  const { cueIndex, start, length, popupId, isHighlighted } =
    activeCueWordOf(occurrence, hasCursor) ?? {};
  return useMemo(
    () =>
      cueIndex === undefined || start === undefined || popupId === undefined
        ? undefined
        : { cueIndex, start, length, popupId, isHighlighted },
    [cueIndex, start, length, popupId, isHighlighted],
  );
}
