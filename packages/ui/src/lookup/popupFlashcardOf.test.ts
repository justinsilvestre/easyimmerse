import type { ChosenWord } from "@easyimmerse/state";
import type { DictionarySummary } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleResults } from "./exampleLookup.ts";
import { popupFlashcardOf } from "./popupFlashcardOf.ts";

function summary(id: string, targetLanguage: string): DictionarySummary {
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

const cue = { index: 1, start_ms: 0, end_ms: 1000, text: "Die Katze frisst." };
const chosen: ChosenWord = {
  word: { term: "frisst", query: null },
  source: { kind: "cue", cue },
  occurrence: { passage: "1", start: 10 },
  anchor: null,
};
const languages = { target: "de", translation: "en" };
const dictionaries = [summary("wiktionary-de-en", "en"), summary("dwds", "de")];

const flashcardOf = (results = exampleResults) =>
  popupFlashcardOf(results, null, chosen, { languages, dictionaries });

describe("popupFlashcardOf", () => {
  it("takes the word from the dictionary rather than the term looked up", () => {
    expect(flashcardOf().word).toBe("fressen");
  });

  it("keeps the term looked up when no dictionary has an entry", () => {
    expect(flashcardOf([]).word).toBe("frisst");
  });

  it("fills L1 with the definitions in the translation language", () => {
    expect(flashcardOf().fields?.l1_definition).toMatch(
      /^to eat \(of an animal\); to devour\n/,
    );
  });

  it("takes its sentence from the word's place", () => {
    expect(flashcardOf().place).toEqual({ source: chosen.source, start: 10 });
  });
});
