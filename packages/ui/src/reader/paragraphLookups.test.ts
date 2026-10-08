import { describe, expect, it } from "vitest";
import { paragraphLookups } from "./paragraphLookups.ts";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";

describe("paragraphLookups", () => {
  it("looks up from the start of each word written with spaces", () => {
    expect(
      paragraphLookups("Der Hund. Er frisst.", "de").map((l) => l.text),
    ).toEqual(["Der Hund.", "Hund.", "Er frisst.", "frisst."]);
  });

  it("looks up from each character of a word written without spaces", () => {
    expect(paragraphLookups("猫が寝る。", "ja").map((l) => l.text)).toEqual([
      "猫が寝る。",
      "が寝る。",
      "寝る。",
      "る。",
    ]);
  });

  it("takes each word's sentence as its context, as pointing at it would", () => {
    expect(paragraphLookups("Der Hund. Er frisst.", "de")[3]).toEqual(
      sentenceLookupAt("Der Hund. Er frisst.", 13, "de").lookup,
    );
  });
});
