import type {
  BatchLookupResponse,
  KanjiResult,
  LookupResult,
} from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { lookupResponseAt } from "./lookupResponseAt.ts";

function resultFrom(term: string, dictionaryId: string): LookupResult {
  return {
    matchedText: term,
    term,
    reading: null,
    inflectionChains: [],
    definitions: [
      {
        dictionaryId,
        dictionaryTitle: dictionaryId,
        entry: {} as LookupResult["definitions"][number]["entry"],
        tags: [],
      },
    ],
    frequencies: [],
    pronunciations: [],
  };
}

const kanji = { dictionaryId: "kanjidic" } as KanjiResult;

const batch: BatchLookupResponse = {
  texts: [
    { positions: [{ offset: 0, results: [1, 0], kanji: [0] }] },
    { positions: [{ offset: 2, results: [0], kanji: [] }] },
  ],
  results: [resultFrom("猫", "jmdict"), resultFrom("猫が", "other")],
  kanji: [kanji],
  stylesheets: [
    { dictionaryId: "other", css: "a {}" },
    { dictionaryId: "jmdict", css: "b {}" },
  ],
};

describe("lookupResponseAt", () => {
  it("takes a position's results from the pool in order", () => {
    expect(lookupResponseAt(batch, 0, 0)?.results).toEqual([
      batch.results[1],
      batch.results[0],
    ]);
  });

  it("takes a position's kanji from the pool", () => {
    expect(lookupResponseAt(batch, 0, 0)?.kanji).toEqual([kanji]);
  });

  it("keeps only the stylesheets of the results' dictionaries", () => {
    expect(lookupResponseAt(batch, 1, 2)?.stylesheets).toEqual([
      { dictionaryId: "jmdict", css: "b {}" },
    ]);
  });

  it("answers an empty response for a position the batch left out", () => {
    expect(lookupResponseAt(batch, 1, 0)).toEqual({
      results: [],
      kanji: [],
      stylesheets: [],
    });
  });

  it("answers null for a text the batch does not hold", () => {
    expect(lookupResponseAt(batch, 2, 0)).toBeNull();
  });
});
