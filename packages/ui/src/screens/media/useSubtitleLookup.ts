import { actions } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { type ComponentProps, useMemo } from "react";
import {
  type ActiveCueWord,
  activeCueWordOf,
  type CueWordGestures,
} from "../../components/cuePanel/cueWordGestures.ts";
import type { DictionaryPopup } from "../../components/dictionaryPopup/DictionaryPopup.tsx";
import type { SentenceRowSource } from "../../components/dictionaryPopup/sentenceRowSource.ts";
import { matchedLengthAhead } from "../../components/wordLookup/matchedLengthAhead.ts";
import type { WordHit } from "../../components/wordLookup/useWordGestures.ts";
import { useWordLookup } from "../../components/wordLookup/useWordLookup.ts";
import type { WordFlashcards } from "../../components/wordLookup/wordFlashcards.ts";
import { useStableCallbacks } from "../../lib/useStableCallbacks.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { chosenWordAt } from "./chosenWordAt.ts";
import { selectCuePosition } from "./selectCuePosition.ts";

/**
 * Looks up words of the subtitles in the dictionary pop-up, which pauses playback while it is open
 * and resumes it when closed, unless the lookup led on to a flashcard or to the dictionaries settings.
 * Moves the screen's one lookup cursor, which the mouse and the keyboard move alike, wherever the subtitles are shown.
 * A held tap or held mouse button on a word opens the pop-up with the cue's translation in its sentence row, which `sentence` fills.
 * Returns the gestures for the subtitles' words, which keep their identity across renders,
 * the word the pop-up shows, which keeps its identity while it shows the same word and is highlighted only while there is no cursor,
 * the cursor's place, highlighted at once when its word's lookup is cached,
 * and the pop-up's props, or null while it is closed.
 */
export function useSubtitleLookup(
  languages: { target: string; translation: string },
  flashcards: WordFlashcards,
  sentence: SentenceRowSource,
) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const lookup = useWordLookup(languages, flashcards, sentence);
  const cursor = useAppSelector(selectCuePosition);
  const chosenAt = (hit: WordHit, cue: Cue) =>
    chosenWordAt(hit, cue, lookup.wordOf);
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
    onWordHold: (hit, cue) => lookup.holdWord(chosenAt(hit, cue)),
    onWordMouseHold: (hit, cue) => lookup.holdWord(chosenAt(hit, cue)),
  });
  return {
    activeWord: useActiveCueWord(lookup.activeOccurrence, cursor !== null),
    cursor,
    popup,
    openSearch: lookup.openSearch,
    /** The T key: shows or hides the current cue's translation in the pop-up's sentence row. */
    toggleSentenceTranslation: lookup.toggleSentenceTranslation,
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
