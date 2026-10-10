import type { FlashcardForm } from "./flashcardForm.ts";
import { askSave } from "./flashcardSaves.ts";
import type { FormContext } from "./formContext.ts";
import { startLookupWait } from "./lookupWait.ts";
import { isAwaitingLookup } from "./saveStage.ts";

/**
 * Deals with the card a form leaves as another card opens or the screen closes.
 * A card being sent, and an unchanged saved card, are left alone. A card waiting for its word's lookup keeps waiting,
 * within the ten seconds counted from Save when it was pressed, or from now. Any other card is saved in the background,
 * with an undo toast once it lands.
 */
export function leaveForm(
  form: FlashcardForm | null,
  { app, route, step }: FormContext,
): void {
  if (form === null || form.stage === "sending") return;
  const { card } = form;
  if (card.kind === "existing" && !card.isChanged && form.stage === "editing")
    return;
  const { projectId } = route;
  if (isAwaitingLookup(form.stage) && card.kind === "new" && form.lookup) {
    const isSaveAsked = form.stage === "awaitingLookupToSave";
    step.wait({
      card,
      projectId,
      lookup: form.lookup,
      offersUndo: !isSaveAsked,
    });
    if (!isSaveAsked) step.outbox.add(startLookupWait(card.flashcardId));
    return;
  }
  const { rollbackIfDiscarded } = form;
  const from = "background";
  askSave(
    { card, projectId, from, offersUndo: true, rollbackIfDiscarded },
    app,
    step.outbox,
  );
}

/** Opens the form on another card, after the card it held has left as `leaveForm` describes. */
export function replaceForm(
  form: FlashcardForm | null,
  next: FlashcardForm,
  context: FormContext,
): FlashcardForm {
  leaveForm(form, context);
  context.step.open(next.card);
  return next;
}
