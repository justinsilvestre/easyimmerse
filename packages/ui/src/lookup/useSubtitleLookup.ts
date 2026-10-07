import type { Cue } from "@easyimmerse/types";
import { type ComponentProps, type RefObject, useMemo, useRef } from "react";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { WordHit } from "../components/useWordGestures.ts";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import { usePlaybackPause } from "../hooks/usePlaybackPause.ts";
import { useStableCallbacks } from "../hooks/useStableCallbacks.ts";
import type {
  ActiveCueWord,
  CueWordGestures,
} from "../media/cueWordGestures.ts";
import { useNavigationActions } from "../navigationContext.ts";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import type { LookupRequest } from "./lookupPopup.ts";
import { lookupTextAt } from "./lookupTextAt.ts";
import {
  type StartFlashcardFromLookup,
  useWordLookup,
} from "./useWordLookup.ts";

/**
 * Looks up words of the subtitles in the dictionary pop-up, which pauses playback while it is open
 * and resumes it when closed, unless the lookup led on to a flashcard or to the dictionaries settings.
 * While the screen that `screenRef` marks is in reach, the L key looks up the word under the mouse as a click on it would,
 * or opens the pop-up's search field when the mouse is on no word.
 * Returns the gestures for the subtitles' words, which keep their identity across renders,
 * the word the pop-up shows, which keeps its identity while it shows the same word,
 * and the pop-up's props, or null while it is closed.
 */
export function useSubtitleLookup(
  languages: { target: string; translation: string },
  startFlashcard: StartFlashcardFromLookup<Cue>,
  screenRef: RefObject<Element | null>,
) {
  const pause = usePlaybackPause();
  const { openDictionaries } = useNavigationActions();
  const lookup = useWordLookup<Cue>({
    languages,
    hold: { hold: pause.pause, release: pause.resume, forget: pause.forget },
    startFlashcard,
  });
  const pointed = useRef<{ hit: WordHit; cue: Cue } | null>(null);
  const lookUpPointedWord = () => {
    const current = pointed.current;
    if (current?.hit.element.isConnected)
      lookup.clickWord(requestFor(current.hit, current.cue), "keyboard");
    else lookup.openSearch();
  };
  useKeyboardShortcut("l", lookUpPointedWord, screenRef);
  const popup = lookup.popup && {
    anchored: lookup.popup.anchored,
    props: {
      ...lookup.popup.props,
      onSetUpDictionary: () => lookup.leaveFor(openDictionaries),
    } satisfies ComponentProps<typeof DictionaryPopup>,
  };
  const wordGestures = useStableCallbacks<Required<CueWordGestures>>({
    onWordClick: (hit, cue) =>
      lookup.clickWord(requestFor(hit, cue), hit.input),
    onWordPointed: (hit, cue) => {
      pointed.current = hit && { hit, cue };
    },
    onWordHover: (hit, cue) => lookup.hoverWord(requestFor(hit, cue)),
    onWordHoverAnswered: (hit, _matchedLength, cue) =>
      lookup.restOnWord(requestFor(hit, cue)),
    onWordDoubleClick: (hit, cue) =>
      lookup.startFlashcardFor(requestFor(hit, cue)),
    onWordHold: (hit, cue) => lookup.startFlashcardFor(requestFor(hit, cue)),
  });
  return {
    activeWord: useActiveCueWord(lookup.activeOccurrence),
    popup,
    openSearch: lookup.openSearch,
    wordGestures,
  };
}

/** The word of a cue the pop-up shows, as one object for as long as it shows the same word with the same match. */
function useActiveCueWord(
  occurrence: ReturnType<typeof useWordLookup<Cue>>["activeOccurrence"],
): ActiveCueWord | undefined {
  const cueIndex = occurrence?.source?.index;
  const start = occurrence?.start;
  const length = occurrence?.length;
  const popupId = occurrence?.popupId;
  return useMemo(
    () =>
      cueIndex === undefined || start === undefined || popupId === undefined
        ? undefined
        : { cueIndex, start, length, popupId },
    [cueIndex, start, length, popupId],
  );
}

function requestFor(hit: WordHit, cue: Cue): LookupRequest<Cue> {
  return {
    term: hit.word,
    lookup: lookupTextAt(stripMarkup(cue.text), hit.start),
    source: cue,
    occurrence: { passage: String(cue.index), start: hit.start },
    anchor: hit.element,
  };
}
