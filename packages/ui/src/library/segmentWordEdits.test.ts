import type { LibrarySegment } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleLibraryVideoText } from "./exampleLibrary.ts";
import {
  addWord,
  blankEntry,
  isWithoutDefinition,
  mergeWithNext,
  splitWord,
} from "./segmentWordEdits.ts";

const [first] = exampleLibraryVideoText.segments as [
  LibrarySegment,
  LibrarySegment,
  LibrarySegment,
];

const spans = (words: readonly { start: number; end: number }[]) =>
  words.map(({ start, end }) => [start, end]);

describe("splitWord", () => {
  it("splits a word into two at an offset inside it", () => {
    expect(spans(splitWord(first, 1, 6))).toEqual([
      [0, 3],
      [4, 6],
      [6, 8],
      [9, 16],
    ]);
  });

  it("gives each half an entry for its own text", () => {
    expect(splitWord(first, 1, 6)[2]?.entry).toEqual(blankEntry("nd"));
  });

  it("leaves the words as they are for an offset at the word's edge", () => {
    expect(splitWord(first, 1, 4)).toBe(first.words);
  });
});

describe("mergeWithNext", () => {
  it("joins a word with the one after it", () => {
    expect(spans(mergeWithNext(first, 0))).toEqual([
      [0, 8],
      [9, 16],
    ]);
  });

  it("gives the joined word an entry for its whole text", () => {
    expect(mergeWithNext(first, 0)[0]?.entry.term).toBe("Der Hund");
  });

  it("leaves the last word as it is", () => {
    expect(mergeWithNext(first, 2)).toBe(first.words);
  });
});

describe("addWord", () => {
  it("puts a new word in order among the others", () => {
    const segment = {
      ...first,
      words: [first.words[0], first.words[2]],
    } as LibrarySegment;
    expect(spans(addWord(segment, 4, 8))).toEqual([
      [0, 3],
      [4, 8],
      [9, 16],
    ]);
  });
});

describe("isWithoutDefinition", () => {
  it("tells a word whose definitions are both empty", () => {
    expect(
      isWithoutDefinition({ start: 0, end: 1, entry: blankEntry("x") }),
    ).toBe(true);
  });

  it("tells a defined word apart", () => {
    const entry = { ...blankEntry("x"), l2_definition: "ein x" };
    expect(isWithoutDefinition({ start: 0, end: 1, entry })).toBe(false);
  });
});
