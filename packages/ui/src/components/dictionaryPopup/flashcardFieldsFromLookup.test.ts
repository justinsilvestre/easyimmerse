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

describe("flashcardFieldsFromLookup with the app's Markdown writer", () => {
  it("fills L1 with each definition's Markdown, its examples included", () => {
    expect(
      flashcardFieldsFromLookup(
        exampleResults,
        null,
        { languages, dictionaries },
        definitionMarkdown,
      )?.l1_definition,
    ).toBe(
      [
        "to eat (of an animal); to devour",
        "(colloquial, of a person) to gobble, to wolf down",
        "(figurative) to consume, to eat up (fuel, resources)\nDas Auto frisst viel Benzin.",
        "food or feed for animals",
        "(colloquial, derogatory) grub, chow",
      ].join("\n"),
    );
  });
});
