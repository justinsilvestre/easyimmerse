import type { AppAction } from "../app/appAction.ts";
import {
  type FinishedLookupFlashcard,
  lookupFlashcardFinishedBy,
} from "../screen/lookup/lookupFlashcardFinishedBy.ts";
import { lookupRequestId } from "../screen/lookup/lookupIds.ts";
import { newCard, withLookupFields } from "./flashcardCard.ts";
import type { FlashcardsContext } from "./flashcardRequests.ts";
import { askSave } from "./flashcardSaves.ts";
import { flashcardStartedBy } from "./flashcardStartedBy.ts";
import { mediaScreenOf } from "./flashcardsOnScreen.ts";
import type { FlashcardsState } from "./flashcardsState.ts";
import { startLookupWait } from "./lookupWait.ts";

/** Saves at once a card started to be saved with no lookup to wait for, offering Undo once it lands. */
export function saveStarted(
  state: FlashcardsState,
  action: AppAction,
  { app, outbox }: FlashcardsContext,
): FlashcardsState {
  const started = flashcardStartedBy(app, action);
  const projectId = mediaScreenOf(app)?.route.projectId;
  if (started?.destination !== "save" || projectId === undefined) return state;
  askSave(
    {
      card: newCard(started.flashcard),
      projectId,
      from: "background",
      offersUndo: true,
      rollbackIfDiscarded: null,
    },
    app,
    outbox,
  );
  return state;
}

/** Takes a flashcard from a word whose lookup no longer holds it, as `takeLookupFlashcard` describes. */
export function takeFinished(
  state: FlashcardsState,
  action: AppAction,
  context: FlashcardsContext,
): FlashcardsState {
  const finished = lookupFlashcardFinishedBy(context.app, action);
  const projectId = mediaScreenOf(context.app)?.route.projectId;
  return finished === null || projectId === undefined
    ? state
    : takeLookupFlashcard(state, finished, projectId, context);
}

/**
 * Takes a flashcard from a word that no longer waits for its lookup, unless it opens in the form:
 * one to be saved at once is saved, filled from its lookup when that answered in time, or else waits up to ten seconds more;
 * one abandoned by the screen or the pop-up waits likewise, whatever it was for, so that the user's attempt to make it is never lost.
 */
function takeLookupFlashcard(
  state: FlashcardsState,
  { pending, how, fields }: FinishedLookupFlashcard,
  projectId: string,
  context: FlashcardsContext,
): FlashcardsState {
  if (pending.destination === "editor" && how !== "abandoned") return state;
  const card = newCard({ id: pending.flashcardId, draft: pending.draft });
  if (how === "ready") {
    const filled = withLookupFields(card, fields);
    const order = { card: filled, projectId, from: "background" } as const;
    askSave(
      { ...order, offersUndo: true, rollbackIfDiscarded: null },
      context.app,
      context.outbox,
    );
    return state;
  }
  const requestId = lookupRequestId(pending.sequence);
  const lookup = { requestId, context: pending.context };
  context.outbox.add(startLookupWait(card.flashcardId));
  const waiting = { card, projectId, lookup, offersUndo: true };
  return { ...state, waitingForLookup: [...state.waitingForLookup, waiting] };
}
