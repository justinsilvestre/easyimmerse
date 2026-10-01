import type { Document } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { searchDocument } from "./searchDocument.ts";

function createDocument(chapters: string[][]): Document {
  return {
    title: "Test",
    language: "en",
    chapters: chapters.map((paragraphs) => ({ title: null, paragraphs })),
  };
}

describe("searchDocument", () => {
  it("returns the position of every paragraph containing the query, in reading order", () => {
    const document = createDocument([
      ["A cat.", "A dog."],
      ["No pets.", "Another cat."],
    ]);
    expect(searchDocument(document, "cat")).toEqual([
      { chapterIndex: 0, paragraphIndex: 0 },
      { chapterIndex: 1, paragraphIndex: 1 },
    ]);
  });

  it("ignores letter case", () => {
    const document = createDocument([["The Cat sleeps."]]);
    expect(searchDocument(document, "cAT")).toEqual([
      { chapterIndex: 0, paragraphIndex: 0 },
    ]);
  });

  it("returns one match for a paragraph containing the query several times", () => {
    const document = createDocument([["cat and cat and cat"]]);
    expect(searchDocument(document, "cat")).toHaveLength(1);
  });

  it("matches phrases across word boundaries", () => {
    const document = createDocument([["The cat says good night."]]);
    expect(searchDocument(document, "good night")).toHaveLength(1);
  });

  it("returns no matches for a query of only spaces", () => {
    const document = createDocument([["A cat sleeps."]]);
    expect(searchDocument(document, "  ")).toEqual([]);
  });

  it("ignores spaces around the query", () => {
    const document = createDocument([["A cat sleeps."]]);
    expect(searchDocument(document, " cat ")).toHaveLength(1);
  });
});
