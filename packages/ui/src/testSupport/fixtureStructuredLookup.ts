import fixtureStructuredImageUrl from "@easyimmerse/fixtures/sample-yomitan-structured/img/cat.svg?url";
import fixtureStructuredStylesheet from "@easyimmerse/fixtures/sample-yomitan-structured/styles.css?raw";
import termBank from "@easyimmerse/fixtures/sample-yomitan-structured/term_bank_1.json";
import type {
  DictionaryLookupResult,
  DictionarySummary,
  Glossary,
  TermEntry,
} from "@easyimmerse/types";

export { fixtureStructuredImageUrl, fixtureStructuredStylesheet };

/** A row of a Yomitan term bank: term, reading, definition tags, rules, score, glossary, sequence, and term tags. */
type TermBankRow = [
  string,
  string,
  string,
  string,
  number,
  Glossary[],
  number,
  string,
];

export const fixtureStructuredDictionary: DictionarySummary = {
  id: "d3",
  title: "Sample Structured Dictionary",
  entry_count: 3,
  source_language: "ja",
  target_language: "en",
};

/** Finds the entry for the term in `fixtures/sample-yomitan-structured`, as a lookup returns it. */
export function findStructuredEntry(term: string): TermEntry {
  const row = (termBank as unknown as TermBankRow[]).find(
    ([rowTerm]) => rowTerm === term,
  );
  if (row === undefined) throw new Error(`No fixture entry for ${term}.`);
  const [, reading, , , , definitions, , termTags] = row;
  return {
    term,
    reading,
    definitions,
    tags: termTags === "" ? [] : termTags.split(" "),
  };
}

export const fixtureStructuredLookupResult: DictionaryLookupResult = {
  dictionary: fixtureStructuredDictionary,
  entries: [findStructuredEntry("猫")],
};
