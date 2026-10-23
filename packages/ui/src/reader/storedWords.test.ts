import { describe, expect, it } from "vitest";
import { exampleLibraryDocumentText } from "../library/exampleLibrary.ts";
import { storedWordsAroundCaret, storedWordsOf } from "./storedWords.ts";

const words = [
  { start: 0, end: 3 },
  { start: 4, end: 8 },
];

describe("storedWordsOf", () => {
  it("places each paragraph's words in its chapter", () => {
    expect(storedWordsOf(exampleLibraryDocumentText)[0]?.[1]).toEqual(
      exampleLibraryDocumentText.segments[1]?.words,
    );
  });
});

describe("storedWordsAroundCaret", () => {
  it("finds the word a caret lies inside", () => {
    expect(
      storedWordsAroundCaret("Der Hund", words, 6).map(({ text }) => text),
    ).toEqual(["Hund"]);
  });

  it("finds the word before a caret at its end", () => {
    expect(
      storedWordsAroundCaret("Der Hund", words, 3).map(({ text }) => text),
    ).toEqual(["Der"]);
  });

  it("finds nothing between words that are not stored", () => {
    expect(storedWordsAroundCaret("Der  Hund", [], 2)).toEqual([]);
  });
});
