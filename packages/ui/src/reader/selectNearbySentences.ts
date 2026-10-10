import { type RootState, selectReaderScreen } from "@easyimmerse/state";
import type { Document } from "@easyimmerse/types";
import { createSelector } from "reselect";
import { selectReaderLocation } from "./selectReaderLocation.ts";
import { sentencesNearView } from "./sentencesNearView.ts";

/** Selects the sentences to look up ahead of the reader, most urgent first, as `sentencesNearView` picks them. */
export const selectNearbySentences = createSelector(
  [
    (state: RootState, document: Document, mediaFileId: string) =>
      selectReaderLocation(state, document, mediaFileId),
    (state: RootState) => selectReaderScreen(state).nearSpan,
    (_state: RootState, document: Document) => document,
    (
      _state: RootState,
      _document: Document,
      _mediaFileId: string,
      language: string,
    ) => language,
  ],
  (location, span, document, language): readonly string[] => {
    const paragraphs =
      document.chapters[location.chapterIndex]?.paragraphs ?? [];
    const near = span ?? {
      first: location.paragraphIndex,
      last: location.paragraphIndex,
    };
    return sentencesNearView(paragraphs, near, location, language);
  },
  { memoizeOptions: { resultEqualityCheck: haveSameItems } },
);

function haveSameItems(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return (
    first.length === second.length &&
    first.every((item, index) => item === second[index])
  );
}
