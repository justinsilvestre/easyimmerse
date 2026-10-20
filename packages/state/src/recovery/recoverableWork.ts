import { createSelector } from "reselect";
import type { AppState } from "../app/appState.ts";
import {
  failedSaveKeptId,
  selectFailedSaves,
} from "../flashcards/failedSave.ts";
import { type FlashcardCard, newCard } from "../flashcards/flashcardCard.ts";
import type { FlashcardForm, Rollback } from "../flashcards/flashcardForm.ts";
import type { FlashcardRequest } from "../flashcards/flashcardRequests.ts";
import { saveRequest } from "../flashcards/flashcardSaves.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import type { OperationsState } from "../operations/operations.ts";
import type { Route } from "../route/route.ts";
import { selectPendingFlashcard } from "../screen/lookup/lookupSelectors.ts";
import type { PendingFlashcard } from "../screen/lookup/lookupState.ts";
import {
  selectFlashcardForm,
  selectShownMediaFile,
} from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type { RequestFailure } from "../server/serverRequest.ts";

/**
 * The flashcard work that closing the app would lose, kept on the device to take up when the app next starts:
 * saves to list among the failed saves, and deletions and Undos to send again.
 */
export type RecoverableWork = {
  saves: readonly FailedRequest[];
  resends: readonly FlashcardRequest[];
};

/** The key under which the recoverable work is kept on the device. */
export const recoverableWorkKey = "recoverableWork";

/** How a save recovered after the app closed is listed among the failed saves. */
const interruptedFailure: RequestFailure = {
  status: "ABORTED",
  message: "The app closed before this flashcard was saved.",
};

type RecoveryApp = Pick<AppState, "operations" | "route" | "screen">;

/**
 * Returns the recoverable work. Its saves are the failed saves, then the saves under way, then the open card while it holds changes not saved,
 * then a flashcard waiting for its word's lookup; a later one replaces an earlier one of the same flashcard.
 * Its resends are the deletions, Undos and rollbacks under way, one per flashcard.
 */
export const selectRecoverableWork = createSelector(
  [
    (app: RecoveryApp) => app.operations,
    (app: RecoveryApp) => app.route,
    (app: RecoveryApp) => selectFlashcardForm(app),
    (app: RecoveryApp) => selectPendingFlashcard(app),
  ],
  (operations, route, form, pending): RecoverableWork => {
    const saves = [
      ...selectFailedSaves({ operations }).map(({ kept }) => kept),
      ...savesUnderWay(operations),
      ...formSave(form, operations, route),
      ...pendingSave(pending, operations, route),
    ];
    return { saves: lastPerId(saves), resends: resendsUnderWay(operations) };
  },
);

/** Returns the recoverable work as the text kept on the device, the same string while the work stays the same. */
export const selectRecoverableWorkText = createSelector(
  [selectRecoverableWork],
  (work) => JSON.stringify(work),
);

/** Reads the recoverable work kept on the device: none when nothing is kept, or `unreadable` when the text holds no such work. */
export function parseRecoverableWork(
  stored: string | null,
): RecoverableWork | "unreadable" {
  if (stored === null) return { saves: [], resends: [] };
  try {
    const value: unknown = JSON.parse(stored);
    return isRecoverableWork(value) ? value : "unreadable";
  } catch {
    return "unreadable";
  }
}

function savesUnderWay(operations: OperationsState): FailedRequest[] {
  return operations.requests.flatMap(({ request }) =>
    request.kind === "saveFlashcard" && request.purpose.type === "save"
      ? [
          interrupted({
            ...request,
            purpose: { ...request.purpose, from: "retry", offersUndo: false },
          }),
        ]
      : [],
  );
}

function formSave(
  form: FlashcardForm | null,
  operations: OperationsState,
  route: Route,
): FailedRequest[] {
  if (form === null || !(form.card.isChanged || form.saveFailure)) return [];
  return [cardSave(form.card, form.rollbackIfDiscarded, operations, route)];
}

/** The save of a flashcard asked for from a word whose lookup had not answered, without the definitions it waited for. */
function pendingSave(
  pending: PendingFlashcard | null,
  operations: OperationsState,
  route: Route,
): FailedRequest[] {
  if (pending === null) return [];
  const card = newCard({ id: pending.flashcardId, draft: pending.draft });
  return [cardSave(card, null, operations, route)];
}

function cardSave(
  card: FlashcardCard,
  rollbackIfDiscarded: Rollback | null,
  operations: OperationsState,
  route: Route,
): FailedRequest {
  const projectId = selectShownMediaFile({ route }).projectId;
  const order = {
    card,
    projectId,
    rollbackIfDiscarded,
    from: "retry",
    offersUndo: false,
  } as const;
  return interrupted(saveRequest(order, { operations }));
}

function interrupted(request: FlashcardRequest): FailedRequest {
  const id = failedSaveKeptId(request.flashcardId);
  return { id, request, failure: interruptedFailure };
}

function resendsUnderWay(operations: OperationsState): FlashcardRequest[] {
  const byFlashcard = new Map<string, FlashcardRequest>();
  for (const { request } of operations.requests)
    if (isResend(request)) byFlashcard.set(request.flashcardId, request);
  return [...byFlashcard.values()];
}

function isResend(request: unknown): request is FlashcardRequest {
  const { kind, purpose } = (request ?? {}) as {
    kind?: unknown;
    purpose?: { type?: unknown };
  };
  return (
    kind === "deleteFlashcard" ||
    (kind === "saveFlashcard" && purpose?.type !== "save")
  );
}

function lastPerId(saves: readonly FailedRequest[]): FailedRequest[] {
  const byId = new Map(saves.map((save) => [save.id, save]));
  return [...byId.values()];
}

function isRecoverableWork(value: unknown): value is RecoverableWork {
  const { saves, resends } = (value ?? {}) as Record<string, unknown>;
  return (
    Array.isArray(saves) &&
    saves.every(isKeptSave) &&
    Array.isArray(resends) &&
    resends.every(isResend)
  );
}

function isKeptSave(value: unknown): value is FailedRequest {
  if (typeof value !== "object" || value === null) return false;
  const { id, request, failure } = value as Record<string, unknown>;
  const { kind, purpose } = (request ?? {}) as {
    kind?: unknown;
    purpose?: { type?: unknown };
  };
  return (
    typeof id === "string" &&
    typeof failure === "object" &&
    kind === "saveFlashcard" &&
    purpose?.type === "save"
  );
}
