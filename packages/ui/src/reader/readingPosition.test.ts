import { describe, expect, it } from "vitest";
import { fixtureDocument } from "../testSupport/fixtureDocument.ts";
import { clampReadingPosition } from "./readingPosition.ts";

describe("clampReadingPosition", () => {
  it("keeps a position inside the document", () => {
    const position = { chapterIndex: 1, paragraphIndex: 2 };
    expect(clampReadingPosition(fixtureDocument, position)).toEqual(position);
  });

  it("moves a chapter index past the end to the last chapter", () => {
    const position = { chapterIndex: 9, paragraphIndex: 0 };
    expect(clampReadingPosition(fixtureDocument, position)).toEqual({
      chapterIndex: 1,
      paragraphIndex: 0,
    });
  });

  it("moves a paragraph index past the end to the last paragraph of its chapter", () => {
    const position = { chapterIndex: 0, paragraphIndex: 9 };
    expect(clampReadingPosition(fixtureDocument, position)).toEqual({
      chapterIndex: 0,
      paragraphIndex: 3,
    });
  });

  it("returns the start for a document without chapters", () => {
    const empty = { ...fixtureDocument, chapters: [] };
    expect(
      clampReadingPosition(empty, { chapterIndex: 2, paragraphIndex: 2 }),
    ).toEqual({ chapterIndex: 0, paragraphIndex: 0 });
  });
});
