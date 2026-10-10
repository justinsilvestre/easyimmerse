import { flashcardFieldsFromLookup } from "@easyimmerse/state";
import type { DictionarySummary } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { definitionMarkdown } from "./definitionMarkdown.ts";
import { exampleResults } from "./exampleLookup.ts";

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

const dictionaries = [summary("wiktionary-de-en", "en"), summary("dwds", "de")];

const languages = { target: "de", translation: "en" };

/** The fields of the example results, as the app's Markdown writer writes them, with the project's dictionaries given. */
const fieldsWith = (
  entryIndex: number | null,
  summaries: readonly DictionarySummary[],
) =>
  flashcardFieldsFromLookup(
    exampleResults,
    entryIndex,
    { languages, dictionaries: summaries },
    definitionMarkdown,
  );

const fieldsOf = (entryIndex: number | null) =>
  fieldsWith(entryIndex, dictionaries);

describe("flashcardFieldsFromLookup", () => {
  it("takes the word from the first result's term", () => {
    expect(fieldsOf(null)?.word).toBe("fressen");
  });

  it("fills L1 with the definitions in the translation language of every result for the matched text", () => {
    expect(fieldsOf(null)?.l1_definition).toBe(
      [
        "to eat (of an animal); to devour",
        "(colloquial, of a person) to gobble, to wolf down",
        "(figurative) to consume, to eat up (fuel, resources)\nDas Auto frisst viel Benzin.",
        "food or feed for animals",
        "(colloquial, derogatory) grub, chow",
      ].join("\n"),
    );
  });

  it("fills L2 with the definitions in the target language", () => {
    expect(fieldsOf(null)?.l2_definition).toBe(
      "(von Tieren) Nahrung zu sich nehmen\n(umgangssprachlich, von Menschen) gierig und viel essen",
    );
  });

  it("takes only the chosen entry's definitions", () => {
    expect(fieldsOf(1)?.l1_definition).toBe(
      "food or feed for animals\n(colloquial, derogatory) grub, chow",
    );
  });

  it("takes the word from the chosen entry", () => {
    expect(fieldsOf(1)?.word).toBe("Fressen");
  });

  it("counts a dictionary that does not state its language as defining in the translation language", () => {
    expect(fieldsWith(1, [])?.l2_definition).toBe("");
  });

  it("leaves out of L1 the definitions in a third language", () => {
    expect(
      fieldsWith(1, [summary("wiktionary-de-en", "fr")])?.l1_definition,
    ).toBe("");
  });

  it("fills nothing when nothing was found", () => {
    expect(
      flashcardFieldsFromLookup(
        [],
        null,
        { languages, dictionaries: [] },
        definitionMarkdown,
      ),
    ).toBeNull();
  });
});
