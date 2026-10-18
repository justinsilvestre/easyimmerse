import { describe, expect, it } from "vitest";
import { flashcardNotices } from "./flashcardNotices.ts";

const undoOf = (word: string) => ({
  projectId: "p1",
  flashcardId: "f1",
  word,
  before: null,
});

describe("flashcardNotices", () => {
  it("names the word of a saved flashcard", () => {
    expect(flashcardNotices.savedWithUndo(undoOf("Hund")).message).toBe(
      "Saved the flashcard for “Hund”.",
    );
  });

  it("says that a saved flashcard has no word when its word is empty", () => {
    expect(flashcardNotices.savedWithUndo(undoOf("")).message).toBe(
      "Saved a flashcard without a word.",
    );
  });
});
