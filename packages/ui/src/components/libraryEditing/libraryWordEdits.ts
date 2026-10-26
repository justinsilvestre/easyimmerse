import {
  type ChosenWord,
  type LibraryWordPlace,
  librarySegmentOf,
} from "@easyimmerse/state";
import type {
  LibraryEntry,
  LibrarySegment,
  LibraryText,
  LibraryWord,
} from "@easyimmerse/types";
import { isUnspacedLetter } from "../wordLookup/ClickableText.tsx";
import { characterLength } from "../wordLookup/characterLength.ts";
import type { WordSpan } from "../wordLookup/splitAtWords.ts";

/**
 * Returns the text a library manager chose for an entry: a clicked word of a script written with spaces whole,
 * the text from a clicked character of a script written without spaces as far as the entry chosen goes,
 * or exactly the text selected, which ends at `selectedEnd`. Null when the word lies in no segment of the item.
 */
export function libraryWordPlaceOf(
  text: LibraryText,
  chosen: ChosenWord,
  selectedEnd?: number,
): LibraryWordPlace | null {
  const segment = chosen.source && librarySegmentOf(text, chosen.source);
  const start = chosen.occurrence?.start;
  if (!segment || start === undefined) return null;
  const { term } = chosen.word;
  const isRun = isUnspacedLetter(
    String.fromCodePoint(term.codePointAt(0) ?? 0),
  );
  const end = selectedEnd ?? (isRun ? null : start + term.length);
  return { segmentIndex: segment.index, start, end };
}

/**
 * Returns the text the dictionary pop-up gives an entry for: the text selected or clicked, while the pop-up still shows it,
 * even with another word typed into its field; or else the word the pop-up moved to, as a clicked word.
 * Null while the pop-up shows no text of the item's segments.
 */
export function libraryWordPlaceShown(
  text: LibraryText,
  chosen: ChosenWord | null,
  selected: LibraryWordPlace | null,
): LibraryWordPlace | null {
  if (chosen === null) return null;
  const shown = libraryWordPlaceOf(text, chosen);
  const segment = chosen.source && librarySegmentOf(text, chosen.source);
  const isSelectedShown =
    selected !== null &&
    selected.segmentIndex === segment?.index &&
    (shown === null || shown.start === selected.start);
  return isSelectedShown ? selected : shown;
}

/**
 * Returns the span of a segment's text that an entry is given for: the place chosen, or for a click in a script without spaces,
 * the text the entry's lookup matched when it lies there, and else the character clicked.
 */
export function librarySpanOf(
  segmentText: string,
  place: LibraryWordPlace,
  matchedText: string | null,
): WordSpan {
  const { start } = place;
  if (place.end !== null) return { start, end: place.end };
  const length =
    matchedText && segmentText.startsWith(matchedText, start)
      ? matchedText.length
      : characterLength(segmentText, start);
  return { start, end: start + length };
}

/** Returns the stored word that overlaps the place chosen, or null when it overlaps none. */
export function storedWordAtPlace(
  segment: LibrarySegment,
  place: LibraryWordPlace,
): LibraryWord | null {
  const end = place.end ?? place.start + 1;
  return (
    segment.words.find((word) => word.start < end && place.start < word.end) ??
    null
  );
}

/** Returns a segment's words with a word over the span given the entry, in place of every word it overlaps, in order. */
export function withLibraryWord(
  words: readonly LibraryWord[],
  span: WordSpan,
  entry: LibraryEntry,
): LibraryWord[] {
  const kept = words.filter(
    (word) => word.end <= span.start || span.end <= word.start,
  );
  return [...kept, { ...span, entry }].sort((a, b) => a.start - b.start);
}

/** Returns a segment's words without the word that begins at `start`. */
export function withoutLibraryWord(
  words: readonly LibraryWord[],
  start: number,
): LibraryWord[] {
  return words.filter((word) => word.start !== start);
}
