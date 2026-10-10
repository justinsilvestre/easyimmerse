import type { FlashcardDraft } from "@easyimmerse/types";
import type { AppState } from "../app/appState.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import { flashcardIdOf } from "./flashcardCard.ts";
import { draftOfCard } from "./flashcardDrafts.ts";
import type { Rollback } from "./flashcardForm.ts";
import { flashcardNoticeKeys, withdraw, wordOf } from "./flashcardNotices.ts";
import type {
  FlashcardOutbox,
  FlashcardRequest,
  SavePurpose,
} from "./flashcardRequests.ts";
import { contentBefore } from "./latestFlashcard.ts";

/** A save of a card to ask for, with where it comes from and whether its landing offers Undo. */
export type SaveOrder = {
  card: FlashcardCard;
  projectId: string;
  from: Extract<SavePurpose, { type: "save" }>["from"];
  offersUndo: boolean;
  rollbackIfDiscarded: Rollback | null;
};

/**
 * Asks for a save of a card in its flashcard's scope, and returns the request's id.
 * It records what the flashcard holds before it, and withdraws the Undo of an earlier save, since only the latest save can be undone.
 */
export function askSave(
  order: SaveOrder,
  app: AppState,
  outbox: FlashcardOutbox,
): string {
  const { card, projectId, ...purpose } = order;
  const flashcardId = flashcardIdOf(card);
  outbox.add(withdraw(flashcardNoticeKeys.saveUndo(flashcardId)));
  return outbox.send({
    kind: "saveFlashcard",
    projectId,
    flashcardId,
    draft: draftOfCard(card),
    isNew: card.kind === "new",
    purpose: {
      type: "save",
      card,
      before: contentBefore(card, app),
      ...purpose,
    },
  });
}

/** The request that takes back a save in doubt of a discarded card: a deletion of a new flashcard, or its earlier content. */
export function rollbackRequest(
  rollback: Rollback,
  card: FlashcardCard,
  projectId: string,
): FlashcardRequest {
  const flashcardId = flashcardIdOf(card);
  const purpose = { type: "rollback", word: wordOf(card) } as const;
  return rollback.content === null
    ? { kind: "deleteFlashcard", projectId, flashcardId, purpose }
    : {
        kind: "saveFlashcard",
        projectId,
        flashcardId,
        draft: rollback.content,
        isNew: false,
        purpose,
      };
}

/** What the Undo of a save needs: the flashcard, its word for the notices, and what it held before the save, or null for a new flashcard. */
export type SaveUndo = {
  projectId: string;
  flashcardId: string;
  word: string;
  before: FlashcardDraft | null;
};

/** The request that takes back a save: a deletion of a new flashcard, or the content from before the save. */
export function undoRequest({
  projectId,
  flashcardId,
  word,
  before,
}: SaveUndo): FlashcardRequest {
  const purpose = { type: "undo", word } as const;
  return before === null
    ? { kind: "deleteFlashcard", projectId, flashcardId, purpose }
    : {
        kind: "saveFlashcard",
        projectId,
        flashcardId,
        draft: before,
        isNew: false,
        purpose,
      };
}
