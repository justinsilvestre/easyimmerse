import type { FlashcardContent } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { cardSidesOf } from "./cardSidesOf.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { fieldsOfPreset, frontFieldsOfPreset } from "./flashcardPresets.ts";

/** The example flashcard as an ebook gives it: without audio or a screenshot. */
const ebookFlashcard: FlashcardContent = {
  ...exampleFlashcard,
  audio_context: null,
  screenshot: null,
};

function intermediateSidesOf(content: FlashcardContent) {
  return cardSidesOf(
    content,
    fieldsOfPreset("intermediate"),
    frontFieldsOfPreset("intermediate"),
  );
}

describe("cardSidesOf", () => {
  describe("under the intermediate preset", () => {
    it("puts the audio and the screenshot on the front", () => {
      expect(intermediateSidesOf(exampleFlashcard).front).toEqual([
        "audio_context",
        "screenshot",
      ]);
    });

    it("puts the other included fields on the back, in the order of the form", () => {
      expect(intermediateSidesOf(exampleFlashcard).back).toEqual([
        "word",
        "l1_definition",
        "text_context",
        "text_context_translation",
        "tags",
      ]);
    });
  });

  it("orders the front fields as the form does", () => {
    expect(
      cardSidesOf(exampleFlashcard, fieldsOfPreset("advanced"), [
        "screenshot",
        "text_context",
        "word",
      ]).front,
    ).toEqual(["word", "text_context", "screenshot"]);
  });

  it("leaves a front field that is not included off the card", () => {
    expect(
      cardSidesOf(
        exampleFlashcard,
        ["word", "screenshot"],
        ["audio_context", "screenshot"],
      ).front,
    ).toEqual(["screenshot"]);
  });

  it("never puts the tags on the front", () => {
    expect(
      cardSidesOf(exampleFlashcard, ["word", "tags"], ["word", "tags"]).front,
    ).toEqual(["word"]);
  });

  describe("when no front field has a value", () => {
    it("puts the word and the sentence on the front", () => {
      expect(intermediateSidesOf(ebookFlashcard).front).toEqual([
        "word",
        "text_context",
      ]);
    });

    it("leaves the word, the sentence and the empty front fields off the back", () => {
      expect(intermediateSidesOf(ebookFlashcard).back).toEqual([
        "l1_definition",
        "text_context_translation",
        "tags",
      ]);
    });

    it("counts a text field holding only spaces as having no value", () => {
      expect(
        cardSidesOf(
          { ...exampleFlashcard, l1_definition: "  " },
          ["word", "l1_definition"],
          ["l1_definition"],
        ).front,
      ).toEqual(["word"]);
    });

    it("falls back only to the word and the sentence that are included", () => {
      expect(
        cardSidesOf(
          ebookFlashcard,
          ["word", "audio_context"],
          ["audio_context"],
        ).front,
      ).toEqual(["word"]);
    });
  });

  describe("when no field is chosen for the front", () => {
    it("puts the word and the sentence on the front", () => {
      expect(
        cardSidesOf(exampleFlashcard, fieldsOfPreset("beginner"), []).front,
      ).toEqual(["word", "text_context"]);
    });

    it("leaves the word and the sentence off the back", () => {
      expect(
        cardSidesOf(exampleFlashcard, ["word", "text_context", "tags"], [])
          .back,
      ).toEqual(["tags"]);
    });
  });
});
