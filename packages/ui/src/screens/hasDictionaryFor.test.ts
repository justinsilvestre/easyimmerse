import type { DictionarySummary } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { hasDictionaryFor } from "./hasDictionaryFor.ts";

const dictionary = (source_language: string | null): DictionarySummary => ({
  id: "d1",
  title: "Dictionary",
  entry_count: 1,
  source_language,
  target_language: null,
});

describe("hasDictionaryFor", () => {
  it("is false without dictionaries", () => {
    expect(hasDictionaryFor([], "de")).toBe(false);
  });

  it("is true when a dictionary's headwords are in the target language", () => {
    expect(hasDictionaryFor([dictionary("ja"), dictionary("de")], "de")).toBe(
      true,
    );
  });

  it("is false when only dictionaries for other languages exist", () => {
    expect(hasDictionaryFor([dictionary("ja")], "de")).toBe(false);
  });

  it("is true when no dictionary declares its languages", () => {
    expect(hasDictionaryFor([dictionary(null)], "de")).toBe(true);
  });
});
