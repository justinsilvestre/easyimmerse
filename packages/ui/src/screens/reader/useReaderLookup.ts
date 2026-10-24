import { actions, type ChosenWord } from "@easyimmerse/state";
import type { TextSpan } from "@easyimmerse/types";
import type { ComponentProps } from "react";
import type { DictionaryPopup } from "../../components/dictionaryPopup/DictionaryPopup.tsx";
import type { SentenceRowSource } from "../../components/dictionaryPopup/sentenceRowSource.ts";
import type { LibraryWords } from "../../components/wordLookup/libraryWords.ts";
import type { LookupPlace } from "../../components/wordLookup/lookupPlace.ts";
import { matchedLengthAhead } from "../../components/wordLookup/matchedLengthAhead.ts";
import { useWordLookup } from "../../components/wordLookup/useWordLookup.ts";
import type { WordFlashcards } from "../../components/wordLookup/wordFlashcards.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { highlightOfCursor, selectReaderCursor } from "./readerCursor.ts";
import type { ReaderWord, ReaderWordGestures } from "./useWordPointer.ts";

/** What the reader tells the pop-up's sentence row, and the text a sentence's translation covers, for highlighting it. */
export type ReaderSentenceRowSource = SentenceRowSource & {
  /** The book's text that the translation of the passage covers, or of the sentence being spoken for null; empty where none is linked. */
  translatedSpansOf: (
    source: Parameters<SentenceRowSource["factsOf"]>[0],
  ) => readonly TextSpan[];
  /** The sentence being spoken, as the place a flashcard for no word is made from, or null while none is. */
  spokenPlace: LookupPlace | null;
};

/**
 * Looks up words of an ebook or text in the dictionary pop-up, with the same gestures as the subtitles' words.
 * The mouse and the keyboard move the screen's one lookup cursor through the text.
 * A flashcard made from a word is saved at once, with the draft `draftFor` makes, as on the media screen.
 * Returns the gestures for the text's words, the pop-up's props, or null while it is closed,
 * the rectangle of the word the pop-up stands beside, the word it highlights, which is the cursor's while the keyboard
 * placed it and otherwise the pop-up's, and the text whose translation its sentence row shows.
 * Given a library item's words, the pop-up shows their stored entries, as `useWordLookup` describes.
 */
export function useReaderLookup(
  languages: { target: string; translation: string },
  draftFor: WordFlashcards["draftFor"],
  sentence: ReaderSentenceRowSource,
  library?: LibraryWords,
) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cursor = useAppSelector(selectReaderCursor);
  const lookup = useWordLookup(
    languages,
    { draftFor, savesAtOnce: true },
    sentence,
    library,
  );
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
    onWordPointed: (word, input) =>
      dispatch(
        word
          ? actions.lookupCursorMoved(chosenFor(word), input)
          : actions.lookupCursorLeft(input),
      ),
    onWordHover: (word) => dispatch(actions.lookupWordHovered(chosenFor(word))),
    lookUpMatchedLength: (word) =>
      matchedLengthAhead(dispatch, lookup.wordOf(word.text, word.lookup).query),
    onWordDoubleClick: (word) => lookup.startFlashcardFor(chosenFor(word)),
    onWordHold: (word) => lookup.holdWord(chosenFor(word)),
  };
  return {
    popup,
    wordGestures,
    highlightedWord:
      cursor?.input === "keyboard"
        ? highlightOfCursor(cursor)
        : occurrence?.source?.kind === "text"
          ? {
              word: {
                text: lookup.shownTerm,
                location: occurrence.source.location,
                isUnspaced: occurrence.source.isUnspaced,
              },
              matchedLength: occurrence.length,
            }
          : undefined,
    /** The text whose translation the pop-up's sentence row shows, highlighted as the sentence the translation covers. */
    highlightedSentence:
      lookup.translatedSource === undefined
        ? noSpans
        : sentence.translatedSpansOf(lookup.translatedSource),
    openSearch: lookup.openSearch,
    close: lookup.close,
    toggleSentenceTranslation: lookup.toggleSentenceTranslation,
    /** The C and E keys: a flashcard from the cursor's word, or for no word from the sentence being spoken. */
    startFlashcardAtCursor: (destination: "save" | "editor") =>
      lookup.startFlashcardAtCursor(destination, sentence.spokenPlace),
  };
}

const noSpans: readonly TextSpan[] = [];

function rectOf(anchor: ChosenWord["anchor"]) {
  return anchor !== null && "rect" in anchor ? anchor.rect : null;
}
