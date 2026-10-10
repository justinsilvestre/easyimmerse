import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import type { RequestRecord } from "../operations/operations.ts";
import { type FlashcardCard, flashcardIdOf } from "./flashcardCard.ts";
import { withDraft } from "./flashcardDrafts.ts";
import { flashcardScope } from "./flashcardRequests.ts";

/** Returns `listed` with the draft of its latest save among the pending `requests`, or `listed` itself when none is pending. */
export function latestOf(
  listed: Flashcard,
  requests: readonly RequestRecord[],
): Flashcard {
  const draft = latestSaveDraft(requests, listed.id);
  return draft ? withDraft(listed, draft) : listed;
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

/** Tells whether a card's flashcard is the one this id names. */
export const isCardOf = (card: FlashcardCard, flashcardId: string) =>
  flashcardIdOf(card) === flashcardId;
