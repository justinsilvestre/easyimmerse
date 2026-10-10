import type { FlashcardDraft } from "@easyimmerse/types";
import type { AppState } from "../app/appState.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import { flashcardIdOf } from "./flashcardCard.ts";
import { draftOfCard } from "./flashcardDrafts.ts";
import type { Rollback } from "./flashcardForm.ts";
import { flashcardNoticeKeys, withdraw, wordOf } from "./flashcardNotices.ts";
import {
  type FlashcardRequest,
  type FlashcardSender,
  type SavePurpose,
  sendFlashcardRequest,
} from "./flashcardRequests.ts";
import { selectContentBeforeSave } from "./flashcardsSelectors.ts";

type CardSave = Extract<SavePurpose, { type: "save" }>;

/** A save of a card to ask for, with where it comes from and whether its landing offers Undo. */
export type SaveOrder = Pick<
  CardSave,
  "card" | "from" | "offersUndo" | "rollbackIfDiscarded" | "lookupContext"
> & { projectId: string };

/**
 * Asks for a save of a card in its flashcard's scope, held for the request `heldFor` names if it is given.
 * It records what the flashcard holds before it, and withdraws the Undo of an earlier save, since only the latest save can be undone.
 * The effect that sends the save comes last.
 */
export function askSave(
  order: SaveOrder,
  app: Pick<AppState, "operations">,
  sender: FlashcardSender,
  heldFor?: string,
) {
  const request = saveRequest(order, app);
  const sending = sendFlashcardRequest(request, app, sender, heldFor);
  const withdrawal = withdraw(
    flashcardNoticeKeys.saveUndo(request.flashcardId),
  );
  return [withdrawal, sending] as const;
}

/** The request that saves a card, recording what the flashcard holds before it. */
export function saveRequest(
  order: SaveOrder,
  app: Pick<AppState, "operations">,
) {
  const { card, projectId, ...purpose } = order;
  return {
    kind: "saveFlashcard",
    projectId,
    flashcardId: flashcardIdOf(card),
    draft: draftOfCard(card),
    isNew: card.kind === "new",
    purpose: {
      type: "save",
      card,
      before: selectContentBeforeSave(app, card),
      ...purpose,
    },
  } satisfies FlashcardRequest;
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
