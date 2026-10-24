import { describe, expect, it } from "vitest";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";
import { sentenceWordLookups } from "./sentenceWordLookups.ts";

describe("sentenceWordLookups", () => {
  it("looks up from the start of each word written with spaces", () => {
    expect(
      sentenceWordLookups("Er frisst.", "de").map((lookup) => lookup.text),
    ).toEqual(["Er frisst.", "frisst."]);
  });

  it("looks up from each character of a word written without spaces", () => {
    expect(
      sentenceWordLookups("猫が寝る。", "ja").map((lookup) => lookup.text),
    ).toEqual(["猫が寝る。", "が寝る。", "寝る。", "る。"]);
  });

  it("looks up from a number before a kanji once, at its first digit", () => {
    expect(
      sentenceWordLookups("2026年に", "ja").map((lookup) => lookup.text),
    ).toEqual(["2026年に", "年に", "に"]);
  });

  it("describes each lookup as pointing at the word in its paragraph would", () => {
    expect(sentenceWordLookups("Er frisst.", "de")[1]).toEqual(
      sentenceLookupAt("Der Hund. Er frisst.", 13, "de").lookup,
    );
  });
});
