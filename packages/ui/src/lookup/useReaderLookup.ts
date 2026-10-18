import { actions, type ChosenWord } from "@easyimmerse/state";
import type { ComponentProps } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import type {
  ReaderWord,
  ReaderWordGestures,
} from "../reader/useWordPointer.ts";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import { useWordLookup } from "./useWordLookup.ts";
import type { WordFlashcards } from "./wordFlashcards.ts";

/**
 * Looks up words of an ebook or text in the dictionary pop-up, with the same gestures as the subtitles' words.
 * A flashcard made from a word opens in the form, with the draft `draftFor` makes.
 * Returns the gestures for the text's words, the pop-up's props, or null while it is closed,
 * the rectangle of the word the pop-up stands beside, and the word it highlights.
 */
export function useReaderLookup(
  languages: { target: string; translation: string },
  draftFor: WordFlashcards["draftFor"],
) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const lookup = useWordLookup(languages, { draftFor, savesAtOnce: false });
  const chosenFor = (word: ReaderWord): ChosenWord => {
    const { chapterIndex, paragraphIndex, offset } = word.location;
    const { top, bottom, left, right } = word.rect;
    return {
      word: lookup.wordOf(word.text, word.lookup),
      source: {
        kind: "text",
        sentence: word.sentence,
        location: word.location,
        isUnspaced: word.isUnspaced,
      },
      occurrence: {
        passage: `${chapterIndex}:${paragraphIndex}`,
        start: offset,
      },
      anchor: { rect: { top, bottom, left, right } },
    };
  };
  const popup = lookup.popup && {
    size: lookup.popup.anchored.size,
    onPointerInsideChange: lookup.popup.anchored.onPointerInsideChange,
    rect: rectOf(lookup.popup.anchored.anchor),
    props: {
      ...lookup.popup.props,
      onSetUpDictionary: () =>
        lookup.setAsideFor(() => navigate({ type: "openDictionaries" })),
    } satisfies ComponentProps<typeof DictionaryPopup>,
  };
  const occurrence = lookup.activeOccurrence;
  const wordGestures: ReaderWordGestures = {
    onWordClick: (word, input) => lookup.clickWord(chosenFor(word), input),
    onWordPointed: (word) =>
      dispatch(
        word
          ? actions.lookupCursorMoved(chosenFor(word), "mouse")
          : actions.lookupCursorLeft("mouse"),
      ),
    onWordHover: (word) => dispatch(actions.lookupWordHovered(chosenFor(word))),
    onWordDoubleClick: (word) => lookup.startFlashcardFor(chosenFor(word)),
    onWordHold: (word) => lookup.startFlashcardFor(chosenFor(word)),
  };
  return {
    popup,
    wordGestures,
    highlightedWord:
      occurrence?.source?.kind === "text"
        ? {
            word: {
              text: lookup.shownTerm,
              location: occurrence.source.location,
              isUnspaced: occurrence.source.isUnspaced,
            },
            matchedLength: occurrence.length,
          }
        : undefined,
    openSearch: lookup.openSearch,
    close: lookup.close,
  };
}

function rectOf(anchor: ChosenWord["anchor"]) {
  return anchor !== null && "rect" in anchor ? anchor.rect : null;
}
