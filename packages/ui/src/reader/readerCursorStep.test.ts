import type { ReaderCursorStep, ReaderLocation } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import {
  type ChapterText,
  firstWordFrom,
  lastWordIn,
  type MatchedLengthAtLocation,
  stepReaderCursor,
} from "./readerCursorStep.ts";

const wordForward: ReaderCursorStep = { direction: "forward", unit: "word" };
const wordBackward: ReaderCursorStep = { direction: "backward", unit: "word" };
const characterForward: ReaderCursorStep = {
  direction: "forward",
  unit: "character",
};
const sentenceForward: ReaderCursorStep = {
  direction: "forward",
  unit: "sentence",
};
const sentenceBackward: ReaderCursorStep = {
  direction: "backward",
  unit: "sentence",
};

const noLookups: MatchedLengthAtLocation = () => null;

/** Lookups that match the given lengths from the given offsets, and nothing elsewhere. */
const lookupsMatching =
  (lengths: Record<number, number>): MatchedLengthAtLocation =>
  (location) =>
    Promise.resolve(lengths[location.offset] ?? null);

/** The offsets of 映画 / を / 見る / よ, as a dictionary would cut 映画を見るよ。明日も見る。 */
const movieLengths = { 0: 2, 2: 1, 3: 2, 5: 1, 7: 2, 9: 1, 10: 2 };

const location = (paragraphIndex: number, offset: number): ReaderLocation => ({
  chapterIndex: 0,
  paragraphIndex,
  offset,
});

const englishText = (section = { start: 0, end: 2 }): ChapterText => ({
  chapterIndex: 0,
  paragraphs: ["The cat sleeps. The dog eats.", "It is quiet."],
  section,
  language: "en",
});

const japaneseText: ChapterText = {
  chapterIndex: 0,
  paragraphs: ["映画を見るよ。明日も見る。"],
  section: { start: 0, end: 1 },
  language: "ja",
};

const stepEnglish = async (
  at: ReaderLocation,
  step: ReaderCursorStep,
  section?: { start: number; end: number },
) =>
  await stepReaderCursor(
    englishText(section),
    { location: at },
    step,
    noLookups,
  );

