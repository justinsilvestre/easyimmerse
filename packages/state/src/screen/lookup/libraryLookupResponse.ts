import type {
  Definition,
  LibraryEntry,
  LibraryWord,
  LookupResponse,
} from "@easyimmerse/types";

/** The dictionary id under which the pop-up shows a library word's entry. */
export const libraryDictionaryId = "library";

/**
 * Returns the lookup the dictionary pop-up shows for a word of a library item: one result for the word as it stands in `segmentText`,
 * with the entry the library manager chose, under a dictionary titled by the item. Empty definitions are left out.
 */
export function libraryLookupResponse(
  word: LibraryWord,
  segmentText: string,
  itemTitle: string,
): LookupResponse {
  const { term, reading } = word.entry;
  const result = {
    matchedText: segmentText.slice(word.start, word.end),
    term,
    reading,
    inflectionChains: [],
    definitions: [
      {
        dictionaryId: libraryDictionaryId,
        dictionaryTitle: itemTitle,
        entry: {
          term,
          reading,
          alternates: [],
          wordClasses: [],
          score: 0,
          sequence: null,
          termTags: [],
          definitionTags: [],
          definitions: definitionsOf(word.entry),
        },
        tags: [],
      },
    ],
    frequencies: [],
    pronunciations: [],
  };
  return { results: [result], kanji: [], stylesheets: [] };
}

function definitionsOf(entry: LibraryEntry): Definition[] {
  return [entry.l1_definition, entry.l2_definition]
    .filter((text) => text !== "")
    .map((text) => ({ kind: "text", text }));
}
