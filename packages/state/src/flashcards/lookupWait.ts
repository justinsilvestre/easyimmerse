import type { Effect } from "../app/effect.ts";
import { flashcardActions } from "./flashcardActions.ts";

/** How long a save waits for a lookup still on its way before it saves the flashcard as it is. */
const saveLookupWaitMs = 10_000;

const timerIdOf = (flashcardId: string) =>
  `flashcards/lookupWait/${flashcardId}`;

/** Starts the wait of a card's save for its word's lookup. */
export function startLookupWait(flashcardId: string) {
  return {
    type: "startTimer",
    id: timerIdOf(flashcardId),
    ms: saveLookupWaitMs,
    action: flashcardActions.flashcardLookupWaitEnded(flashcardId),
  } satisfies Effect;
}

/** Ends the wait of a card's save for its word's lookup, which has answered. */
export function cancelLookupWait(flashcardId: string) {
  return { type: "cancelTimer", id: timerIdOf(flashcardId) } satisfies Effect;
}
