import type { FlashcardDraft } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  createCardSession,
  createFlashcardId,
  type EditedFlashcard,
  reduceEditedFlashcard,
} from "./editedFlashcard.ts";
import type { EditorAction } from "./editFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { draftOfEdited } from "./flashcardDrafts.ts";

function createDraft(): FlashcardDraft {
  return {
    media_file_id: "m1",
    cue_index: 1,
    word_start: 4,
    content: { ...exampleFlashcard, word: "Katze" },
    included_fields: ["word"],
  };
}

function startedThenEdited(action: EditorAction): EditedFlashcard {
  const started = reduceEditedFlashcard(null, {
    type: "started",
    draft: createDraft(),
    flashcardId: createFlashcardId(),
    session: createCardSession(),
  });
  const edited = reduceEditedFlashcard(started, { type: "edited", action });
  if (edited === null) throw new Error("The flashcard did not open.");
  return edited;
}

describe("draftOfEdited", () => {
  it("keeps where the word was taken from while the word is unchanged", () => {
    const card = startedThenEdited({
      type: "textChanged",
      key: "l1_definition",
      value: "cat",
    });
    expect(draftOfEdited(card).word_start).toBe(4);
  });

  it("drops where the word was taken from once the word is changed", () => {
    const card = startedThenEdited({
      type: "textChanged",
      key: "word",
      value: "Kater",
    });
    expect(draftOfEdited(card).word_start).toBeNull();
  });
});
