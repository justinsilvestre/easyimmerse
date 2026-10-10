import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import type { AppState } from "../app/appState.ts";
import type { RequestRecord } from "../operations/operations.ts";
import { type FlashcardCard, flashcardIdOf } from "./flashcardCard.ts";
import { draftOfFlashcard, withDraft } from "./flashcardDrafts.ts";
import { flashcardScope } from "./flashcardRequests.ts";

/**
 * A flashcard as the latest work on it leaves it, which the cached list, holding `listed`, may not show yet:
 * `listed` with the draft of its latest pending save.
 */
export function latestFlashcard(listed: Flashcard, app: AppState): Flashcard {
  return latestOf(listed, app.operations.requests);
}

/** `latestFlashcard`, from the pending requests alone. */
export function latestOf(
  listed: Flashcard,
  requests: readonly RequestRecord[],
): Flashcard {
  const draft = latestSaveDraft(requests, listed.id);
  return draft ? withDraft(listed, draft) : listed;
}

/** What a card's flashcard holds before a save asked for now: its latest content for a saved one, or nothing for a new one. */
export function contentBefore(
  card: FlashcardCard,
  app: AppState,
): FlashcardDraft | null {
  return card.kind === "existing"
    ? draftOfFlashcard(latestFlashcard(card.flashcard, app))
    : null;
}

/** The draft of the latest pending save of a flashcard, or null when no save of it is pending. */
function latestSaveDraft(
  requests: readonly RequestRecord[],
  flashcardId: string,
): FlashcardDraft | null {
  const scope = flashcardScope(flashcardId);
  const saves = requests.flatMap(({ request, scope: recordScope }) =>
    request.kind === "saveFlashcard" && recordScope === scope
      ? [request.draft]
      : [],
  );
  return saves.at(-1) ?? null;
}

/** The pending Retry of a flashcard, or undefined when none is pending. */
export function retryOf(
  app: AppState,
  flashcardId: string,
): RequestRecord | undefined {
  return app.operations.requests.find(
    ({ request }) =>
      request.kind === "saveFlashcard" &&
      request.flashcardId === flashcardId &&
      request.purpose.type === "save" &&
      request.purpose.from === "retry",
  );
}

/** Tells whether a card's flashcard is the one this id names. */
export const isCardOf = (card: FlashcardCard, flashcardId: string) =>
  flashcardIdOf(card) === flashcardId;
