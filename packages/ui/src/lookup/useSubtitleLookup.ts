import type { Cue } from "@easyimmerse/types";
import type { ComponentProps, RefObject } from "react";
import { stripMarkup } from "../components/ClickableText.tsx";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import { usePlaybackPause } from "../hooks/usePlaybackPause.ts";
import { useNavigationActions } from "../navigationContext.ts";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import {
  flashcardFieldsFromLookup,
  type LookupFlashcardFields,
} from "./flashcardFieldsFromLookup.ts";
import { lookupTextAt } from "./lookupTextAt.ts";
import { useDictionaryLookup } from "./useDictionaryLookup.ts";

/** Starts a flashcard for a word, from its cue or else the cue at the current time, with fields filled from a lookup. */
export type StartFlashcard = (
  word: string,
  cue: Cue | undefined,
  lookupFields: LookupFlashcardFields | null,
) => void;

/**
 * Looks up words of the subtitles in the dictionary pop-up, which pauses playback while it is open
 * and resumes it when closed, unless the lookup led on to a flashcard or to the dictionaries settings.
 * The L key opens the pop-up's search field while the screen that `screenRef` marks is in reach.
 * Returns the handlers for the subtitles, and the pop-up's props, or null while it is closed.
 */
export function useSubtitleLookup(
  languages: { target: string; translation: string },
  startFlashcard: StartFlashcard,
  screenRef: RefObject<Element | null>,
) {
  const lookup = useDictionaryLookup(languages.target);
  const pause = usePlaybackPause();
  const { openDictionaries } = useNavigationActions();
  const openSearch = () => {
    pause.pause();
    lookup.openSearch();
  };
  /** Closes the pop-up for something else that keeps playback paused. */
  const leaveFor = (next: () => void) => {
    lookup.close();
    pause.forget();
    next();
  };
  const endInFlashcard = (
    word: string,
    cue: Cue | null,
    lookupFields: LookupFlashcardFields | null,
  ) =>
    leaveFor(() =>
      startFlashcard(
        lookupFields?.word ?? word,
        cue ?? undefined,
        lookupFields,
      ),
    );
  useKeyboardShortcut("l", openSearch, screenRef);
  const popupProps: ComponentProps<typeof DictionaryPopup> | null =
    lookup.popup && {
      state: lookup.state,
      mode: lookup.popup.mode,
      resolveMediaUrl: lookup.resolveMediaUrl,
      onSearch: lookup.search,
      onCreateFlashcard: (entryIndex) =>
        endInFlashcard(
          lookup.request?.term ?? "",
          lookup.request?.cue ?? null,
          flashcardFieldsFromLookup(
            lookup.results,
            entryIndex,
            languages,
            lookup.dictionaries,
          ),
        ),
      onClose: () => {
        lookup.close();
        pause.resume();
      },
      onSetUpDictionary: () => leaveFor(openDictionaries),
    };
  return {
    activeWord: lookup.request?.term,
    popupProps,
    openSearch,
    lookUpWord: (word: string, cue: Cue, start: number) => {
      pause.pause();
      lookup.chooseWord({
        term: word,
        lookup: lookupTextAt(stripMarkup(cue.text), start),
        cue,
      });
    },
    /** Skips the pop-up and starts a flashcard for the word at once. */
    startFlashcardFromWord: (word: string, cue: Cue) =>
      endInFlashcard(word, cue, null),
  };
}
