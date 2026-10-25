import type { ChosenWord } from "@easyimmerse/state";
import type { LibrarySegment, LibraryText } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  librarySpanOf,
  libraryWordPlaceOf,
  libraryWordPlaceShown,
  storedWordAtPlace,
  withLibraryWord,
  withoutLibraryWord,
} from "./libraryWordEdits.ts";

const entry = (term: string) => ({
  term,
  reading: null,
  l1_definition: term,
  l2_definition: "",
});

const segment: LibrarySegment = {
  index: 3,
  chapter_index: null,
  start_ms: 0,
  end_ms: 1000,
  screenshot_at_ms: null,
  text: "Der Hund schläft.",
  translation: null,
  words: [{ start: 4, end: 8, entry: entry("Hund") }],
};

const text: LibraryText = { segments: [segment], chapter_titles: [] };

/** A word of the segment's cue, chosen at its offset. */
const chosen = (term: string, start: number): ChosenWord => ({
  word: { term, query: null },
  source: {
    kind: "cue",
    cue: { index: 3, start_ms: 0, end_ms: 1000, text: segment.text },
  },
  occurrence: { passage: "3", start },
  anchor: null,
});

describe("libraryWordPlaceOf", () => {
  it("takes a clicked word written with spaces whole", () => {
    expect(libraryWordPlaceOf(text, chosen("schläft", 9))).toEqual({
      segmentIndex: 3,
      start: 9,
      end: 16,
    });
  });

  it("leaves the end of a clicked run of Japanese to the entry", () => {
    expect(libraryWordPlaceOf(text, chosen("猫が寝る", 0))?.end).toBeNull();
  });

  it("takes selected text as far as it was selected", () => {
    expect(libraryWordPlaceOf(text, chosen("Der Hund", 0), 8)?.end).toBe(8);
  });

  it("finds no place for a word outside the item's segments", () => {
    const elsewhere = { ...chosen("Hund", 4), source: null };
    expect(libraryWordPlaceOf(text, elsewhere)).toBeNull();
  });
});

describe("libraryWordPlaceShown", () => {
  const selected = { segmentIndex: 3, start: 0, end: 8 };

  it("keeps the selected text while the pop-up shows it", () => {
    expect(
      libraryWordPlaceShown(text, chosen("Der Hund", 0), selected),
    ).toEqual(selected);
  });

  it("keeps the selected text while the pop-up shows a word typed into its field", () => {
    const typed = { ...chosen("Hund", 0), occurrence: null };
    expect(libraryWordPlaceShown(text, typed, selected)).toEqual(selected);
  });

  it("takes the word the pop-up moved to", () => {
    expect(libraryWordPlaceShown(text, chosen("schläft", 9), selected)).toEqual(
      { segmentIndex: 3, start: 9, end: 16 },
    );
  });

  it("is null while the pop-up shows no word", () => {
    expect(libraryWordPlaceShown(text, null, selected)).toBeNull();
  });
});

describe("librarySpanOf", () => {
  const place = { segmentIndex: 0, start: 0, end: null };

  it("keeps the end of a place that has one", () => {
    expect(librarySpanOf("猫が寝る", { ...place, end: 2 }, "猫が寝る")).toEqual(
      { start: 0, end: 2 },
    );
  });

  it("goes as far as the entry's lookup matched", () => {
    expect(librarySpanOf("猫が寝る", place, "猫")).toEqual({
      start: 0,
      end: 1,
    });
  });

  it("takes the clicked character when the match lies elsewhere", () => {
    expect(librarySpanOf("猫が寝る", place, "寝る")).toEqual({
      start: 0,
      end: 1,
    });
  });
});

describe("storedWordAtPlace", () => {
  it("finds the stored word that selected text overlaps", () => {
    expect(
      storedWordAtPlace(segment, { segmentIndex: 3, start: 0, end: 5 })?.start,
    ).toBe(4);
  });

  it("finds none beside the stored words", () => {
    expect(
      storedWordAtPlace(segment, { segmentIndex: 3, start: 9, end: 16 }),
    ).toBeNull();
  });
});

describe("withLibraryWord", () => {
  it("puts a new word among the others in order", () => {
    expect(
      withLibraryWord(segment.words, { start: 0, end: 3 }, entry("der")).map(
        ({ start }) => start,
      ),
    ).toEqual([0, 4]);
  });

  it("replaces the words the new one overlaps", () => {
    expect(
      withLibraryWord(segment.words, { start: 0, end: 8 }, entry("Hund")),
    ).toEqual([{ start: 0, end: 8, entry: entry("Hund") }]);
  });
});

describe("withoutLibraryWord", () => {
  it("removes the word that begins at the offset", () => {
    expect(withoutLibraryWord(segment.words, 4)).toEqual([]);
  });
});
