import type { AppState } from "../app/appState.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import { updated } from "../app/updated.ts";
import { flashcardActions } from "./flashcardActions.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import { askSave } from "./flashcardSaves.ts";
import { startLookupWait } from "./lookupWait.ts";
import { isAwaitingLookup } from "./saveStage.ts";
import { holdForLookup } from "./waitingCards.ts";

/**
 * Returns what becomes of the card a form leaves as another card opens or the screen closes.
 * A card being sent, and an unchanged saved card, are left alone. A card waiting for its word's lookup keeps waiting,
 * within the ten seconds counted from Save when it was pressed, or from now. Any other card is saved in the background,
 * with an undo toast once it lands.
 */
export function leaveForm(
  form: FlashcardForm | null,
  app: AppState,
  projectId: string,
) {
  if (form === null || form.stage === "sending") return [];
  const { card, rollbackIfDiscarded } = form;
  if (card.kind === "existing" && !card.isChanged && form.stage === "editing")
    return [];
  if (isAwaitingLookup(form.stage) && card.kind === "new" && form.lookup) {
    const isSaveAsked = form.stage === "awaitingLookupToSave";
    const waiting = {
      card,
      projectId,
      lookup: form.lookup,
      offersUndo: !isSaveAsked,
    };
    return [
      ...holdForLookup(waiting, app, "form"),
      ...(isSaveAsked ? [] : [startLookupWait(card.flashcardId)]),
    ];
  }
  const from = "background";
  return askSave(
    { card, projectId, from, offersUndo: true, rollbackIfDiscarded },
    app,
    "form",
  );
}

/** Opens the form on another card, after the card it held has left as `leaveForm` describes. */
export function replaceForm(
  form: FlashcardForm | null,
  next: FlashcardForm,
  app: AppState,
  projectId: string,
) {
  const { audio_context } = next.card.editor.content;
  return updated(
    next,
    ...leaveForm(form, app, projectId),
    dispatch(flashcardActions.flashcardFormOpened(audio_context)),
  );
}
