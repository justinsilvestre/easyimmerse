import type { AppAction } from "../app/appAction.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import { cardSaveFailed } from "./cardSaveFailed.ts";
import { flashcardNotices, show } from "./flashcardNotices.ts";
import type { FlashcardsContext } from "./flashcardRequests.ts";
import type { FlashcardsState } from "./flashcardsState.ts";
import { saveLanded } from "./saveLanded.ts";

/** The end of a request that writes a flashcard. */
export type FlashcardSettled = Extract<
  RequestSettled,
  { request: { kind: "saveFlashcard" | "deleteFlashcard" } }
>;

type Settled<K> = Extract<FlashcardSettled, { request: { kind: K } }>;

/**
 * Takes the outcome of a request that writes a flashcard: a save that landed as `saveLanded` describes,
 * a failed card save as `cardSaveFailed` describes, and the deletions. A failed Undo or rollback is told of.
 */
export function settleFlashcardRequest(
  state: FlashcardsState,
  settled: FlashcardSettled,
  context: FlashcardsContext,
): FlashcardsState {
  if (settled.request.kind === "deleteFlashcard")
    return settleDeletion(
      state,
      settled as Settled<"deleteFlashcard">,
      context,
    );
  const save = settled as Settled<"saveFlashcard">;
  if (save.outcome.ok)
    return saveLanded(state, save, save.outcome.data, context);
  const { purpose } = save.request;
  if (purpose.type === "save")
    return cardSaveFailed(state, save, save.outcome.error, context);
  context.outbox.add(show(flashcardNotices.undoFailed(purpose.word)));
  return state;
}

/** Tells whether the action is the end of a request that writes a flashcard. */
export function isFlashcardSettled(
  action: AppAction,
): action is FlashcardSettled {
  return (
    action.type === "requestSettled" &&
    (action.request.kind === "saveFlashcard" ||
      action.request.kind === "deleteFlashcard")
  );
}

/** Forgets a deleted flashcard's returned version, counting a rollback's deletion of a flashcard that was never created as done. */
function settleDeletion(
  state: FlashcardsState,
  { request, outcome }: Settled<"deleteFlashcard">,
  { outbox }: FlashcardsContext,
): FlashcardsState {
  const { flashcardId, purpose } = request;
  const isGone =
    outcome.ok || (purpose.type === "rollback" && outcome.error.status === 404);
  if (isGone) {
    const { [flashcardId]: _deleted, ...confirmed } = state.confirmed;
    return { ...state, confirmed };
  }
  outbox.add(
    show(
      purpose.type === "delete"
        ? flashcardNotices.deleteFailed()
        : flashcardNotices.undoFailed(purpose.word),
    ),
  );
  return state;
}
