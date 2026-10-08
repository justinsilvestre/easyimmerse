import type { Cue } from "@easyimmerse/types";
import {
  type ComponentProps,
  type RefObject,
  useMemo,
  useReducer,
} from "react";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { WordHit } from "../components/useWordGestures.ts";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import { usePlaybackPause } from "../hooks/usePlaybackPause.ts";
import { useStableCallbacks } from "../hooks/useStableCallbacks.ts";
import { reduceCueCursor } from "../media/cueCursor.ts";
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
 * Keeps the one lookup cursor of the subtitles, which the mouse and the keyboard move alike, wherever the subtitles are shown.
 * While the screen that `screenRef` marks is in reach, the L key looks up from the cursor as a click there would,
 * or opens the pop-up's search field when there is no cursor,
 * and the C key starts a flashcard through `startFlashcard` from the cursor as a double-click there would, or for no word when there is no cursor.
 * Returns the gestures for the subtitles' words, which keep their identity across renders,
 * the word the pop-up shows, which keeps its identity while it shows the same word and is highlighted only while there is no cursor,
 * the cursor's place, which keeps its identity while the cursor stays,
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
  const [cursor, dispatchCursor] = useReducer(reduceCueCursor, null);
  const lookUpCursor = () => {
    if (cursor?.hit.element.isConnected)
      lookup.clickWord(requestFor(cursor.hit, cursor.cue), "keyboard");
    else lookup.openSearch();
  };
  useKeyboardShortcut("l", lookUpCursor, screenRef);
  const startFlashcardAtCursor = (start: StartFlashcardFromLookup<Cue>) => {
    if (cursor?.hit.element.isConnected)
      lookup.startFlashcardFor(requestFor(cursor.hit, cursor.cue), start);
    else start("", null, null);
  };
  useKeyboardShortcut(
    "c",
    () => startFlashcardAtCursor(startFlashcard),
    screenRef,
  );
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
    onWordPointed: (hit, input, cue) =>
      dispatchCursor(
        hit
          ? {
              type: "pointed",
              cue,
              hit,
              matchedLength: lookup.cachedMatchLength(requestFor(hit, cue)),
            }
          : { type: "left", input },
      ),
    onWordHover: (hit, cue) => lookup.hoverWord(requestFor(hit, cue)),
    onWordHoverAnswered: (hit, matchedLength, cue) => {
      dispatchCursor({ type: "answered", cue, hit, matchedLength });
      lookup.restOnWord(requestFor(hit, cue));
    },
    onWordDoubleClick: (hit, cue) =>
      lookup.startFlashcardFor(requestFor(hit, cue)),
    onWordHold: (hit, cue) => lookup.startFlashcardFor(requestFor(hit, cue)),
  });
  return {
    activeWord: useActiveCueWord(lookup.activeOccurrence, cursor === null),
    cursor: cursor?.position ?? null,
    popup,
    openSearch: lookup.openSearch,
    /**
     * Starts a flashcard through `start` for the word at the cursor once its lookup answers, as a double-click there would,
     * or, when there is no cursor, for no word.
     */
    startFlashcardAtCursor,
    wordGestures,
  };
}

/**
 * The word of a cue the pop-up shows, as one object for as long as it shows the same word with the same match
 * and its highlight stays on or off.
 */
function useActiveCueWord(
  occurrence: ReturnType<typeof useWordLookup<Cue>>["activeOccurrence"],
  isHighlighted: boolean,
): ActiveCueWord | undefined {
  const cueIndex = occurrence?.source?.index;
  const start = occurrence?.start;
  const length = occurrence?.length;
  const popupId = occurrence?.popupId;
  return useMemo(
    () =>
      cueIndex === undefined || start === undefined || popupId === undefined
        ? undefined
        : { cueIndex, start, length, popupId, isHighlighted },
    [cueIndex, start, length, popupId, isHighlighted],
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
