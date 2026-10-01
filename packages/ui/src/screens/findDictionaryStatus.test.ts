import type { DictionarySummary } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { findDictionaryStatus } from "./findDictionaryStatus.ts";

const dictionary = (source_language: string | null): DictionarySummary => ({
  id: "d1",
  title: "Dictionary",
  entry_count: 1,
  source_language,
  target_language: null,
});

describe("findDictionaryStatus", () => {
  it("is unknown while the dictionaries are loading", () => {
    expect(findDictionaryStatus(undefined, "de")).toBe("unknown");
  });

  it("is ready when a dictionary's headwords are in the target language", () => {
    expect(findDictionaryStatus([dictionary("DE-at")], "de")).toBe("ready");
  });

  it("is missing when no dictionary's headwords are in the target language", () => {
    expect(
      findDictionaryStatus([dictionary("ja"), dictionary(null)], "de"),
    ).toBe("missing");
  });
});
