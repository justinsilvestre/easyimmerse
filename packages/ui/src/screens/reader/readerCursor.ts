import {
  type LookupCursor,
  type ReaderLocation,
  type RootState,
  selectLookupCursor,
} from "@easyimmerse/state";
import { shallowEqual } from "react-redux";
import { createSelector } from "reselect";
import { selectCursorMatchedLength } from "../../components/wordLookup/selectCursorMatchedLength.ts";
import type { HighlightedWord } from "./useLookedUpHighlight.ts";

/** Where the lookup cursor lies in a book's text, with the word there as the cursor's lookup sends it. */
export type ReaderCursor = {
  location: ReaderLocation;
  input: LookupCursor["input"];
  /** The word at the cursor, or in a script written without spaces the rest of the run from the character the cursor lies on. */
  term: string;
  isUnspaced: boolean;
  /** The length of text the cursor's highlight covers, as `selectCursorMatchedLength` gives it; unset while unknown. */
  matchedLength?: number | null;
};

/**
 * Selects the lookup cursor's place in the book's text, highlighted at once when its word's lookup is cached,
 * as one object while its place and length stay the same; null when there is no cursor or it lies outside a book.
 */
export const selectReaderCursor = createSelector(
  [
    (state: RootState) => selectLookupCursor(state.app),
    selectCursorMatchedLength,
  ],
  readerCursorOf,
  { memoizeOptions: { resultEqualityCheck: shallowEqual } },
);

/** The lookup cursor's place in a book's text, with the length its highlight covers, or null when it lies outside a book. */
export function readerCursorOf(
  cursor: LookupCursor | null,
  matchedLength: number | null | undefined,
): ReaderCursor | null {
  const source = cursor?.chosen.source;
  if (!cursor || source?.kind !== "text") return null;
  const place = {
    location: source.location,
    input: cursor.input,
    term: cursor.chosen.word.term,
    isUnspaced: source.isUnspaced,
  };
  return matchedLength === undefined ? place : { ...place, matchedLength };
}

/** The word a cursor highlights, as the reader view takes it, once the cursor's lookup has answered. */
export function highlightOfCursor(cursor: ReaderCursor): {
  word: HighlightedWord;
  matchedLength?: number | null;
} {
  const { term, location, isUnspaced, matchedLength } = cursor;
  return { word: { text: term, location, isUnspaced }, matchedLength };
}
