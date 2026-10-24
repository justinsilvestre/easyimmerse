import type { Cue, LibraryText, LibraryWord } from "@easyimmerse/types";
import type { WordSpan } from "../../components/splitAtWords.ts";

const noWords: readonly WordSpan[] = [];

/** Returns the words a library manager set in each segment of a library item's text, by the index of the cue the segment makes. */
export function libraryWordsByCue(
  text: LibraryText,
): ReadonlyMap<number, readonly LibraryWord[]> {
  return new Map(text.segments.map(({ index, words }) => [index, words]));
}

/** Returns the stored words of a cue, none for a cue the map lacks, or undefined without a map, for a file not from the library. */
export function libraryWordsOf(
  words: ReadonlyMap<number, readonly WordSpan[]> | undefined,
  cue: Cue,
): readonly WordSpan[] | undefined {
  return words && (words.get(cue.index) ?? noWords);
}