describe("stepReaderCursor", () => {
  describe("by word in English", () => {
    it("moves forward to the next word of the paragraph", async () => {
      expect(await stepEnglish(location(0, 0), wordForward)).toEqual(
        location(0, 4),
      );
    });

    it("moves backward to the previous word of the paragraph", async () => {
      expect(await stepEnglish(location(0, 8), wordBackward)).toEqual(
        location(0, 4),
      );
    });

    it("moves forward from the last word of a paragraph to the first word of the next", async () => {
      expect(await stepEnglish(location(0, 24), wordForward)).toEqual(
        location(1, 0),
      );
    });

    it("moves backward from the first word of a paragraph to the last word of the previous", async () => {
      expect(await stepEnglish(location(1, 0), wordBackward)).toEqual(
        location(0, 24),
      );
    });

    it("returns null forward from the last word of the section", async () => {
      expect(await stepEnglish(location(1, 6), wordForward)).toBeNull();
    });

    it("returns null backward from the first word of the section", async () => {
      expect(await stepEnglish(location(0, 0), wordBackward)).toBeNull();
    });
  });

  describe("by word in a section covering only some paragraphs", () => {
    it("returns null forward from the last word of the section", async () => {
      expect(
        await stepEnglish(location(0, 24), wordForward, { start: 0, end: 1 }),
      ).toBeNull();
    });

    it("returns null backward from the first word of the section", async () => {
      expect(
        await stepEnglish(location(1, 0), wordBackward, { start: 1, end: 2 }),
      ).toBeNull();
    });
  });

  describe("into a paragraph without words", () => {
    const text: ChapterText = {
      chapterIndex: 0,
      paragraphs: ["One.", "***", "Two."],
      section: { start: 0, end: 3 },
      language: "en",
    };

    it("passes over it going forward", async () => {
      expect(
        await stepReaderCursor(
          text,
          { location: location(0, 0) },
          wordForward,
          noLookups,
        ),
      ).toEqual(location(2, 0));
    });

    it("passes over it going backward", async () => {
      expect(
        await stepReaderCursor(
          text,
          { location: location(2, 0) },
          wordBackward,
          noLookups,
        ),
      ).toEqual(location(0, 0));
    });
  });

  describe("by word in Japanese", () => {
    const stepJapanese = async (
      cursor: { location: ReaderLocation; matchedLength?: number | null },
      step: ReaderCursorStep,
      lookups: MatchedLengthAtLocation = noLookups,
    ) => await stepReaderCursor(japaneseText, cursor, step, lookups);

    it("moves forward past the matched length", async () => {
      expect(
        await stepJapanese(
          { location: location(0, 3), matchedLength: 2 },
          wordForward,
        ),
      ).toEqual(location(0, 5));
    });

    it("moves forward by one character without a matched length", async () => {
      expect(
        await stepJapanese({ location: location(0, 3) }, wordForward),
      ).toEqual(location(0, 4));
    });

    it("moves forward by one character in a Shift step despite the matched length", async () => {
      expect(
        await stepJapanese(
          { location: location(0, 3), matchedLength: 2 },
          characterForward,
        ),
      ).toEqual(location(0, 4));
    });

    it("moves backward to the start of the previous word through the lookups", async () => {
      expect(
        await stepJapanese(
          { location: location(0, 5) },
          wordBackward,
          lookupsMatching(movieLengths),
        ),
      ).toEqual(location(0, 3));
    });
  });

  describe("by sentence", () => {
    it("moves forward to the first word of the next sentence in the paragraph", async () => {
      expect(await stepEnglish(location(0, 4), sentenceForward)).toEqual(
        location(0, 16),
      );
    });

    it("moves forward from the last sentence of a paragraph to the first word of the next paragraph", async () => {
      expect(await stepEnglish(location(0, 20), sentenceForward)).toEqual(
        location(1, 0),
      );
    });

    it("moves backward to the first word of the previous sentence", async () => {
      expect(await stepEnglish(location(0, 20), sentenceBackward)).toEqual(
        location(0, 0),
      );
    });

    it("moves backward from the first sentence of a paragraph to the first word of the last sentence of the previous paragraph", async () => {
      expect(await stepEnglish(location(1, 3), sentenceBackward)).toEqual(
        location(0, 16),
      );
    });

    it("returns null forward from the last sentence of the section", async () => {
      expect(await stepEnglish(location(1, 0), sentenceForward)).toBeNull();
    });

    it("returns null backward from the first sentence of the section", async () => {
      expect(await stepEnglish(location(0, 4), sentenceBackward)).toBeNull();
    });
  });
});

describe("firstWordFrom", () => {
  it("returns the word at a location that begins a word", () => {
    expect(firstWordFrom(englishText(), location(0, 4))).toEqual(
      location(0, 4),
    );
  });

  it("returns the next word from a location on a space", () => {
    expect(firstWordFrom(englishText(), location(0, 3))).toEqual(
      location(0, 4),
    );
  });

  it("crosses into the next paragraph from the end of a paragraph", () => {
    expect(firstWordFrom(englishText(), location(0, 29))).toEqual(
      location(1, 0),
    );
  });

  it("returns null past the end of the section", () => {
    expect(firstWordFrom(englishText(), location(1, 12))).toBeNull();
  });
});

describe("lastWordIn", () => {
  it("returns the last word of the last paragraph of the section", async () => {
    expect(await lastWordIn(englishText(), noLookups)).toEqual(location(1, 6));
  });

  it("returns the start of the last word of a Japanese paragraph through the lookups", async () => {
    expect(
      await lastWordIn(japaneseText, lookupsMatching(movieLengths)),
    ).toEqual(location(0, 10));
  });
});
