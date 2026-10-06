import type { ComponentProps } from "react";
import { useNavigationActions } from "../navigationContext.ts";
import type {
  ReaderWord,
  ReaderWordGestures,
} from "../reader/useWordPointer.ts";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import type { LookupRequest } from "./lookupPopup.ts";
import {
  type PopupHold,
  type StartFlashcardFromLookup,
  useWordLookup,
} from "./useWordLookup.ts";

/** The reader has no playback for the pop-up to hold. */
const noHold: PopupHold = {
  hold: () => undefined,
  release: () => undefined,
  forget: () => undefined,
};

/**
 * Looks up words of an ebook or text in the dictionary pop-up, with the same gestures as the subtitles' words.
 * Returns the gestures for the text's words, the pop-up's props, or null while it is closed,
 * and the words of the text the pop-up stands beside and highlights.
 */
export function useReaderLookup(
  languages: { target: string; translation: string },
  startFlashcard: StartFlashcardFromLookup<ReaderWord>,
) {
  const { openDictionaries } = useNavigationActions();
  const lookup = useWordLookup<ReaderWord>({
    languages,
    hold: noHold,
    startFlashcard,
  });
  const popup = lookup.popup && {
    onPointerInsideChange: lookup.popup.anchored.onPointerInsideChange,
    props: {
      ...lookup.popup.props,
      onSetUpDictionary: () => lookup.leaveFor(openDictionaries),
    } satisfies ComponentProps<typeof DictionaryPopup>,
  };
  const occurrence = lookup.activeOccurrence;
  const wordGestures: ReaderWordGestures = {
    onWordClick: (word, input) => lookup.clickWord(requestFor(word), input),
    onWordHoverIntent: (word) => lookup.hoverWord(requestFor(word)),
    onWordDoubleClick: (word) => lookup.startFlashcardFor(requestFor(word)),
    onWordHold: (word) => lookup.startFlashcardFor(requestFor(word)),
  };
  return {
    popup,
    wordGestures,
    lookupWord: lookup.shownSource ?? undefined,
    highlightedWord: occurrence?.source
      ? { word: occurrence.source, matchedLength: occurrence.length }
      : undefined,
    openSearch: lookup.openSearch,
    close: lookup.close,
  };
}

function requestFor(word: ReaderWord): LookupRequest<ReaderWord> {
  const { chapterIndex, paragraphIndex, offset } = word.location;
  return {
    term: word.text,
    lookup: word.lookup,
    source: word,
    occurrence: { passage: `${chapterIndex}:${paragraphIndex}`, start: offset },
    anchor: null,
  };
}
