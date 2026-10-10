import type { ChosenWord } from "@easyimmerse/state";
import type { DictionarySummary, LookupResult } from "@easyimmerse/types";
import {
  flashcardFieldsFromLookup,
  type LookupFlashcardFields,
} from "./flashcardFieldsFromLookup.ts";
import { type LookupPlace, placeOf } from "./lookupPlace.ts";

/**
 * The flashcard that the pop-up's flashcard buttons make from the word it shows: from every result, or from the one at `entryIndex`.
 * Its word is the dictionary's headword when a result answers, or else the term looked up.
 */
export function popupFlashcardOf(
  results: readonly LookupResult[],
  entryIndex: number | null,
  chosen: ChosenWord | null,
  languages: { target: string; translation: string },
  dictionaries: readonly DictionarySummary[],
): {
  word: string;
  place: LookupPlace | null;
  fields: LookupFlashcardFields | null;
} {
  const fields = flashcardFieldsFromLookup(
    results,
    entryIndex,
    languages,
    dictionaries,
  );
  return {
    word: fields?.word ?? chosen?.word.term ?? "",
    place: placeOf(chosen),
    fields,
  };
}
