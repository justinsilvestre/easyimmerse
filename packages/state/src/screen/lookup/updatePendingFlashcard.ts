import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isSettled } from "../../server/isSettled.ts";
import { lookupRequestId, lookupTimerIds } from "./lookupIds.ts";
import { type LookupStep, setAside } from "./lookupMoves.ts";
import type { LookupState, PendingFlashcard } from "./lookupState.ts";

const cancelWait: Effect = {
  type: "cancelTimer",
  id: lookupTimerIds.flashcardWait,
};

/** Ends the wait for a flashcard's lookup when the lookup settles or the wait runs out, and forgets the flashcard once it is taken. */
export function updatePendingFlashcard(
  lookup: LookupState,
  action: AppAction,
): LookupStep {
  const pending = lookup.pendingFlashcard;
  if (pending === null) return [lookup, []];
  const isWaiting = pending.stage === "waiting";
  switch (action.type) {
    case "requestSettled":
      return isWaiting &&
        isSettled(action, lookupRequestId(pending.sequence), "lookupText")
        ? finish(lookup, { ...pending, stage: "ready" }, [cancelWait])
        : [lookup, []];
    case "lookupFlashcardWaitEnded":
      return isWaiting && action.sequence === pending.sequence
        ? finish(lookup, { ...pending, stage: "late" }, [])
        : [lookup, []];
    case "lookupFlashcardTaken":
      return action.sequence === pending.sequence
        ? [{ ...lookup, pendingFlashcard: null }, []]
        : [lookup, []];
    default:
      return [lookup, []];
  }
}

/** Sets the pop-up aside for a flashcard that no longer waits for its lookup, ready or late. */
export function finish(
  lookup: LookupState,
  pending: PendingFlashcard,
  effects: readonly Effect[],
): LookupStep {
  const [aside, asideEffects] = setAside({
    ...lookup,
    pendingFlashcard: pending,
  });
  return [aside, [...effects, ...asideEffects]];
}
