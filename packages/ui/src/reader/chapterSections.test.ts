import { describe, expect, it } from "vitest";
import {
  estimateChapterPage,
  sectionIndexAt,
  sectionsOf,
} from "./chapterSections.ts";

describe("sectionsOf", () => {
  it("keeps a chapter under the limit in one section", () => {
    expect(sectionsOf(["abc", "def"], 10)).toEqual([{ start: 0, end: 2 }]);
  });

  it("starts a new section before the paragraph that would pass the limit", () => {
    expect(sectionsOf(["abcd", "efgh", "ijkl"], 10)).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 3 },
    ]);
  });

  it("gives a paragraph longer than the limit a section of its own", () => {
    expect(sectionsOf(["ab", "cdefghijklmn", "op"], 10)).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 2 },
      { start: 2, end: 3 },
    ]);
  });

  it("balances the sections, so that the last one is not much shorter than the rest", () => {
    expect(sectionsOf(Array(5).fill("abcd"), 16)).toEqual([
      { start: 0, end: 3 },
      { start: 3, end: 5 },
    ]);
  });

  it("gives a chapter without paragraphs one empty section", () => {
    expect(sectionsOf([], 10)).toEqual([{ start: 0, end: 0 }]);
  });
});

describe("sectionIndexAt", () => {
  const sections = [
    { start: 0, end: 2 },
    { start: 2, end: 5 },
  ];

  it("finds the section holding the paragraph", () => {
    expect(sectionIndexAt(sections, 3)).toBe(1);
  });

  it("finds the last section for a paragraph past the end", () => {
    expect(sectionIndexAt(sections, 9)).toBe(1);
  });
});

describe("estimateChapterPage", () => {
  const paragraphs = ["a".repeat(100), "b".repeat(100), "c".repeat(200)];

  describe("when the chapter has one section", () => {
    it("returns the section's page unchanged", () => {
      expect(
        estimateChapterPage(
          { page: 3, pageCount: 8 },
          paragraphs,
          [{ start: 0, end: 3 }],
          0,
        ),
      ).toEqual({ page: 3, pageCount: 8, isEstimate: false });
    });
  });

  describe("when the chapter has several sections", () => {
    const sections = [
      { start: 0, end: 2 },
      { start: 2, end: 3 },
    ];

    it("scales the pages by the chapter's characters", () => {
      expect(
        estimateChapterPage({ page: 1, pageCount: 4 }, paragraphs, sections, 1),
      ).toEqual({ page: 5, pageCount: 8, isEstimate: true });
    });
  });
});
