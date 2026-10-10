import { describe, expect, it } from "vitest";
import { exampleNewFlashcard } from "./exampleFlashcards.ts";
import { flashcardActions } from "./flashcardActions.ts";

describe("flashcardActions", () => {
  it("carry the flashcard id the dispatcher made", () => {
    const started = flashcardActions.flashcardStarted(
      exampleNewFlashcard("0123456789abcdef0123456789abcdef", "Katze"),
      "save",
    );
    expect(started.flashcard.id).toBe("0123456789abcdef0123456789abcdef");
  });
});
