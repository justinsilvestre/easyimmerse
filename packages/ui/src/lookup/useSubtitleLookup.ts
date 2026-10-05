import type { Cue } from "@easyimmerse/types";
import type { ComponentProps, RefObject } from "react";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { WordHit } from "../components/useWordGestures.ts";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import { usePlaybackPause } from "../hooks/usePlaybackPause.ts";
import type { CueWordGestures } from "../media/cueWordGestures.ts";
import { useNavigationActions } from "../navigationContext.ts";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import type { LookupRequest } from "./lookupPopup.ts";
import { lookupTextAt } from "./lookupTextAt.ts";
import { anchorOf } from "./placeAtAnchor.ts";
import {
  type StartFlashcardFromLookup,
  useWordLookup,
} from "./useWordLookup.ts";

/**
 * Looks up words of the subtitles in the dictionary pop-up, which pauses playback while it is open
 * and resumes it when closed, unless the lookup led on to a flashcard or to the dictionaries settings.
 * The L key opens the pop-up's search field while the screen that `screenRef` marks is in reach.
 * Returns the gestures for the subtitles' words, and the pop-up's props, or null while it is closed.
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
  useKeyboardShortcut("l", lookup.openSearch, screenRef);
  const popup = lookup.popup && {
    anchored: lookup.popup.anchored,
    props: {
      ...lookup.popup.props,
      onSetUpDictionary: () => lookup.leaveFor(openDictionaries),
    } satisfies ComponentProps<typeof DictionaryPopup>,
  };
  const wordGestures: CueWordGestures = {
    onWordClick: (hit, cue) =>
      lookup.clickWord(requestFor(hit, cue), hit.input === "keyboard"),
    onWordHoverIntent: (hit, cue) => lookup.hoverWord(requestFor(hit, cue)),
    onWordDoubleClick: (hit, cue) =>
      lookup.startFlashcardFor(requestFor(hit, cue)),
    onWordHold: (hit, cue) => lookup.startFlashcardFor(requestFor(hit, cue)),
  };
  return {
    activeWord: lookup.activeWord,
    popup,
    openSearch: lookup.openSearch,
    wordGestures,
  };
}

function requestFor(hit: WordHit, cue: Cue): LookupRequest<Cue> {
  return {
    term: hit.word,
    lookup: lookupTextAt(stripMarkup(cue.text), hit.start),
    source: cue,
    occurrence: `${cue.index}:${hit.start}`,
    anchor: anchorOf(hit.element),
  };
}
