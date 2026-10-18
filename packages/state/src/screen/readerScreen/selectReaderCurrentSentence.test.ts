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
const lookedUp = actions.lookupWordClicked(
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

  it("returns the place of the word the dictionary pop-up shows", () => {
    const root = readingWith(alignedReaderCache, lookedUp);
    expect(selectReaderCurrentSentence(root)?.location).toEqual(wordPlace);
  });

  it("returns where the word the dictionary pop-up shows is drawn", () => {
    const root = readingWith(alignedReaderCache, lookedUp);
    expect(selectReaderCurrentSentence(root)?.anchor).toEqual(rect);
  });

  it("returns the start of the sentence being spoken", () => {
    const root = readingWith(alignedReaderCache, speaking);
    expect(selectReaderCurrentSentence(root)).toEqual({
      location: spokenPlace,
      anchor: null,
    });
  });

  it("prefers the looked-up word's sentence to the spoken one", () => {
    const root = readingWith(alignedReaderCache, speaking, lookedUp);
    expect(selectReaderCurrentSentence(root)?.location).toEqual(wordPlace);
  });

  it("prefers the sentence whose translation is shown", () => {
    const shownPlace = { chapterIndex: 1, paragraphIndex: 0, offset: 2 };
    const root = readingWith(
      alignedReaderCache,
      lookedUp,
      actions.readerTranslationPopupOpened(shownPlace, null),
    );
    expect(selectReaderCurrentSentence(root)?.location).toEqual(shownPlace);
  });

  it("returns null once the dictionary pop-up closes and nothing is spoken", () => {
    const root = readingWith(
      alignedReaderCache,
      lookedUp,
      actions.lookupClosed(),
    );
    expect(selectReaderCurrentSentence(root)).toBeNull();
  });
});
