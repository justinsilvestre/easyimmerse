import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import { lookupActions } from "./lookupActions.ts";
import {
  lookupRequestId,
  lookupTimerIds,
  nextLookupSequence,
} from "./lookupIds.ts";
import {
  cancelCloseTimer,
  type LookupStep,
  open,
  showsOccurrence,
} from "./lookupMoves.ts";
import type {
  ChosenWord,
  LookupState,
  PendingFlashcard,
} from "./lookupState.ts";
import { flashcardLookupWaitMs } from "./lookupTiming.ts";
import { finish } from "./updatePendingFlashcard.ts";

/** A flashcard asked for from a word, saved at once or opened in the editor. */
export type FlashcardRequest = {
  chosen: ChosenWord;
  destination: PendingFlashcard["destination"];
};

/**
 * Starts a flashcard from a word, showing the word in the pop-up when it comes from the text,
 * and waits up to `flashcardLookupWaitMs` for the word's lookup; with nothing to look up, it is ready at once.
 */
export function startFlashcard(
  lookup: LookupState,
  { chosen, destination }: FlashcardRequest,
  player: PlayerState,
  app: AppState,
): LookupStep {
  const [opened, openEffects] =
    chosen.occurrence !== null && !showsOccurrence(lookup, chosen)
      ? open(lookup, chosen, player)
      : [lookup, [cancelCloseTimer]];
  const sequence = nextLookupSequence(app);
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

/**
 * Starts a flashcard for no word, as the C key does with no cursor. It is ready at once, and the pop-up stays as it is.
 * While a word's flashcard waits for its lookup, it starts nothing, so that the waiting flashcard is kept.
 * Transitional: the hand-off passes it to the flashcard hooks until C1 makes it the flashcards' own new-card branch.
 */
export function startWordlessFlashcard(
  lookup: LookupState,
  destination: PendingFlashcard["destination"],
  app: AppState,
): LookupStep {
  if (lookup.pendingFlashcard?.stage === "waiting") return [lookup, []];
  const pendingFlashcard: PendingFlashcard = {
    sequence: nextLookupSequence(app),
    chosen: noWord,
    destination,
    stage: "ready",
  };
  return [{ ...lookup, pendingFlashcard }, []];
}

const noWord: ChosenWord = {
  word: { term: "", query: null },
  source: null,
  occurrence: null,
  anchor: null,
};
