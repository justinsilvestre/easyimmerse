import { type EditedFlashcard, flashcardIdOf } from "../editedFlashcard.ts";

/** A card that left the editor and could not be saved, with its edits. */
export type UnsavedCard = {
  /** The id the flashcard has, or will be created under. */
  readonly flashcardId: string;
  readonly card: EditedFlashcard;
  readonly projectId: string;
  /** The media file whose screen edits the card, or null when the card has none. */
  readonly mediaFileId: string | null;
  /** Whether the server refused the save, so that sending it again cannot succeed. */
  readonly isRejected: boolean;
  /** The notice that tells of the card on its own, as a refused save has, which goes once the card leaves the list. */
  readonly noticeId?: number;
};

/** Describes `card`, of the project `projectId`, as a card that could not be saved. */
export function createUnsavedCard(
  card: EditedFlashcard,
  projectId: string,
  {
    isRejected = false,
    noticeId,
  }: { isRejected?: boolean; noticeId?: number } = {},
): UnsavedCard {
  return {
    flashcardId: flashcardIdOf(card),
    card,
    projectId,
    mediaFileId: mediaFileIdOf(card),
    isRejected,
    ...(noticeId === undefined ? {} : { noticeId }),
  };
}

/** The media file whose screen edits the card, or null when the card has none. */
export function mediaFileIdOf(card: EditedFlashcard): string | null {
  return card.kind === "new"
    ? card.draft.media_file_id
    : card.flashcard.media_file_id;
}
