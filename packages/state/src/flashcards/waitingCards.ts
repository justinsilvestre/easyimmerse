import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import type { RequestRecord } from "../operations/operations.ts";
import { lookupRequestId } from "../screen/lookup/lookupIds.ts";
import { selectPendingFlashcard } from "../screen/lookup/lookupSelectors.ts";
import {
  selectFlashcardForm,
  selectShownMediaFile,
} from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { isSettled } from "../server/isSettled.ts";
import { flashcardActions } from "./flashcardActions.ts";
import { type NewCard, withLookupFields } from "./flashcardCard.ts";
import type { FlashcardApp, LookupFieldsContext } from "./flashcardForm.ts";
import {
  type FlashcardSender,
  releaseFlashcardRequest,
  type SavePurpose,
} from "./flashcardRequests.ts";
import { askSave, saveRequest } from "./flashcardSaves.ts";
import type { LookupFlashcardFields } from "./lookupFields.ts";

/** How long a save waits for a lookup still on its way before it saves the flashcard as it is. */
const saveLookupWaitMs = 10_000;

/** A new card to save once its word's lookup answers or the wait for it ends. */
export type WaitingCard = {
  card: NewCard;
  lookup: { requestId: string; context: LookupFieldsContext };
  /** False when the user had pressed Save, since such a save shows no undo toast. */
  offersUndo: boolean;
};

/** A save held for its word's lookup, as the operations record it. */
type HeldSave = {
  id: string;
  heldFor: string;
  projectId: string;
  card: NewCard;
  purpose: Extract<SavePurpose, { type: "save" }>;
};

/** Asks for the save of a card held for its word's lookup, in the project of the media screen shown. */
export function holdForLookup(
  { card, lookup, offersUndo }: WaitingCard,
  app: FlashcardApp,
  sender: FlashcardSender,
) {
  const order = {
    card,
    projectId: selectShownMediaFile(app).projectId,
    from: "background",
    offersUndo,
    rollbackIfDiscarded: null,
    lookupContext: lookup.context,
  } as const;
  return askSave(order, app, sender, lookup.requestId);
}

/** Releases the saves held for this lookup, with their cards filled from its answer, and ends their wait. */
export function fillWaitingCards(
  requestId: string,
  fields: LookupFlashcardFields | null,
  app: FlashcardApp,
) {
  return selectHeldSaves(app)
    .filter((held) => held.heldFor === requestId)
    .flatMap((held) => release(held, withLookupFields(held.card, fields), app));
}

/** Releases as it is the held save whose wait for its lookup has run out. */
export function sendLateCard(flashcardId: string, app: FlashcardApp) {
  return selectHeldSaves(app)
    .filter((held) => held.card.flashcardId === flashcardId)
    .flatMap((held) => release(held, held.card, app));
}

/** Asks for the fields of a settled lookup that a flashcard waits for: the word's pending flashcard, the form's card or a held save. */
export function fieldsAwaitedBy(action: AppAction, app: FlashcardApp) {
  if (
    action.type !== "requestSettled" ||
    !isSettled(action, action.id, "lookupText")
  )
    return [];
  const awaiting = selectAwaitingLookupContext(action.id, app);
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

/** Starts the wait of a card's save for its word's lookup. */
export function startLookupWait(flashcardId: string) {
  return {
    type: "startTimer",
    id: lookupWaitTimerIdOf(flashcardId),
    ms: saveLookupWaitMs,
    action: flashcardActions.flashcardLookupWaitEnded(flashcardId),
  } satisfies Effect;
}

/** Ends the wait of a card's save for its word's lookup, which has answered. */
export function cancelLookupWait(flashcardId: string) {
  return {
    type: "cancelTimer",
    id: lookupWaitTimerIdOf(flashcardId),
  } satisfies Effect;
}

function release(
  { id, projectId, purpose }: HeldSave,
  card: NewCard,
  app: FlashcardApp,
) {
  const { offersUndo } = purpose;
  const order = { card, projectId, from: "background", offersUndo } as const;
  const request = saveRequest({ ...order, rollbackIfDiscarded: null }, app);
  return [
    cancelLookupWait(card.flashcardId),
    releaseFlashcardRequest(id, request),
  ];
}

function selectHeldSaves(app: Pick<AppState, "operations">): HeldSave[] {
  return app.operations.requests.flatMap(heldSaveOf);
}

function heldSaveOf({ id, request, heldFor }: RequestRecord): HeldSave[] {
  if (heldFor === undefined || request.kind !== "saveFlashcard") return [];
  const { purpose, projectId } = request;
  if (purpose.type !== "save" || purpose.card.kind !== "new") return [];
  return [{ id, heldFor, projectId, card: purpose.card, purpose }];
}

function selectAwaitingLookupContext(
  requestId: string,
  app: FlashcardApp,
): LookupFieldsContext | null {
  const pending = selectPendingFlashcard(app);
  if (pending && lookupRequestId(pending.flashcardId) === requestId)
    return pending.context;
  const formLookup = selectFlashcardForm(app)?.lookup;
  if (formLookup?.requestId === requestId) return formLookup.context;
  const held = selectHeldSaves(app).find(
    ({ heldFor }) => heldFor === requestId,
  );
  return held?.purpose.lookupContext ?? null;
}

function lookupWaitTimerIdOf(flashcardId: string) {
  return `flashcards/lookupWait/${flashcardId}`;
}
