import type { FlashcardDraft } from "@easyimmerse/types";
import {
  createCardSession,
  reduceEditedFlashcard,
} from "../editedFlashcard.ts";
import { exampleFlashcard } from "../exampleFlashcard.ts";
import { createUnsavedCard, type UnsavedCard } from "./unsavedCard.ts";

/**
 * A new card for `word` that could not be saved, for tests and stories.
 * Its flashcard id is the word unless given; its project is p1 and its media file m1 unless given, or null for none.
 */
export function exampleUnsavedCard(
  word: string,
  {
    flashcardId = word,
    projectId = "p1",
    mediaFileId = "m1",
    isRejected = false,
  }: {
    flashcardId?: string;
    projectId?: string;
    mediaFileId?: string | null;
    isRejected?: boolean;
  } = {},
): UnsavedCard {
  const draft: FlashcardDraft = {
    media_file_id: mediaFileId,
    cue_index: 1,
    content: { ...exampleFlashcard, word },
    included_fields: ["word"],
  };
  const card = reduceEditedFlashcard(null, {
    type: "started",
    draft,
    flashcardId,
    session: createCardSession(),
  });
  if (card === null) throw new Error("The card did not start.");
  return createUnsavedCard(card, projectId, { isRejected });
}
