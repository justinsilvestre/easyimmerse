import { describe, expect, it } from "vitest";
import {
  locationAtSectionEdge,
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

describe("locationAtSectionEdge", () => {
  const paragraphs = ["ab", "cde", "fghi"];

  it("finds the start of the section's first paragraph", () => {
    expect(
      locationAtSectionEdge(3, paragraphs, { start: 1, end: 3 }, "start"),
    ).toEqual({ chapterIndex: 3, paragraphIndex: 1, offset: 0 });
  });

  it("finds the end of the section's last paragraph", () => {
    expect(
      locationAtSectionEdge(3, paragraphs, { start: 0, end: 2 }, "end"),
    ).toEqual({ chapterIndex: 3, paragraphIndex: 1, offset: 3 });
  });

  it("finds the start of an empty section for either edge", () => {
    expect(locationAtSectionEdge(3, [], { start: 0, end: 0 }, "end")).toEqual({
      chapterIndex: 3,
      paragraphIndex: 0,
      offset: 0,
    });
  });
});
