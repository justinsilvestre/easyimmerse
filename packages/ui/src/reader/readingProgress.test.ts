import type { Document } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  chapterStartProgresses,
  locationAtProgress,
  progressAt,
} from "./readingProgress.ts";

/** Two chapters of ten characters each. */
function createDocument(): Document {
  return {
    title: "Book",
    language: "de",
    chapters: [
      { title: "One", paragraphs: ["abcd", "efghij"] },
      { title: "Two", paragraphs: ["klmnopqrst"] },
    ],
  };
}

describe("progressAt", () => {
  it("is zero at the start of the book", () => {
    expect(
      progressAt(createDocument(), {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 0,
      }),
    ).toBe(0);
  });

  it("counts the characters of earlier chapters and paragraphs", () => {
    expect(
      progressAt(createDocument(), {
        chapterIndex: 1,
        paragraphIndex: 0,
        offset: 5,
      }),
    ).toBe(0.75);
  });

  it("is zero for a document without text", () => {
    expect(
      progressAt(
        { title: "", language: null, chapters: [] },
        { chapterIndex: 0, paragraphIndex: 0, offset: 0 },
      ),
    ).toBe(0);
  });
});

describe("locationAtProgress", () => {
  it("finds the paragraph and offset at the share of the text", () => {
    expect(locationAtProgress(createDocument(), 0.3)).toEqual({
      chapterIndex: 0,
      paragraphIndex: 1,
      offset: 2,
    });
  });

  it("returns the end of the last paragraph for the whole book", () => {
    expect(locationAtProgress(createDocument(), 1)).toEqual({
      chapterIndex: 1,
      paragraphIndex: 0,
      offset: 10,
    });
  });
});

describe("chapterStartProgresses", () => {
  it("gives the share of the text before each chapter", () => {
    expect(chapterStartProgresses(createDocument())).toEqual([0, 0.5]);
  });
});
