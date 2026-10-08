import { describe, expect, it } from "vitest";
import { splitIntoWords } from "./ClickableText.tsx";
import type { TextStep } from "./cursorKeys.ts";
import { type MatchedLengthAt, stepTextCursor } from "./textCursorStep.ts";

const wordForward: TextStep = { direction: "forward", unit: "word" };
const wordBackward: TextStep = { direction: "backward", unit: "word" };
const characterForward: TextStep = { direction: "forward", unit: "character" };
const characterBackward: TextStep = {
  direction: "backward",
  unit: "character",
};

const noLookups: MatchedLengthAt = () => null;

/** Lookups that match the given lengths from the given offsets, and nothing elsewhere. */
const lookupsMatching =
  (lengths: Record<number, number>): MatchedLengthAt =>
  (offset) =>
    Promise.resolve(lengths[offset] ?? null);

/** The offsets of 映画 / を / 見る / よ, as a dictionary would cut 映画を見るよ. */
const movieSentenceLengths = { 0: 2, 2: 1, 3: 2, 5: 1 };

describe("stepTextCursor", () => {
  describe("by character in a run of Thai", () => {
    it("steps over a vowel sign to the next letter", () => {
      expect(
        stepTextCursor(
          splitIntoWords("กินข้าว"),
          { start: 0 },
          characterForward,
          noLookups,
        ),
      ).toBe(2);
    });
  });

  describe("by character in a run that begins with digits", () => {
    it("steps over the digits at once", () => {
      expect(
        stepTextCursor(
          splitIntoWords("2026年"),
          { start: 0 },
          characterForward,
          noLookups,
        ),
      ).toBe(4);
    });
  });

  describe("by word in a language written with spaces", () => {
    it("moves forward to the next word", () => {
      expect(
        stepTextCursor(
          splitIntoWords("Ich rufe an."),
          { start: 0 },
          wordForward,
          noLookups,
        ),
      ).toBe(4);
    });

    it("moves backward to the previous word", () => {
      expect(
        stepTextCursor(
          splitIntoWords("Ich rufe an."),
          { start: 9 },
          wordBackward,
          noLookups,
        ),
      ).toBe(4);
    });

    it("moves forward to the next word even when the lookup matched a phrase", () => {
      expect(
        stepTextCursor(
          splitIntoWords("Ich rufe dich an."),
          { start: 4, matchedLength: 12 },
          wordForward,
          noLookups,
        ),
      ).toBe(9);
    });

    it("stays at the last word", () => {
      expect(
        stepTextCursor(
          splitIntoWords("Ich rufe an."),
          { start: 9 },
          wordForward,
          noLookups,
        ),
      ).toBe(9);
    });

    it("stays at the first word", () => {
      expect(
        stepTextCursor(
          splitIntoWords("Ich rufe an."),
          { start: 0 },
          wordBackward,
          noLookups,
        ),
      ).toBe(0);
    });
  });

  describe("by word in a run written without spaces", () => {
    it("moves forward past the text the lookup matched", () => {
      expect(
        stepTextCursor(
          splitIntoWords("映画を見る"),
          { start: 0, matchedLength: 2 },
          wordForward,
          noLookups,
        ),
      ).toBe(2);
    });

    it("moves forward one character while the lookup has not answered", () => {
      expect(
        stepTextCursor(
          splitIntoWords("映画を見る"),
          { start: 0 },
          wordForward,
          noLookups,
        ),
      ).toBe(1);
    });

    it("moves forward one character when the lookup matched nothing", () => {
      expect(
        stepTextCursor(
          splitIntoWords("映画を見る"),
          { start: 0, matchedLength: null },
          wordForward,
          noLookups,
        ),
      ).toBe(1);
    });

    it("moves forward to the next word past a match that ends the run", () => {
      expect(
        stepTextCursor(
          splitIntoWords("見る、Netflix"),
          { start: 0, matchedLength: 2 },
          wordForward,
          noLookups,
        ),
      ).toBe(3);
    });

    it("stays when the match reaches the end of the text", () => {
      expect(
        stepTextCursor(
          splitIntoWords("映画"),
          { start: 0, matchedLength: 2 },
          wordForward,
          noLookups,
        ),
      ).toBe(0);
    });

    it("moves backward to the start of the word before the cursor", async () => {
      expect(
        await stepTextCursor(
          splitIntoWords("映画を見るよ"),
          { start: 5 },
          wordBackward,
          lookupsMatching(movieSentenceLengths),
        ),
      ).toBe(3);
    });

    it("moves backward to the start of the word the cursor lies inside", async () => {
      expect(
        await stepTextCursor(
          splitIntoWords("映画を見るよ"),
          { start: 1 },
          wordBackward,
          lookupsMatching(movieSentenceLengths),
        ),
      ).toBe(0);
    });

    it("moves backward one character where the lookups match nothing", async () => {
      expect(
        await stepTextCursor(
          splitIntoWords("映画を見るよ"),
          { start: 5 },
          wordBackward,
          lookupsMatching({}),
        ),
      ).toBe(4);
    });

    it("moves backward one character at once when nothing is looked up", () => {
      expect(
        stepTextCursor(
          splitIntoWords("映画を見るよ"),
          { start: 5 },
          wordBackward,
          noLookups,
        ),
      ).toBe(4);
    });

    it("moves backward from the start of a run into the run before it", async () => {
      expect(
        await stepTextCursor(
          splitIntoWords("映画を、見る"),
          { start: 4 },
          wordBackward,
          lookupsMatching({ 0: 1, 1: 2 }),
        ),
      ).toBe(1);
    });
  });

  describe("by character", () => {
    it("moves forward one character within a run", () => {
      expect(
        stepTextCursor(
          splitIntoWords("映画を見る"),
          { start: 2, matchedLength: 3 },
          characterForward,
          noLookups,
        ),
      ).toBe(3);
    });

    it("moves backward one character within a run", () => {
      expect(
        stepTextCursor(
          splitIntoWords("映画を見る"),
          { start: 3 },
          characterBackward,
          lookupsMatching(movieSentenceLengths),
        ),
      ).toBe(2);
    });

    it("steps over a character outside the Basic Multilingual Plane whole", () => {
      expect(
        stepTextCursor(
          splitIntoWords("𠮷野家"),
          { start: 0 },
          characterForward,
          noLookups,
        ),
      ).toBe(2);
    });

    it("moves from the end of a run to the next word", () => {
      expect(
        stepTextCursor(
          splitIntoWords("見る、Netflix"),
          { start: 1 },
          characterForward,
          noLookups,
        ),
      ).toBe(3);
    });

    it("skips punctuation, which holds nothing to look up", () => {
      expect(
        stepTextCursor(
          splitIntoWords("見る。今日"),
          { start: 3 },
          characterBackward,
          noLookups,
        ),
      ).toBe(1);
    });

    it("moves a whole word in a language written with spaces", () => {
      expect(
        stepTextCursor(
          splitIntoWords("Ich rufe an."),
          { start: 0 },
          characterForward,
          noLookups,
        ),
      ).toBe(4);
    });
  });
});
