import type { Cue } from "@easyimmerse/types";
import { stripMarkup } from "../components/ClickableText.tsx";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import { usePlaybackPause } from "../hooks/usePlaybackPause.ts";
import { useNavigationActions } from "../navigationContext.ts";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
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
 * and resumes it when closed, unless the lookup ended in a flashcard. The L key opens the pop-up's search field.
 * Returns the handlers for the subtitles and the pop-up to draw, or null while it is closed.
 */
export function useSubtitleLookup(
  languages: { target: string; translation: string },
  startFlashcard: StartFlashcard,
) {
  const lookup = useDictionaryLookup(languages.target);
  const pause = usePlaybackPause();
  const { openDictionaries } = useNavigationActions();
  const openSearch = () => {
    pause.pause();
    lookup.openSearch();
  };
  const close = () => {
    lookup.close();
    pause.resume();
  };
  const endInFlashcard = (
    word: string,
    cue: Cue | null,
    lookupFields: LookupFlashcardFields | null,
  ) => {
    lookup.close();
    pause.forget();
    startFlashcard(lookupFields?.word ?? word, cue ?? undefined, lookupFields);
  };
  useKeyboardShortcut("l", openSearch);
  const popup = lookup.popup && (
    <DictionaryPopup
      state={lookup.state}
      mode={lookup.popup.mode}
      resolveMediaUrl={lookup.resolveMediaUrl}
      onSearch={lookup.search}
      onCreateFlashcard={(entryIndex) =>
        endInFlashcard(
          lookup.request?.term ?? "",
          lookup.request?.cue ?? null,
          flashcardFieldsFromLookup(
            lookup.results,
            entryIndex,
            languages,
            lookup.dictionaries,
          ),
        )
      }
      onClose={close}
      onSetUpDictionary={() => {
        close();
        openDictionaries();
      }}
    />
  );
  return {
    activeWord: lookup.request?.term,
    popup,
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
