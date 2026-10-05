import type {
  DictionaryDefinitions,
  DictionarySummary,
  FlashcardContent,
  LookupResult,
} from "@easyimmerse/types";
import { isSameLanguage } from "../dictionaries/dictionaryLanguages.ts";
import { definitionPlainText } from "./definitionPlainText.ts";

export type LookupFlashcardFields = Pick<
  FlashcardContent,
  "word" | "word_pronunciation" | "l1_definition" | "l2_definition"
>;

type ProjectLanguages = { target: string; translation: string };

/**
 * Fills the word fields of a flashcard from a lookup: the word and its reading from the dictionary's headword,
 * and the definitions sorted into L1 (in the translation language) and L2 (in the target language) by each dictionary's stated language.
 * Without an `entryIndex`, every result for the longest matched text contributes; with one, only that result does.
 * A dictionary that does not state its language counts as defining in the translation language.
 */
export function flashcardFieldsFromLookup(
  results: readonly LookupResult[],
  entryIndex: number | null,
  languages: ProjectLanguages,
  dictionaries: readonly DictionarySummary[],
): LookupFlashcardFields | null {
  const chosen = chooseResults(results, entryIndex);
  const first = chosen[0];
  if (first === undefined) return null;
  const sections = chosen.flatMap((result) => result.definitions);
  const isL2 = (section: DictionaryDefinitions) =>
    definesInTargetLanguage(section.dictionaryId, languages, dictionaries);
  return {
    word: first.term,
    word_pronunciation: first.reading ?? "",
    l1_definition: joinDefinitions(sections.filter((s) => !isL2(s))),
    l2_definition: joinDefinitions(sections.filter(isL2)),
  };
}

function chooseResults(
  results: readonly LookupResult[],
  entryIndex: number | null,
): readonly LookupResult[] {
  if (entryIndex !== null) return results.slice(entryIndex, entryIndex + 1);
  const longest = results[0]?.matchedText;
  return results.filter((result) => result.matchedText === longest);
}

function definesInTargetLanguage(
  dictionaryId: string,
  languages: ProjectLanguages,
  dictionaries: readonly DictionarySummary[],
): boolean {
  if (isSameLanguage(languages.target, languages.translation)) return false;
  const language = dictionaries.find(
    ({ id }) => id === dictionaryId,
  )?.target_language;
  return language != null && isSameLanguage(language, languages.target);
}

/** Puts each definition on its own line, each distinct text once. */
function joinDefinitions(sections: readonly DictionaryDefinitions[]): string {
  const texts = sections
    .flatMap((section) => section.entry.definitions)
    .map(definitionPlainText)
    .filter((text) => text !== "");
  return [...new Set(texts)].join("\n");
}
