import { describe, expect, it } from "vitest";
import { readerWordAt } from "./readerWordAt.ts";

const location = (offset: number) => ({
  chapterIndex: 2,
  paragraphIndex: 3,
  offset,
});

const paragraph = "The cat sleeps. The dog eats.";

describe("readerWordAt", () => {
  describe("at the start of a spaced word", () => {
    it("returns the whole word", () => {
      expect(readerWordAt(paragraph, location(16), "en")?.text).toBe("The");
    });

    it("returns the sentence of the word", () => {
      expect(readerWordAt(paragraph, location(20), "en")?.sentence).toBe(
        "The dog eats.",
      );
    });

    it("returns the lookup text from the word onwards", () => {
      expect(readerWordAt(paragraph, location(20), "en")?.lookup).toEqual({
        text: "dog eats.",
        context: "The dog eats.",
        offset: 4,
      });
    });

    it("returns a word that is not unspaced", () => {
      expect(readerWordAt(paragraph, location(4), "en")?.isUnspaced).toBe(
        false,
      );
    });
  });

  describe("inside a spaced word", () => {
    it("returns the location of the word's start", () => {
      expect(readerWordAt(paragraph, location(10), "en")?.location).toEqual(
        location(8),
      );
    });

    it("returns the whole word", () => {
      expect(readerWordAt(paragraph, location(10), "en")?.text).toBe("sleeps");
    });
  });

  describe("in a run written without spaces", () => {
    const japanese = "映画を見るよ。";

    it("returns the rest of the run from the character", () => {
      expect(readerWordAt(japanese, location(4), "ja")?.text).toBe("る");
    });

    it("returns the location of the character", () => {
      expect(readerWordAt(japanese, location(4), "ja")?.location).toEqual(
        location(4),
      );
    });

    it("marks the word as unspaced", () => {
      expect(readerWordAt(japanese, location(4), "ja")?.isUnspaced).toBe(true);
    });
  });

  describe("on punctuation", () => {
    it("returns null", () => {
      expect(readerWordAt(paragraph, location(15), "en")).toBeNull();
    });
  });
});
