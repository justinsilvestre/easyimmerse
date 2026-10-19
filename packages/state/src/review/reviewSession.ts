import type { ReviewCardState, ReviewQueueCard } from "@easyimmerse/types";
import type { ReviewScreenState } from "./reviewScreenState.ts";

/** How long before its due time a card still being learned may be shown, when nothing else is left, as Anki's learn-ahead limit allows. */
export const learnAheadMs = 20 * 60 * 1000;

/**
 * Shows the next card at a moment: a card coming back that is due by then, or else the queue's next card,
 * or else, once the queue is done, a card coming back within the learn-ahead time. Shows none when no card is left to show by then.
 */
export function showNext(session: ReviewScreenState, atMs: number) {
  const [back, ...laterBack] = session.comingBack;
  if (back && isDueBy(back, atMs))
    return showCard({ ...session, comingBack: laterBack }, back);
  const [next, ...rest] = session.queue;
  if (next) return showCard({ ...session, queue: rest }, next);
  if (back && isDueBy(back, atMs + learnAheadMs))
    return showCard({ ...session, comingBack: laterBack }, back);
  return { ...session, shown: null } satisfies ReviewScreenState;
}

/** Tells whether Undo can take back the session's latest rating: it has landed, and no undo is on its way. */
export function canUndo(session: ReviewScreenState): boolean {
  const latest = session.answers.at(-1);
  return session.undoingAtMs === null && latest?.answeredAtMs != null;
}

/** Shows a card from its front. */
export function showCard(
  session: ReviewScreenState,
  card: ReviewQueueCard | null,
) {
  return {
    ...session,
    shown: card,
    stage: "front",
    isConfirmingDelete: false,
  } satisfies ReviewScreenState;
}

/** Tells whether an answer left a card due again within the session: in a learning or relearning step rather than under review. */
export function isDueWithinSession(state: ReviewCardState): boolean {
  return state.state !== "review";
}

/** Adds a card to those coming back, in order of their due times. */
export function comeBack(
  comingBack: readonly ReviewQueueCard[],
  card: ReviewQueueCard,
): readonly ReviewQueueCard[] {
  const index = comingBack.findIndex(
    (other) => dueAtMsOf(other) > dueAtMsOf(card),
  );
  return index === -1
    ? [...comingBack, card]
    : [...comingBack.slice(0, index), card, ...comingBack.slice(index)];
}

/** Leaves out a flashcard's cards. */
export function without(
  cards: readonly ReviewQueueCard[],
  flashcardId: string,
): readonly ReviewQueueCard[] {
  return cards.filter(({ flashcard }) => flashcard.id !== flashcardId);
}

function isDueBy(card: ReviewQueueCard, atMs: number): boolean {
  return dueAtMsOf(card) <= atMs;
}

function dueAtMsOf(card: ReviewQueueCard): number {
  return card.state?.due_at_ms ?? 0;
}
