import type { FlashcardDraft } from "@easyimmerse/types";
import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import { freeRequestId } from "../operations/freeRequestId.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import type { LookupFieldsContext, Rollback } from "./flashcardForm.ts";

/** How long a flashcard request may go unanswered, as when the connection hangs, before it counts as failed. */
const flashcardRequestLimitMs = 30_000;

/** Why a flashcard was saved. It comes back in `requestSettled`, so the settling branch needs nothing else. */
export type SavePurpose =
  | {
      type: "save";
      card: FlashcardCard;
      /** What the flashcard held before this save, which its Undo and a rollback put back; null for a new flashcard. */
      before: FlashcardDraft | null;
      from: "form" | "background" | "retry";
      offersUndo: boolean;
      /** The doubt the card already carried when this save was asked for. */
      rollbackIfDiscarded: Rollback | null;
      /** For a save held for its word's lookup, what sorts the lookup's definitions into the card's fields. */
      lookupContext?: LookupFieldsContext;
    }
  /** Puts back the content from before a save. */
  | { type: "undo"; word: string }
  /** Puts back a saved card's content after a discard in doubt. */
  | { type: "rollback"; word: string };

/** Why a flashcard was deleted: from the form, by an Undo of a new flashcard's save, or by a discard in doubt. */
export type DeletePurpose =
  | { type: "delete" }
  | { type: "undo"; word: string }
  | { type: "rollback"; word: string };

/** A request that writes a flashcard. */
export type FlashcardRequest = Extract<
  ServerRequest,
  { kind: "saveFlashcard" } | { kind: "deleteFlashcard" }
>;

/** The scope of a flashcard's requests, which are sent one at a time in the order they were asked for. */
export function flashcardScope(flashcardId: string): string {
  return `flashcard:${flashcardId}`;
}

/** Tells whether a request scope is that of a flashcard. */
export function isFlashcardScope(scope: string | undefined): boolean {
  return scope?.startsWith("flashcard:") ?? false;
}

/**
 * Who sends a flashcard request: the form, or the commands outside it.
 * Each numbers its requests under its own prefix, so that the two never pick the same id for one action.
 */
export type FlashcardSender = "form" | "background";

/**
 * Sends a flashcard request in its flashcard's scope, with the time limit, under the first id the recorded requests do not hold.
 * A request held for another, by its id, is not sent until it is released.
 * Since the id depends only on the recorded requests, a sender may send at most one request per flashcard in one action.
 */
export function sendFlashcardRequest(
  request: FlashcardRequest,
  app: Pick<AppState, "operations">,
  sender: FlashcardSender,
  heldFor?: string,
) {
  const prefix =
    sender === "form"
      ? `flashcard/${request.flashcardId}`
      : `flashcard/${request.flashcardId}/${sender}`;
  const id = freeRequestId(prefix, app.operations.requests);
  return {
    ...releaseFlashcardRequest(id, request),
    ...(heldFor === undefined ? {} : { heldFor }),
  };
}

/** Sends a held request, under its id, as `request`. */
export function releaseFlashcardRequest(id: string, request: FlashcardRequest) {
  return {
    type: "sendRequest",
    id,
    request,
    scope: flashcardScope(request.flashcardId),
    timeLimitMs: flashcardRequestLimitMs,
  } satisfies Effect;
}
