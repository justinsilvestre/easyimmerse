import { createSelector } from "reselect";
import type { AppState } from "../app/appState.ts";
import {
  failedSaveKeptId,
  selectFailedSaves,
} from "../flashcards/failedSave.ts";
import type { FlashcardForm } from "../flashcards/flashcardForm.ts";
import { saveRequest } from "../flashcards/flashcardSaves.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import type { OperationsState } from "../operations/operations.ts";
import type { Route } from "../route/route.ts";
import {
  selectFlashcardForm,
  selectShownMediaFile,
} from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type { RequestFailure } from "../server/serverRequest.ts";

/** The preference key under which the recoverable saves are kept on the device. */
export const recoverableSavesKey = "recoverableSaves";

/** How a save recovered after the app closed is listed among the failed saves. */
const interruptedFailure: RequestFailure = {
  status: "ABORTED",
  message: "The app closed before this flashcard was saved.",
};

type RecoveryApp = Pick<AppState, "operations" | "route" | "screen">;

/**
 * Returns the flashcard saves that closing the app would lose, each as a failed save to list when the app next starts:
 * the failed saves, then the saves under way, then the open card while it holds changes not saved.
 * A later one replaces an earlier one of the same flashcard.
 */
export const selectRecoverableSaves = createSelector(
  [
    (app: RecoveryApp) => app.operations,
    (app: RecoveryApp) => app.route,
    (app: RecoveryApp) => selectFlashcardForm(app),
  ],
  (operations, route, form): readonly FailedRequest[] => {
    const byId = new Map<string, FailedRequest>();
    const saves = [
      ...selectFailedSaves({ operations }).map(({ kept }) => kept),
      ...savesUnderWay(operations),
      ...formSave(form, operations, route),
    ];
    for (const save of saves) byId.set(save.id, save);
    return [...byId.values()];
  },
);

/** Returns the recoverable saves as the text kept on the device, the same string while they stay the same. */
export const selectRecoverableSavesText = createSelector(
  [selectRecoverableSaves],
  (saves) => JSON.stringify(saves),
);

/** Reads the recoverable saves kept on the device: none when nothing is kept, or `unreadable` when the text holds no saves. */
export function parseRecoverableSaves(
  stored: string | null,
): readonly FailedRequest[] | "unreadable" {
  if (stored === null) return [];
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) && value.every(isKeptSave)
      ? value
      : "unreadable";
  } catch {
    return "unreadable";
  }
}

function savesUnderWay(operations: OperationsState): FailedRequest[] {
  return operations.requests.flatMap(({ request }) =>
    request.kind === "saveFlashcard" && request.purpose.type === "save"
      ? [
          {
            id: failedSaveKeptId(request.flashcardId),
            request: {
              ...request,
              purpose: { ...request.purpose, from: "retry", offersUndo: false },
            },
            failure: interruptedFailure,
          },
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
  const order = {
    card: form.card,
    projectId: selectShownMediaFile({ route }).projectId,
    rollbackIfDiscarded: form.rollbackIfDiscarded,
    from: "retry",
    offersUndo: false,
  } as const;
  const request = saveRequest(order, { operations });
  const id = failedSaveKeptId(request.flashcardId);
  return [{ id, request, failure: interruptedFailure }];
}

function isKeptSave(value: unknown): value is FailedRequest {
  if (typeof value !== "object" || value === null) return false;
  const { id, request, failure } = value as Record<string, unknown>;
  const purpose = (request as { purpose?: { type?: unknown } } | undefined)
    ?.purpose;
  return (
    typeof id === "string" &&
    typeof failure === "object" &&
    (request as { kind?: unknown } | undefined)?.kind === "saveFlashcard" &&
    purpose?.type === "save"
  );
}
