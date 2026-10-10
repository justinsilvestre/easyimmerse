import type { ChosenWord } from "@easyimmerse/state";
import { type ComponentProps, useRef } from "react";
import { useNavigate } from "../hooks/useNavigate.ts";
import type {
  ReaderWord,
  ReaderWordGestures,
} from "../reader/useWordPointer.ts";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import type { StartFlashcardFromLookup } from "./lookupPlace.ts";
import { useWordLookup } from "./useWordLookup.ts";

/**
 * Looks up words of an ebook or text in the dictionary pop-up, with the same gestures as the subtitles' words.
 * A flashcard made from a word opens in the editor through `startFlashcard`.
 * Returns the gestures for the text's words, the pop-up's props, or null while it is closed,
 * the rectangle of the word the pop-up stands beside, the word it highlights,
 * and what the L key does: look up the word under the mouse as a click on it would, or else open the search field.
 */
export function useReaderLookup(
  languages: { target: string; translation: string },
  startFlashcard: StartFlashcardFromLookup,
) {
  const navigate = useNavigate();
  const lookup = useWordLookup(languages, {
    save: startFlashcard,
    editor: startFlashcard,
  });
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
  // To do in step 10a: the word under the mouse is kept in a ref for the L key, which the sweep is to judge.
  const pointed = useRef<ReaderWord | null>(null);
  const wordGestures: ReaderWordGestures = {
    onWordClick: (word, input) => lookup.clickWord(chosenFor(word), input),
    onWordPointed: (word) => {
      pointed.current = word;
    },
    onWordHover: (word) => lookup.hoverWord(chosenFor(word)),
    onWordHoverAnswered: (word) => lookup.restOnWord(chosenFor(word)),
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
    lookUpPointedWord: () => {
      if (pointed.current)
        lookup.clickWord(chosenFor(pointed.current), "keyboard");
      else lookup.openSearch();
    },
    close: lookup.close,
  };
}

function rectOf(anchor: ChosenWord["anchor"]) {
  return anchor !== null && "rect" in anchor ? anchor.rect : null;
}
