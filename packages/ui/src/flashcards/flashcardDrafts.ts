import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import type { EditedFlashcard } from "./editedFlashcard.ts";

/** What a saved flashcard holds, as the draft that would save it as it is. */
export function draftOfFlashcard(flashcard: Flashcard): FlashcardDraft {
  return {
    media_file_id: flashcard.media_file_id,
    cue_index: flashcard.cue_index,
    content: flashcard.content,
    included_fields: flashcard.included_fields,
  };
}

/** The draft that saves a card as the editor holds it. */
export function draftOfEdited(card: EditedFlashcard): FlashcardDraft {
  const base =
    card.kind === "new" ? card.draft : draftOfFlashcard(card.flashcard);
  return {
    ...base,
    content: card.editor.content,
    included_fields: [...card.editor.includedFields],
  };
}

/** The flashcard as `draft` would leave it. */
export function withDraft(
  flashcard: Flashcard,
  draft: FlashcardDraft,
): Flashcard {
  return { ...flashcard, ...draft };
}
