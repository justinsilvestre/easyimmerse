import { describe, expect, it } from "vitest";
import type { EditorAction } from "./editFlashcard.ts";
import { exampleNewFlashcard } from "./exampleFlashcards.ts";
import { editCard, newCard } from "./flashcardCard.ts";
import { draftOfCard } from "./flashcardDrafts.ts";

/** The draft of the example card for "Katze", taken from offset 4 of its sentence, after an edit. */
const draftAfter = (action: EditorAction) =>
  draftOfCard(editCard(newCard(exampleNewFlashcard("f1", "Katze")), action));

describe("draftOfCard", () => {
  it("keeps where the word was taken from while the word is unchanged", () => {
    expect(
      draftAfter({ type: "textChanged", key: "l1_definition", value: "cat" })
        .word_start,
    ).toBe(4);
  });

  it("keeps where the word was taken from when the changed word is still there", () => {
    expect(
      draftAfter({ type: "textChanged", key: "word", value: "Kat" }).word_start,
    ).toBe(4);
  });

  it("drops where the word was taken from once the word is changed to one not there", () => {
    expect(
      draftAfter({ type: "textChanged", key: "word", value: "Kater" })
        .word_start,
    ).toBeNull();
  });
});
