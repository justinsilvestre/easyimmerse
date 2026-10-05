import type { FlashcardDraft } from "@easyimmerse/types";
import {
  createCardSession,
  createFlashcardId,
  reduceEditedFlashcard,
} from "../editedFlashcard.ts";
import { exampleFlashcard } from "../exampleFlashcard.ts";
import type { UnsavedCard } from "./unsavedCardStore.ts";

/** A new card for `word` that could not be saved, listed under the word as its flashcard id, for tests and stories. */
export function exampleUnsavedCard(
  word: string,
  overrides: Partial<UnsavedCard> = {},
): UnsavedCard {
  const draft: FlashcardDraft = {
    media_file_id: "m1",
    cue_index: 1,
    content: { ...exampleFlashcard, word },
    included_fields: ["word"],
  };
  const card = reduceEditedFlashcard(null, {
    type: "started",
    draft,
    flashcardId: createFlashcardId(),
    session: createCardSession(),
  });
  if (card === null) throw new Error("The card did not start.");
  return {
    flashcardId: word,
    card,
    projectId: "p1",
    mediaFileId: "m1",
    isRejected: false,
    retry: () => undefined,
    discard: () => undefined,
    ...overrides,
  };
}
