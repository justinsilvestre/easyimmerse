import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { lookupRequestId } from "../screen/lookup/lookupIds.ts";
import { isSettled } from "../server/isSettled.ts";
import { withLookupFields } from "./flashcardCard.ts";
import type { LookupFieldsContext } from "./flashcardForm.ts";
import type { FlashcardsContext } from "./flashcardRequests.ts";
import { askSave } from "./flashcardSaves.ts";
import { formOf, pendingFlashcardOf } from "./flashcardsOnScreen.ts";
import type { FlashcardsState, WaitingCard } from "./flashcardsState.ts";
import type { LookupFlashcardFields } from "./lookupFields.ts";
import { cancelLookupWait } from "./lookupWait.ts";

/** Saves the cards that waited for this lookup, filled from its answer, and ends their wait. */
export function fillWaitingCards(
  state: FlashcardsState,
  requestId: string,
  fields: LookupFlashcardFields | null,
  context: FlashcardsContext,
): FlashcardsState {
  return sendWaiting(state, context, (waiting) =>
    waiting.lookup.requestId === requestId
      ? withLookupFields(waiting.card, fields)
      : null,
  );
}

/** Saves as it is the card whose wait for its lookup has run out. */
export function sendLateCard(
  state: FlashcardsState,
  flashcardId: string,
  context: FlashcardsContext,
): FlashcardsState {
  return sendWaiting(state, context, (waiting) =>
    waiting.card.flashcardId === flashcardId ? waiting.card : null,
  );
}

function sendWaiting(
  state: FlashcardsState,
  { app, outbox }: FlashcardsContext,
  cardToSend: (waiting: WaitingCard) => WaitingCard["card"] | null,
): FlashcardsState {
  const remaining: WaitingCard[] = [];
  for (const waiting of state.waitingForLookup) {
    const card = cardToSend(waiting);
    if (card === null) {
      remaining.push(waiting);
      continue;
    }
    const { projectId, offersUndo } = waiting;
    outbox.add(cancelLookupWait(card.flashcardId));
    askSave(
      {
        card,
        projectId,
        from: "background",
        offersUndo,
        rollbackIfDiscarded: null,
      },
      app,
      outbox,
    );
  }
  return remaining.length === state.waitingForLookup.length
    ? state
    : { ...state, waitingForLookup: remaining };
}

/** Asks for the fields of a settled lookup that a flashcard waits for: the word's pending flashcard, the form's card or a waiting card. */
export function fieldsAwaitedBy(
  action: AppAction,
  state: FlashcardsState,
  context: FlashcardsContext,
) {
  if (
    action.type !== "requestSettled" ||
    !isSettled(action, action.id, "lookupText")
  )
    return [];
  const awaiting = awaitingContextOf(action.id, state, context);
  if (awaiting === null) return [];
  const results = action.outcome.ok ? action.outcome.data.results : [];
  return [
    {
      type: "writeFlashcardFields",
      requestId: action.id,
      results,
      context: awaiting,
    },
  ] satisfies Effect[];
}

function awaitingContextOf(
  requestId: string,
  state: FlashcardsState,
  { app }: FlashcardsContext,
): LookupFieldsContext | null {
  const pending = pendingFlashcardOf(app);
  if (pending && lookupRequestId(pending.sequence) === requestId)
    return pending.context;
  const formLookup = formOf(app)?.lookup;
  if (formLookup?.requestId === requestId) return formLookup.context;
  const waiting = state.waitingForLookup.find(
    ({ lookup }) => lookup.requestId === requestId,
  );
  return waiting?.lookup.context ?? null;
}
