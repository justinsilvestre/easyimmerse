import type {
  Definition,
  DictionarySummary,
  LookupResult,
} from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { flashcardFieldsFromLookup } from "./lookupFields.ts";

function summary(id: string, targetLanguage: string | null): DictionarySummary {
  return {
    id,
    title: id,
    format: "csv",
    source_language: "de",
    target_language: targetLanguage,
    entry_count: 1,
    term_meta_count: 0,
    tag_count: 0,
    kanji_count: 0,
    kanji_meta_count: 0,
    media_count: 0,
  };
}

/** A result for the matched text, defined by each dictionary given with one text definition. */
function result(
  matchedText: string,
  term: string,
  definitions: readonly [string, string][],
): LookupResult {
  return {
    matchedText,
    term,
    reading: null,
    inflectionChains: [],
    definitions: definitions.map(([dictionaryId, text]) => ({
      dictionaryId,
      entry: { definitions: [{ kind: "text", text }] },
    })) as LookupResult["definitions"],
    frequencies: [],
    pronunciations: [],
  };
}

const results = [
  result("fressen", "fressen", [
    ["en", "to eat"],
    ["de", "Nahrung zu sich nehmen"],
  ]),
  result("fressen", "Fressen", [["en", "food for animals"]]),
  result("fress", "fress", [["en", "eat!"]]),
];

const dictionaries = [summary("en", "en"), summary("de", "de")];

const languages = { target: "de", translation: "en" };

const writeText = (definition: Definition) =>
  definition.kind === "text" ? definition.text : "";

/** The fields of the example results, with the project's dictionaries given. */
const fieldsWith = (
  entryIndex: number | null,
  summaries: readonly DictionarySummary[],
) =>
  flashcardFieldsFromLookup(
    results,
    entryIndex,
    { languages, dictionaries: summaries },
    writeText,
  );

const fieldsOf = (entryIndex: number | null) =>
  fieldsWith(entryIndex, dictionaries);

describe("flashcardFieldsFromLookup", () => {
  it("takes the word from the first result's term", () => {
    expect(fieldsOf(null)?.word).toBe("fressen");
  });

  it("fills L1 with the definitions in the translation language of every result for the longest matched text", () => {
    expect(fieldsOf(null)?.l1_definition).toBe("to eat\nfood for animals");
  });

  it("fills L2 with the definitions in the target language", () => {
    expect(fieldsOf(null)?.l2_definition).toBe("Nahrung zu sich nehmen");
  });

  it("takes only the chosen entry's definitions", () => {
    expect(fieldsOf(1)?.l1_definition).toBe("food for animals");
  });

  it("takes the word from the chosen entry", () => {
    expect(fieldsOf(1)?.word).toBe("Fressen");
  });

  it("counts a dictionary that does not state its language as defining in the translation language", () => {
    expect(fieldsWith(0, [])?.l1_definition).toBe(
      "to eat\nNahrung zu sich nehmen",
    );
  });

  it("leaves out of L1 the definitions in a third language", () => {
    expect(fieldsWith(1, [summary("en", "fr")])?.l1_definition).toBe("");
  });

  it("fills nothing when nothing was found", () => {
    expect(
      flashcardFieldsFromLookup(
        [],
        null,
        { languages, dictionaries: [] },
        writeText,
      ),
    ).toBeNull();
  });
});
