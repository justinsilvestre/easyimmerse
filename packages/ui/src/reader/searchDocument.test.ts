import type { Document } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  excerptAround,
  findMatchRanges,
  searchDocument,
} from "./searchDocument.ts";

function createDocument(): Document {
  return {
    title: "Book",
    language: "de",
    chapters: [
      { title: "I", paragraphs: ["Über dem Tisch.", "Der Tisch war leer."] },
      { title: "II", paragraphs: ["Kein Tisch."] },
    ],
  };
}

describe("findMatchRanges", () => {
  it("ignores case", () => {
    expect(findMatchRanges("Der Tisch", "tisch")).toEqual([
      { start: 4, end: 9 },
    ]);
  });

  it("ignores accents", () => {
    expect(findMatchRanges("Über", "uber")).toEqual([{ start: 0, end: 4 }]);
  });

  it("finds a query with accents in text that spells them as combining marks", () => {
    expect(findMatchRanges("Über", "über")).toEqual([{ start: 0, end: 5 }]);
  });

  it("finds every occurrence", () => {
    expect(findMatchRanges("ab ab ab", "ab")).toHaveLength(3);
  });

  it("finds nothing for a blank query", () => {
    expect(findMatchRanges("text", "  ")).toEqual([]);
  });
});

describe("searchDocument", () => {
  it("finds matches across chapters", () => {
    expect(
      searchDocument(createDocument(), "tisch").map(
        (match) => match.chapterIndex,
      ),
    ).toEqual([0, 0, 1]);
  });

  it("stops at the limit", () => {
    expect(searchDocument(createDocument(), "tisch", 2)).toHaveLength(2);
  });
});

describe("excerptAround", () => {
  it("marks text cut off at either end with an ellipsis", () => {
    const text = `${"a".repeat(60)}MATCH${"b".repeat(60)}`;
    const excerpt = excerptAround(text, 60, 65);
    expect([excerpt.before.at(0), excerpt.after.at(-1)]).toEqual(["…", "…"]);
  });
});
