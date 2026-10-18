import type {
  Definition,
  DictionaryDefinitions,
  FlashcardContent,
  LookupResult,
} from "@easyimmerse/types";
import type { LookupFieldsContext } from "./flashcardForm.ts";
import { isSameLanguage } from "./languageTags.ts";

/** The fields of a flashcard that a lookup fills. */
export type LookupFlashcardFields = Pick<
  FlashcardContent,
  "word" | "word_pronunciation" | "l1_definition" | "l2_definition"
>;

/** Writes one definition as the Markdown a flashcard field holds. */
export type DefinitionWriter = (definition: Definition) => string;

/**
 * Fills the word fields of a flashcard from a lookup: the word and its reading from the dictionary's headword,
 * and the definitions, written by `writeDefinition`, sorted into L1 (in the translation language) and L2 (in the target language) by each dictionary's stated language.
 * Definitions in any other language are left out.
 * Without an `entryIndex`, every result for the longest matched text contributes; with one, only that result does.
 * A dictionary that does not state its language counts as defining in the translation language.
 */
export function flashcardFieldsFromLookup(
  results: readonly LookupResult[],
  entryIndex: number | null,
  context: LookupFieldsContext,
  writeDefinition: DefinitionWriter,
): LookupFlashcardFields | null {
  const chosen = chooseResults(results, entryIndex);
  const first = chosen[0];
  if (first === undefined) return null;
  const sections = chosen.flatMap((result) => result.definitions);
  const fieldOf = (section: DictionaryDefinitions) =>
    definitionField(section.dictionaryId, context);
  const join = (field: "l1" | "l2") =>
    joinDefinitions(
      sections.filter((section) => fieldOf(section) === field),
      writeDefinition,
    );
  return {
    word: first.term,
    word_pronunciation: first.reading ?? "",
    l1_definition: join("l1"),
    l2_definition: join("l2"),
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

/**
 * Chooses the field a dictionary's definitions go into: L1 when they are in the translation language,
 * L2 when they are in the target language, and neither when they are in a third language.
 * When the two project languages are the same, every definition goes into L1.
 */
function definitionField(
  dictionaryId: string,
  { languages, dictionaries }: LookupFieldsContext,
): "l1" | "l2" | null {
  const language = dictionaries.find(
    ({ id }) => id === dictionaryId,
  )?.target_language;
  if (language == null || isSameLanguage(language, languages.translation))
    return "l1";
  return isSameLanguage(language, languages.target) ? "l2" : null;
}

/** Puts each definition's Markdown on lines of its own, each distinct text once. */
function joinDefinitions(
  sections: readonly DictionaryDefinitions[],
  writeDefinition: DefinitionWriter,
): string {
  const texts = sections
    .flatMap((section) => section.entry.definitions)
    .map(writeDefinition)
    .filter((text) => text !== "");
  return [...new Set(texts)].join("\n");
}
