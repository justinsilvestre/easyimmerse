import {
  type ChosenWord,
  type LibraryFlashcardPlace,
  type LookupSource,
  libraryFlashcardPlaceOf,
  libraryLookupResponse,
  librarySegmentOf,
} from "@easyimmerse/state";
import type {
  LibraryItem,
  LibrarySegment,
  LibraryText,
  LibraryWord,
  LookupResponse,
} from "@easyimmerse/types";

/** A library item a media file comes from, with its text. */
export type LibraryItemText = { item: LibraryItem; text: LibraryText };

/**
 * The library item a media file of a project comes from, with its text, from which the dictionary pop-up and the flashcards
 * of its words are made instead of from the dictionaries. `wordlessSource` is the passage a flashcard for no word comes from,
 * such as the cue shown now, or null when there is none.
 */
export type LibraryWords = {
  item: LibraryItem;
  text: LibraryText;
  projectId: string;
  mediaFileId: string;
  wordlessSource: LookupSource | null;
};

const nothingFound: LookupResponse = {
  results: [],
  kanji: [],
  stylesheets: [],
};

/** Returns what the pop-up shows for a chosen word: the entry of the stored word it lies in, or nothing found when it lies in none. */
export function libraryLookupOf(
  library: LibraryWords,
  chosen: ChosenWord,
): LookupResponse {
  const found = storedWordOf(library.text, chosen);
  return found
    ? libraryLookupResponse(found.word, found.segment.text, library.item.title)
    : nothingFound;
}

/**
 * Returns where a library flashcard for a chosen word comes from: the stored word it lies in,
 * or its whole segment when it lies in none. Null when the word lies in no segment.
 */
export function libraryFlashcardPlace(
  library: LibraryWords,
  chosen: ChosenWord,
): LibraryFlashcardPlace | null {
  const found = storedWordOf(library.text, chosen);
  const atWord =
    found && chosen.occurrence
      ? {
          ...chosen,
          occurrence: { ...chosen.occurrence, start: found.word.start },
        }
      : chosen;
  const place = libraryFlashcardPlaceOf(library.text, atWord);
  const { projectId, mediaFileId } = library;
  return place && { projectId, mediaFileId, ...place };
}

/** Returns a chosen word for no word of a passage, from which a flashcard of its whole segment is made. */
export function wordlessChosenWord(source: LookupSource): ChosenWord {
  return {
    word: { term: "", query: null },
    source,
    occurrence: null,
    anchor: null,
  };
}

function storedWordOf(
  text: LibraryText,
  chosen: ChosenWord,
): { segment: LibrarySegment; word: LibraryWord } | null {
  const segment = chosen.source && librarySegmentOf(text, chosen.source);
  const offset = chosen.occurrence?.start;
  if (!segment || offset === undefined) return null;
  const word = segment.words.find(
    ({ start, end }) => start <= offset && offset < end,
  );
  return word ? { segment, word } : null;
}
