import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";

/** The ids of the lookup's timers. Starting one again replaces it. */
export const lookupTimerIds = {
  close: "lookup/close",
  flashcardWait: "lookup/flashcardWait",
};

/** Cancels the lookup's timers as its screen closes. A flashcard's request in flight is left to settle, unheeded. */
export const leaveLookup = Object.values(lookupTimerIds).map(
  (id) => ({ type: "cancelTimer", id }) satisfies Effect,
);

const hoverRequestPrefix = "lookup/hover/";

/** The id of the lookup request of the flashcard with this sequence. */
export function lookupRequestId(sequence: number): string {
  return `lookup/flashcard/${sequence}`;
}

/** The id of the lookup request of the hover with this sequence. */
export function lookupHoverRequestId(sequence: number): string {
  return `${hoverRequestPrefix}${sequence}`;
}

/** Tells whether a request id is that of a hover's lookup. */
export function isHoverRequestId(id: string): boolean {
  return id.startsWith(hoverRequestPrefix);
}

/**
 * The sequence of the next lookup request, of a flashcard or a hover, counted over the whole session by the operations feature,
 * so that no screen's request reuses the id of one still in flight from an earlier screen.
 */
export function nextLookupSequence(app: AppState): number {
  return app.operations.lookupRequestsSent + 1;
}
