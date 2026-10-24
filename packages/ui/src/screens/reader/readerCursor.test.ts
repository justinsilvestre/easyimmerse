import type { LookupCursor } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import {
  highlightOfCursor,
  type ReaderCursor,
  readerCursorOf,
} from "./readerCursor.ts";

const location = { chapterIndex: 1, paragraphIndex: 2, offset: 3 };

const chosen = (source: LookupCursor["chosen"]["source"]) => ({
  word: { term: "猫が", query: null },
  source,
  occurrence: null,
  anchor: null,
});

const cursorWith = (source: LookupCursor["chosen"]["source"]): LookupCursor => {
  const word = chosen(source);
  return { chosen: word, input: "keyboard", pointed: word };
};

const textSource = {
  kind: "text",
  sentence: "猫が寝る。",
  location,
  isUnspaced: true,
} as const;

describe("readerCursorOf", () => {
  describe("for a cursor in a book's text", () => {
    it("maps the cursor to its location, input, term and script", () => {
      expect(readerCursorOf(cursorWith(textSource), undefined)).toEqual({
        location,
        input: "keyboard",
        term: "猫が",
        isUnspaced: true,
      });
    });

    it("leaves out the matched length while it is unset", () => {
      const result = readerCursorOf(cursorWith(textSource), undefined);
      expect(result && "matchedLength" in result).toBe(false);
    });

    it("carries a matched length that is a number", () => {
      expect(readerCursorOf(cursorWith(textSource), 2)?.matchedLength).toBe(2);
    });

    it("carries a matched length that is null", () => {
      const result = readerCursorOf(cursorWith(textSource), null);
      expect(result && "matchedLength" in result).toBe(true);
    });
  });

  describe("for a cursor on a subtitle cue", () => {
    it("returns null", () => {
      const cue = {
        kind: "cue",
        cue: {},
      } as unknown as LookupCursor["chosen"]["source"];
      expect(readerCursorOf(cursorWith(cue), undefined)).toBeNull();
    });
  });

  describe("without a cursor", () => {
    it("returns null", () => {
      expect(readerCursorOf(null, undefined)).toBeNull();
    });
  });
});

describe("highlightOfCursor", () => {
  const cursor: ReaderCursor = {
    location,
    input: "keyboard",
    term: "猫が",
    isUnspaced: true,
    matchedLength: 1,
  };

  it("returns the word and the matched length to highlight", () => {
    expect(highlightOfCursor(cursor)).toEqual({
      word: { text: "猫が", location, isUnspaced: true },
      matchedLength: 1,
    });
  });
});
