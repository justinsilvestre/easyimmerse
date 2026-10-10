import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import { lookupActions } from "./lookupActions.ts";
import {
  lookupRequestId,
  lookupTimerIds,
  nextFlashcardSequence,
} from "./lookupIds.ts";
import {
  cancelCloseTimer,
  type LookupStep,
  open,
  setAside,
  showsOccurrence,
} from "./lookupMoves.ts";
import type { LookupState, PendingFlashcard } from "./lookupState.ts";
import { flashcardLookupWaitMs } from "./lookupTiming.ts";

/**
 * Starts a flashcard from a word, showing the word in the pop-up when it comes from the text,
 * and waits up to `flashcardLookupWaitMs` for the word's lookup.
 */
export function startFlashcard(
  lookup: LookupState,
  {
    chosen,
    destination,
  }: Extract<AppAction, { type: "lookupFlashcardRequested" }>,
  player: PlayerState,
  requests: readonly { id: string }[],
): LookupStep {
  const [opened, openEffects] =
    chosen.occurrence !== null && !showsOccurrence(lookup, chosen)
      ? open(lookup, chosen, player)
      : [lookup, [cancelCloseTimer]];
  const sequence = nextFlashcardSequence(
    lookup.lastFlashcardSequence,
    requests,
  );
  const pending: PendingFlashcard = {
    sequence,
    chosen,
    destination,
    stage: "waiting",
  };
  const started = { ...opened, lastFlashcardSequence: sequence };
  const { query } = chosen.word;
  if (query === null)
    return finish(
      { ...started, pendingFlashcard: pending },
      "ready",
      openEffects,
    );
  const wait: Effect = {
    type: "startTimer",
    id: lookupTimerIds.flashcardWait,
    ms: flashcardLookupWaitMs,
    action: lookupActions.lookupFlashcardWaitEnded(sequence),
  };
  const send: Effect = {
    type: "sendRequest",
    id: lookupRequestId(sequence),
    request: { kind: "lookupText", query },
  };
  return [
    { ...started, pendingFlashcard: pending },
    [...openEffects, send, wait],
  ];
}

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
        isSettled(action, lookupRequestId(pending.sequence), "lookupText") &&
        isSameQuery(action.request.query, pending.chosen.word.query)
        ? finish(lookup, "ready", [
            { type: "cancelTimer", id: lookupTimerIds.flashcardWait },
          ])
        : [lookup, []];
    case "lookupFlashcardWaitEnded":
      return isWaiting && action.sequence === pending.sequence
        ? finish(lookup, "late", [])
        : [lookup, []];
    case "lookupFlashcardTaken":
      return action.sequence === pending.sequence
        ? [{ ...lookup, pendingFlashcard: null }, []]
        : [lookup, []];
    default:
      return [lookup, []];
  }
}

/** Sets the pop-up aside for the pending flashcard, which is now ready or late. */
function finish(
  lookup: LookupState,
  stage: "ready" | "late",
  effects: readonly Effect[],
): LookupStep {
  const pending = lookup.pendingFlashcard;
  const [asideLookup, asideEffects] = setAside(
    pending === null
      ? lookup
      : { ...lookup, pendingFlashcard: { ...pending, stage } },
  );
  return [asideLookup, [...effects, ...asideEffects]];
}

function isSameQuery(first: object | null, second: object | null): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}
