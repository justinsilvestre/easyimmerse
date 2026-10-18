import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import {
  alignedReaderCache,
  chosenTextWord,
  readingWith,
  spokenSegment,
} from "./readerTestSupport.ts";
import { selectReaderCurrentSentence } from "./selectReaderCurrentSentence.ts";

const wordPlace = { chapterIndex: 0, paragraphIndex: 0, offset: 4 };
const rect = { top: 10, bottom: 30, left: 40, right: 80 };
const pointed = actions.lookupCursorMoved(
  chosenTextWord(wordPlace, rect),
  "mouse",
);
const spokenPlace = { chapterIndex: 0, paragraphIndex: 1, offset: 0 };
const speaking = actions.playerTimeChanged(spokenSegment.start_ms / 1000);

describe("selectReaderCurrentSentence", () => {
  it("returns null on a book just opened", () => {
    expect(selectReaderCurrentSentence(readingWith(alignedReaderCache))).toBe(
      null,
    );
  });

  it("returns the place of the word under the lookup cursor", () => {
    const root = readingWith(alignedReaderCache, pointed);
    expect(selectReaderCurrentSentence(root)?.location).toEqual(wordPlace);
  });

  it("returns where the word under the lookup cursor is drawn", () => {
    const root = readingWith(alignedReaderCache, pointed);
    expect(selectReaderCurrentSentence(root)?.anchor).toEqual(rect);
  });

  it("returns the start of the sentence being spoken", () => {
    const root = readingWith(alignedReaderCache, speaking);
    expect(selectReaderCurrentSentence(root)).toEqual({
      location: spokenPlace,
      anchor: null,
    });
  });

  it("prefers the pointed word's sentence to the spoken one", () => {
    const root = readingWith(alignedReaderCache, speaking, pointed);
    expect(selectReaderCurrentSentence(root)?.location).toEqual(wordPlace);
  });

  it("returns null once the mouse leaves the words and nothing is spoken", () => {
    const root = readingWith(
      alignedReaderCache,
      pointed,
      actions.lookupCursorLeft("mouse"),
    );
    expect(selectReaderCurrentSentence(root)).toBeNull();
  });
});
