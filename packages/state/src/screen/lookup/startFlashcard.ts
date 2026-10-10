import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
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
  showsOccurrence,
} from "./lookupMoves.ts";
import type { LookupState, PendingFlashcard } from "./lookupState.ts";
import { flashcardLookupWaitMs } from "./lookupTiming.ts";
import { finish } from "./updatePendingFlashcard.ts";

/**
 * Starts a flashcard from a word, showing the word in the pop-up when it comes from the text,
 * and waits up to `flashcardLookupWaitMs` for the word's lookup; with nothing to look up, it is ready at once.
 */
export function startFlashcard(
  lookup: LookupState,
  {
    chosen,
    destination,
  }: Extract<AppAction, { type: "lookupFlashcardRequested" }>,
  player: PlayerState,
  app: AppState,
): LookupStep {
  const [opened, openEffects] =
    chosen.occurrence !== null && !showsOccurrence(lookup, chosen)
      ? open(lookup, chosen, player)
      : [lookup, [cancelCloseTimer]];
  const sequence = nextFlashcardSequence(app);
  const pending: PendingFlashcard = {
    sequence,
    chosen,
    destination,
    stage: "waiting",
  };
  const { query } = chosen.word;
  if (query === null)
    return finish(opened, { ...pending, stage: "ready" }, openEffects);
  const send: Effect = {
    type: "sendRequest",
    id: lookupRequestId(sequence),
    request: { kind: "lookupText", query },
  };
  const wait: Effect = {
    type: "startTimer",
    id: lookupTimerIds.flashcardWait,
    ms: flashcardLookupWaitMs,
    action: lookupActions.lookupFlashcardWaitEnded(sequence),
  };
  return [
    { ...opened, pendingFlashcard: pending },
    [...openEffects, send, wait],
  ];
}
