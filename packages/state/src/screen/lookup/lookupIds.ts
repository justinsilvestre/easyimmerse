import type { Effect } from "../../app/effect.ts";

/** The ids of the lookup's timers. Starting one again replaces it. */
export const lookupTimerIds = {
  close: "lookup/close",
  flashcardWait: "lookup/flashcardWait",
};

/** Cancels the lookup's timers as its screen closes. A flashcard's request in flight is left to settle, unheeded. */
export const leaveLookup: readonly Effect[] = Object.values(lookupTimerIds).map(
  (id) => ({ type: "cancelTimer", id }),
);

const flashcardRequestPrefix = "lookup/flashcard/";

/** The id of the lookup request of the flashcard with this sequence. */
export function lookupRequestId(sequence: number): string {
  return `${flashcardRequestPrefix}${sequence}`;
}

/**
 * The sequence for the next flashcard started from a word: after the last one on this screen,
 * and after any whose request is still in flight from an earlier opening, so that no request is sent again under a running id.
 */
export function nextFlashcardSequence(
  last: number,
  requests: readonly { id: string }[],
): number {
  const inFlight = requests
    .filter(({ id }) => id.startsWith(flashcardRequestPrefix))
    .map(({ id }) => Number(id.slice(flashcardRequestPrefix.length)));
  return Math.max(last, ...inFlight) + 1;
}
