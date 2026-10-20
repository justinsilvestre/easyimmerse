import type { ReviewFlashcards } from "./reviewFlashcards.ts";
import type { ReviewScreenState, SessionCard } from "./reviewScreenState.ts";
import { showNext } from "./reviewSession.ts";

/**
 * Leaves out of the session the cards whose flashcards were deleted elsewhere, as deleting one from the More menu does:
 * their steps go, and a shown card gives way to the next one.
 * A flashcard counts as deleted once a list fetched after the queue arrived no longer holds it.
 * Returns the session itself when nothing was deleted.
 */
export function skipDeletedCards(
  session: ReviewScreenState,
  flashcards: ReviewFlashcards | null,
): ReviewScreenState {
  const fetchedAtMs = flashcards?.fetchedAtMs ?? null;
  if (flashcards === null || fetchedAtMs === null) return session;
  if (fetchedAtMs <= session.listFetchedAtQueueMs) return session;
  const isListed = (card: SessionCard) => flashcards.byId.has(card.flashcardId);
  const { shown } = session;
  const cards = [
    ...(shown ? [shown] : []),
    ...session.queue,
    ...session.comingBack,
  ];
  if (cards.every(isListed)) return session;
  const kept = {
    ...session,
    queue: session.queue.filter(isListed),
    comingBack: session.comingBack.filter(isListed),
    steps: session.steps.filter((step) => isListed(step.card)),
  } satisfies ReviewScreenState;
  return shown === null || isListed(shown)
    ? kept
    : showNext(kept, session.shownAtMs ?? 0);
}
