import type { LibraryText } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  exampleLibrarySegment,
  exampleLibraryVideoText,
} from "./exampleLibraryText.ts";
import {
  cuesOfLibraryText,
  documentOfLibraryText,
  libraryChaptersOf,
  libraryFlashcardPlaceOf,
  librarySegmentAt,
} from "./libraryText.ts";
import type { ChosenWord } from "./lookup/lookupState.ts";

/** A paragraph of a document item: a segment without times. */
const paragraph = (index: number, chapter: number | null, text: string) =>
  exampleLibrarySegment({
    index,
    chapter_index: chapter,
    start_ms: null,
    end_ms: null,
    screenshot_at_ms: null,
    text,
  });

const book: LibraryText = {
  segments: [
    paragraph(0, 0, "Eins."),
    paragraph(1, 1, "Zwei."),
    paragraph(2, 1, "Drei."),
  ],
  chapter_titles: ["Anfang", null],
};

const item = { title: "Zahlen" };

/** The word "Hund" chosen in the first cue of the example video, at the given offset. */
const chosenAt = (start: number): ChosenWord => ({
  word: { term: "Hund", query: null },
  source: {
    kind: "cue",
    cue: { index: 0, start_ms: 1000, end_ms: 3000, text: "" },
  },
  occurrence: { passage: "cue:0", start },
  anchor: null,
});

describe("cuesOfLibraryText", () => {
  it("makes a cue of each timed segment, indexed by the segment", () => {
    expect(cuesOfLibraryText(exampleLibraryVideoText).cues).toEqual([
      { index: 0, start_ms: 1000, end_ms: 3000, text: "Der Hund schläft." },
      { index: 1, start_ms: 4000, end_ms: 6000, text: "Er träumt." },
    ]);
  });

  it("makes a translation cue of each translated segment", () => {
    expect(cuesOfLibraryText(exampleLibraryVideoText).translationCues).toEqual([
      { index: 0, start_ms: 1000, end_ms: 3000, text: "The dog sleeps." },
    ]);
  });

  it("makes no cue of a segment without times", () => {
    expect(cuesOfLibraryText(book).cues).toEqual([]);
  });
});

describe("libraryChaptersOf", () => {
  it("groups the segments by the chapter each names, in order", () => {
    expect(
      libraryChaptersOf(book).map((segments) =>
        segments.map(({ index }) => index),
      ),
    ).toEqual([[0], [1, 2]]);
  });
});

describe("documentOfLibraryText", () => {
  it("puts each segment as a paragraph of its chapter, with the chapters' titles", () => {
    expect(documentOfLibraryText(book, item).chapters).toEqual([
      { title: "Anfang", paragraphs: ["Eins."] },
      { title: null, paragraphs: ["Zwei.", "Drei."] },
    ]);
  });

  it("puts segments that name no chapter in the first one", () => {
    const untitled = {
      segments: book.segments.map((segment) => ({
        ...segment,
        chapter_index: null,
      })),
      chapter_titles: [],
    };
    expect(documentOfLibraryText(untitled, item).chapters).toEqual([
      { title: null, paragraphs: ["Eins.", "Zwei.", "Drei."] },
    ]);
  });

  it("takes the item's title", () => {
    expect(documentOfLibraryText(book, item).title).toBe("Zahlen");
  });
});

describe("librarySegmentAt", () => {
  it("finds the segment that makes a paragraph of a chapter", () => {
    expect(
      librarySegmentAt(book, { chapterIndex: 1, paragraphIndex: 1 })?.index,
    ).toBe(2);
  });
});

describe("libraryFlashcardPlaceOf", () => {
  it("names the cue's segment and the chosen word's start", () => {
    expect(
      libraryFlashcardPlaceOf(exampleLibraryVideoText, chosenAt(4)),
    ).toEqual({
      segmentIndex: 0,
      wordStart: 4,
    });
  });

  it("names the whole segment when no word begins at the chosen place", () => {
    expect(
      libraryFlashcardPlaceOf(exampleLibraryVideoText, chosenAt(0))?.wordStart,
    ).toBeNull();
  });
});
