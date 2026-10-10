import { describe, expect, it } from "vitest";
import { flashcardNotices } from "./flashcardNotices.ts";

describe("flashcardNotices", () => {
  it("names the word of a saved flashcard", () => {
    expect(
      flashcardNotices.savedWithUndo("f1", "Hund", () => undefined).message,
    ).toBe("Saved the flashcard for “Hund”.");
  });

  it("says that a saved flashcard has no word when its word is empty", () => {
    expect(
      flashcardNotices.savedWithUndo("f1", "", () => undefined).message,
    ).toBe("Saved a flashcard without a word.");
  });
});
