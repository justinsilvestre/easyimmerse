import type { DictionarySummary } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { dictionaryStatusesOf } from "./dictionaryStatusesOf.ts";

function summary(
  sourceLanguage: string | null,
  targetLanguage: string | null,
): DictionarySummary {
  return {
    id: `${sourceLanguage}-${targetLanguage}`,
    title: "Dictionary",
    format: "yomitan",
    source_language: sourceLanguage,
    target_language: targetLanguage,
    entry_count: 1,
    term_meta_count: 0,
    tag_count: 0,
    kanji_count: 0,
    kanji_meta_count: 0,
    media_count: 0,
  };
}

const germanProject = { target_language: "de", translation_language: "en" };

describe("dictionaryStatusesOf", () => {
  it("counts the dictionaries for the target language and those that define it in the translation language", () => {
    expect(
      dictionaryStatusesOf(
        [summary("de", "en"), summary("de", "de"), summary("ja", "en")],
        germanProject,
      ),
    ).toEqual([
      { language: "de", role: "target", dictionaryCount: 2 },
      { language: "en", role: "translation", dictionaryCount: 1 },
    ]);
  });

  it("counts a dictionary that states no languages for both", () => {
    expect(
      dictionaryStatusesOf([summary(null, null)], germanProject).map(
        (status) => status.dictionaryCount,
      ),
    ).toEqual([1, 1]);
  });

  it("shows only the target language when the project translates into it", () => {
    expect(
      dictionaryStatusesOf([], {
        target_language: "de",
        translation_language: "de",
      }),
    ).toHaveLength(1);
  });
});
