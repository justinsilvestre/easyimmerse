import type { RootState } from "@easyimmerse/state";
import type { Document } from "@easyimmerse/types";
import { createSelector } from "reselect";
import {
  clampToBook,
  type ReaderLocation,
  startOfBook,
} from "./readingProgress.ts";

/**
 * Selects the reader's place in the book: the stored place, moved to the end of the book when it lies past it,
 * or the start of the book when none is stored.
 */
export const selectReaderLocation = createSelector(
  [
    // The document comes first, since reselect warns when a result is its first input unchanged.
    (_state: RootState, document: Document) => document,
    (state: RootState, _document: Document, mediaFileId: string) =>
      state.app.storedPlaces.reading[mediaFileId],
  ],
  (document, stored): ReaderLocation =>
    stored ? clampToBook(document, stored) : startOfBook,
);
